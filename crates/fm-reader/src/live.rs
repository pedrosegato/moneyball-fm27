use std::ffi::c_void;
use std::mem::size_of;

use windows::Win32::Foundation::{CloseHandle, HANDLE};
use windows::Win32::System::Diagnostics::Debug::ReadProcessMemory;
use windows::Win32::System::Diagnostics::ToolHelp::{
    CreateToolhelp32Snapshot, Module32FirstW, Module32NextW, Process32FirstW, Process32NextW,
    MODULEENTRY32W, PROCESSENTRY32W, TH32CS_SNAPMODULE, TH32CS_SNAPMODULE32, TH32CS_SNAPPROCESS,
};
use windows::Win32::System::Memory::{
    VirtualQueryEx, MEMORY_BASIC_INFORMATION, MEM_COMMIT, MEM_PRIVATE, PAGE_GUARD,
};
use windows::Win32::System::Threading::{
    OpenProcess, PROCESS_ACCESS_RIGHTS, PROCESS_QUERY_INFORMATION, PROCESS_VM_READ,
};

use crate::memory::{MemorySource, Module, ReaderError, Region, Result};

const REGION_LO: u64 = 0x10000;
const REGION_HI: u64 = 0x7FFF_FFFF_FFFF;

const READABLE_PROTECT: [u32; 6] = [0x02, 0x04, 0x08, 0x20, 0x40, 0x80];

const ACCESS: PROCESS_ACCESS_RIGHTS =
    PROCESS_ACCESS_RIGHTS(PROCESS_VM_READ.0 | PROCESS_QUERY_INFORMATION.0);
const _: () = assert!(ACCESS.0 == 0x0410);

fn os_err(e: windows::core::Error) -> ReaderError {
    ReaderError::Os(e.to_string())
}

fn wide_to_string(buf: &[u16]) -> String {
    let len = buf.iter().position(|&c| c == 0).unwrap_or(buf.len());
    String::from_utf16_lossy(&buf[..len])
}

struct Snapshot(HANDLE);

impl Snapshot {
    fn new(
        flags: windows::Win32::System::Diagnostics::ToolHelp::CREATE_TOOLHELP_SNAPSHOT_FLAGS,
        pid: u32,
    ) -> Result<Self> {
        unsafe { CreateToolhelp32Snapshot(flags, pid) }
            .map(Self)
            .map_err(os_err)
    }
}

impl Drop for Snapshot {
    fn drop(&mut self) {
        let _ = unsafe { CloseHandle(self.0) };
    }
}

pub fn find_pid(exe_name: &str) -> Option<u32> {
    let snap = Snapshot::new(TH32CS_SNAPPROCESS, 0).ok()?;
    let mut entry = PROCESSENTRY32W {
        dwSize: size_of::<PROCESSENTRY32W>() as u32,
        ..Default::default()
    };
    let mut ok = unsafe { Process32FirstW(snap.0, &mut entry) }.is_ok();
    while ok {
        if wide_to_string(&entry.szExeFile).eq_ignore_ascii_case(exe_name) {
            return Some(entry.th32ProcessID);
        }
        ok = unsafe { Process32NextW(snap.0, &mut entry) }.is_ok();
    }
    None
}

#[derive(Debug)]
pub struct LiveProcess {
    pid: u32,
    handle: HANDLE,
}

unsafe impl Send for LiveProcess {}
unsafe impl Sync for LiveProcess {}

impl LiveProcess {
    pub fn open(pid: u32) -> Result<Self> {
        let handle = unsafe { OpenProcess(ACCESS, false, pid) }.map_err(os_err)?;
        Ok(Self { pid, handle })
    }

    pub fn attach(exe: &str) -> Result<Self> {
        let pid = find_pid(exe).ok_or_else(|| ReaderError::ProcessNotFound(exe.to_string()))?;
        Self::open(pid)
    }

    pub fn pid(&self) -> u32 {
        self.pid
    }
}

impl Drop for LiveProcess {
    fn drop(&mut self) {
        let _ = unsafe { CloseHandle(self.handle) };
    }
}

impl MemorySource for LiveProcess {
    fn read(&self, addr: u64, len: usize) -> Option<Vec<u8>> {
        let mut buf = vec![0u8; len];
        self.read_into(addr, &mut buf).then_some(buf)
    }

    fn read_into(&self, addr: u64, buf: &mut [u8]) -> bool {
        let mut got = 0usize;
        let ok = unsafe {
            ReadProcessMemory(
                self.handle,
                addr as *const c_void,
                buf.as_mut_ptr().cast(),
                buf.len(),
                Some(&mut got),
            )
        }
        .is_ok();
        ok && got == buf.len()
    }

    fn modules(&self) -> Result<Vec<Module>> {
        let snap = Snapshot::new(TH32CS_SNAPMODULE | TH32CS_SNAPMODULE32, self.pid)?;
        let mut entry = MODULEENTRY32W {
            dwSize: size_of::<MODULEENTRY32W>() as u32,
            ..Default::default()
        };
        let mut out = Vec::new();
        let mut ok = unsafe { Module32FirstW(snap.0, &mut entry) }.is_ok();
        while ok {
            out.push(Module {
                name: wide_to_string(&entry.szModule),
                path: wide_to_string(&entry.szExePath),
                base: entry.modBaseAddr as u64,
                size: entry.modBaseSize as u64,
            });
            ok = unsafe { Module32NextW(snap.0, &mut entry) }.is_ok();
        }
        Ok(out)
    }

    fn regions(&self, private_only: bool) -> Box<dyn Iterator<Item = Region> + '_> {
        let mut addr = REGION_LO;
        Box::new(std::iter::from_fn(move || {
            while addr < REGION_HI {
                let mut mbi = MEMORY_BASIC_INFORMATION::default();
                let n = unsafe {
                    VirtualQueryEx(
                        self.handle,
                        Some(addr as *const c_void),
                        &mut mbi,
                        size_of::<MEMORY_BASIC_INFORMATION>(),
                    )
                };
                if n == 0 {
                    return None;
                }
                let base = mbi.BaseAddress as u64;
                addr = base + mbi.RegionSize as u64;
                let protect = mbi.Protect.0;
                let private = mbi.Type == MEM_PRIVATE;
                let readable = mbi.State == MEM_COMMIT
                    && READABLE_PROTECT.contains(&(protect & 0xFF))
                    && protect & PAGE_GUARD.0 == 0
                    && (!private_only || private);
                if readable {
                    return Some(Region {
                        base,
                        size: mbi.RegionSize as u64,
                        protect,
                        private,
                    });
                }
            }
            None
        }))
    }
}
