use crate::memory::{MemoryExt, MemorySource, Module, ReaderError, Region, Result};

const ENGINE: &str = "game_plugin.dll";
const SIZE_OF_IMAGE_OFFSET: u64 = 24 + 56;
const SECTION_HEADER: usize = 40;
const SECTION_WRITE: u32 = 0x8000_0000;
const SECTION_EXECUTE: u32 = 0x2000_0000;
const PAGE_READWRITE: u32 = 0x04;
const PAGE_EXECUTE_READWRITE: u32 = 0x40;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Build {
    pub module: Module,
    pub timestamp: u32,
    pub image_size: u32,
}

impl Build {
    pub fn id(&self) -> String {
        format!("{:08X}-{:X}", self.timestamp, self.image_size)
    }
}

pub fn engine_build(mem: &dyn MemorySource) -> Result<Build> {
    let module = mem
        .modules()?
        .into_iter()
        .find(|m| m.name.eq_ignore_ascii_case(ENGINE))
        .ok_or_else(|| ReaderError::ModuleNotLoaded(ENGINE.into()))?;
    let bad = |what: &str| ReaderError::BadImage(what.into());
    if mem.read(module.base, 2).as_deref() != Some(b"MZ") {
        return Err(bad("engine PE header not readable"));
    }
    let pe = module.base
        + u64::from(
            mem.u32(module.base + 0x3C)
                .ok_or_else(|| bad("no e_lfanew"))?,
        );
    if mem.read(pe, 4).as_deref() != Some(b"PE\0\0") {
        return Err(bad("bad PE signature"));
    }
    let timestamp = mem.u32(pe + 8).ok_or_else(|| bad("no timestamp"))?;
    let image_size = mem
        .u32(pe + SIZE_OF_IMAGE_OFFSET)
        .ok_or_else(|| bad("no SizeOfImage"))?;
    Ok(Build {
        module,
        timestamp,
        image_size,
    })
}

pub fn writable_sections(mem: &dyn MemorySource, module: &Module) -> Vec<Region> {
    let Some(pe) = mem
        .u32(module.base + 0x3C)
        .map(|o| module.base + u64::from(o))
    else {
        return Vec::new();
    };
    let (Some(count), Some(optional)) = (mem.u16(pe + 6), mem.u16(pe + 20)) else {
        return Vec::new();
    };
    let table = pe + 24 + u64::from(optional);
    let Some(headers) = mem.read(table, usize::from(count) * SECTION_HEADER) else {
        return Vec::new();
    };
    let word = |h: &[u8], at: usize| u32::from_le_bytes(h[at..at + 4].try_into().expect("4 bytes"));
    let mut sections: Vec<Region> = headers
        .chunks_exact(SECTION_HEADER)
        .filter(|h| word(h, 36) & SECTION_WRITE != 0 && word(h, 8) != 0)
        .map(|h| Region {
            base: module.base + u64::from(word(h, 12)),
            size: u64::from(word(h, 8)),
            protect: if word(h, 36) & SECTION_EXECUTE != 0 {
                PAGE_EXECUTE_READWRITE
            } else {
                PAGE_READWRITE
            },
            private: false,
        })
        .collect();
    sections.sort_by_key(|s| (s.protect == PAGE_EXECUTE_READWRITE, s.base));
    sections
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::memory::FakeMemory;

    #[test]
    fn engine_build_reads_timestamp_and_size() {
        let mut img = vec![0u8; 0x200];
        img[..2].copy_from_slice(b"MZ");
        img[0x3C..0x40].copy_from_slice(&0x80u32.to_le_bytes());
        img[0x80..0x84].copy_from_slice(b"PE\0\0");
        img[0x88..0x8C].copy_from_slice(&0x6AE8CF77u32.to_le_bytes());
        img[0x80 + 80..0x80 + 84].copy_from_slice(&0x17969000u32.to_le_bytes());
        let mem = FakeMemory::new()
            .with_region(0x1000_0000, img, false)
            .with_module("game_plugin.dll", 0x1000_0000, 0x200);
        let b = engine_build(&mem).unwrap();
        assert_eq!(b.id(), "6AE8CF77-17969000");
        assert_eq!(b.module.base, 0x1000_0000);
    }

    #[test]
    fn writable_sections_put_data_before_writable_code() {
        let mut img = vec![0u8; 0x400];
        img[..2].copy_from_slice(b"MZ");
        img[0x3C..0x40].copy_from_slice(&0x80u32.to_le_bytes());
        img[0x80..0x84].copy_from_slice(b"PE\0\0");
        img[0x86..0x88].copy_from_slice(&4u16.to_le_bytes());
        img[0x94..0x96].copy_from_slice(&0xF0u16.to_le_bytes());
        let table = 0x80 + 24 + 0xF0;
        let sections: [(&[u8], u32, u32, u32); 4] = [
            (b".rsrc", 0x1000, 0x4831000, 0x6000_0020),
            (b".xtls", 0x561_C000, 0x1202_B574, 0xE000_0020),
            (b".link", 0x531_D000, 0x10_0000, 0xC000_0040),
            (b".tls$", 0x55B_9000, 0xD000, 0xC000_0040),
        ];
        for (i, (name, va, size, flags)) in sections.into_iter().enumerate() {
            let h = table + i * SECTION_HEADER;
            img[h..h + name.len()].copy_from_slice(name);
            img[h + 8..h + 12].copy_from_slice(&size.to_le_bytes());
            img[h + 12..h + 16].copy_from_slice(&va.to_le_bytes());
            img[h + 36..h + 40].copy_from_slice(&flags.to_le_bytes());
        }
        let base = 0x7FF6_0000_0000;
        let mem = FakeMemory::new().with_region(base, img, false).with_module(
            "game_plugin.dll",
            base,
            0x400,
        );
        let module = mem.modules().unwrap().remove(0);
        let found: Vec<(u64, u64, u32)> = writable_sections(&mem, &module)
            .into_iter()
            .map(|r| (r.base - base, r.size, r.protect))
            .collect();
        assert_eq!(
            found,
            [
                (0x531_D000, 0x10_0000, PAGE_READWRITE),
                (0x55B_9000, 0xD000, PAGE_READWRITE),
                (0x561_C000, 0x1202_B574, PAGE_EXECUTE_READWRITE),
            ]
        );
    }

    #[test]
    fn engine_build_without_module_errors() {
        let mem = FakeMemory::new();
        assert!(matches!(
            engine_build(&mem),
            Err(ReaderError::ModuleNotLoaded(_))
        ));
    }
}
