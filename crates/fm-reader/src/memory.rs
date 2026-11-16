use thiserror::Error;

#[derive(Debug, Error)]
pub enum ReaderError {
    #[error("{0} is not running")]
    ProcessNotFound(String),
    #[error("module {0} not loaded")]
    ModuleNotLoaded(String),
    #[error("bad module image: {0}")]
    BadImage(String),
    #[error("os error: {0}")]
    Os(String),
    #[error("{0}")]
    UnsupportedBuild(String),
    #[error("unknown scope: {0}")]
    UnknownScope(String),
}

pub type Result<T> = std::result::Result<T, ReaderError>;
pub type Ptr = u64;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Module {
    pub name: String,
    pub path: String,
    pub base: u64,
    pub size: u64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Region {
    pub base: u64,
    pub size: u64,
    pub protect: u32,
    pub private: bool,
}

pub trait MemorySource {
    fn read(&self, addr: u64, len: usize) -> Option<Vec<u8>>;
    fn read_into(&self, addr: u64, buf: &mut [u8]) -> bool;
    fn modules(&self) -> Result<Vec<Module>>;
    fn regions(&self, private_only: bool) -> Box<dyn Iterator<Item = Region> + '_>;
}

pub trait MemoryExt: MemorySource {
    fn read_array<const N: usize>(&self, addr: u64) -> Option<[u8; N]> {
        let mut buf = [0u8; N];
        self.read_into(addr, &mut buf).then_some(buf)
    }
    fn u8(&self, addr: u64) -> Option<u8> {
        self.read_array::<1>(addr).map(|b| b[0])
    }
    fn u16(&self, addr: u64) -> Option<u16> {
        self.read_array(addr).map(u16::from_le_bytes)
    }
    fn i32(&self, addr: u64) -> Option<i32> {
        self.read_array(addr).map(i32::from_le_bytes)
    }
    fn u32(&self, addr: u64) -> Option<u32> {
        self.read_array(addr).map(u32::from_le_bytes)
    }
    fn u64(&self, addr: u64) -> Option<u64> {
        self.read_array(addr).map(u64::from_le_bytes)
    }
    fn f32(&self, addr: u64) -> Option<f32> {
        self.read_array(addr).map(f32::from_le_bytes)
    }
    fn ptr(&self, addr: u64) -> Option<Ptr> {
        self.u64(addr)
    }
}

impl<T: MemorySource + ?Sized> MemoryExt for T {}

pub fn chunks<'a>(
    mem: &'a dyn MemorySource,
    regions: impl IntoIterator<Item = Region> + 'a,
    chunk: usize,
    overlap: usize,
) -> impl Iterator<Item = (u64, Vec<u8>)> + 'a {
    regions.into_iter().flat_map(move |r| {
        let size = r.size as usize;
        (0..size).step_by(chunk).filter_map(move |off| {
            let n = (chunk + overlap).min(size - off);
            let addr = r.base + off as u64;
            mem.read(addr, n).map(|bytes| (addr, bytes))
        })
    })
}

pub const DEFAULT_CHUNK: usize = 16 << 20;
pub const DEFAULT_OVERLAP: usize = 256;

#[derive(Default)]
pub struct FakeMemory {
    regions: Vec<(u64, Vec<u8>, bool)>,
    modules: Vec<Module>,
}

impl FakeMemory {
    pub fn new() -> Self {
        Self::default()
    }
    pub fn with_region(mut self, base: u64, bytes: Vec<u8>, private: bool) -> Self {
        self.regions.push((base, bytes, private));
        self
    }
    pub fn with_module(mut self, name: &str, base: u64, size: u64) -> Self {
        self.modules.push(Module {
            name: name.to_string(),
            path: name.to_string(),
            base,
            size,
        });
        self
    }
}

impl FakeMemory {
    fn slice(&self, addr: u64, len: usize) -> Option<&[u8]> {
        let end = addr.checked_add(len as u64)?;
        self.regions.iter().find_map(|(base, bytes, _)| {
            let region_end = base + bytes.len() as u64;
            (addr >= *base && end <= region_end)
                .then(|| &bytes[(addr - base) as usize..(end - base) as usize])
        })
    }
}

impl MemorySource for FakeMemory {
    fn read(&self, addr: u64, len: usize) -> Option<Vec<u8>> {
        self.slice(addr, len).map(<[u8]>::to_vec)
    }
    fn read_into(&self, addr: u64, buf: &mut [u8]) -> bool {
        match self.slice(addr, buf.len()) {
            Some(src) => {
                buf.copy_from_slice(src);
                true
            }
            None => false,
        }
    }
    fn modules(&self) -> Result<Vec<Module>> {
        Ok(self.modules.clone())
    }
    fn regions(&self, private_only: bool) -> Box<dyn Iterator<Item = Region> + '_> {
        Box::new(
            self.regions
                .iter()
                .filter(move |(_, _, private)| !private_only || *private)
                .map(|(base, bytes, private)| Region {
                    base: *base,
                    size: bytes.len() as u64,
                    protect: 0x04,
                    private: *private,
                }),
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fake_reads_inside_region() {
        let mem = FakeMemory::new().with_region(0x1000, vec![0, 1, 2, 3, 4, 5, 6, 7], false);
        assert_eq!(mem.read(0x1003, 3), Some(vec![3, 4, 5]));
        assert_eq!(mem.read(0x1000, 8), Some((0..8).collect()));
    }

    #[test]
    fn fake_read_crossing_region_end_returns_none() {
        let mem = FakeMemory::new().with_region(0x1000, vec![0; 8], false);
        assert_eq!(mem.read(0x1006, 4), None);
        assert_eq!(mem.read(0x0FFF, 2), None);
        assert_eq!(mem.read(0x2000, 1), None);
    }

    #[test]
    fn chunks_overlap_256_and_cover_region() {
        const MIB: usize = 1 << 20;
        let mem = FakeMemory::new().with_region(0x10_0000, vec![0; 40 * MIB], true);
        let regions: Vec<Region> = mem.regions(false).collect();
        let got: Vec<(u64, Vec<u8>)> = chunks(&mem, regions, 16 * MIB, 256).collect();
        assert_eq!(got.len(), 3);
        assert_eq!(got[0].0, 0x10_0000);
        assert_eq!(got[0].1.len(), 16 * MIB + 256);
        assert_eq!(got[1].0, 0x10_0000 + 16 * MIB as u64);
        assert_eq!(got[2].0, 0x10_0000 + 32 * MIB as u64);
        assert_eq!(got[2].1.len(), 8 * MIB);
    }

    #[test]
    fn u32_little_endian() {
        let mem = FakeMemory::new().with_region(0x1000, vec![0x78, 0x56, 0x34, 0x12, 0xFF], false);
        assert_eq!(mem.u32(0x1000), Some(0x1234_5678));
        assert_eq!(mem.u32(0x1002), None);
        let dynmem: &dyn MemorySource = &mem;
        assert_eq!(dynmem.u8(0x1004), Some(0xFF));
    }
}
