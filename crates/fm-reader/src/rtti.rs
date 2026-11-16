use std::collections::HashMap;
use std::path::{Path, PathBuf};

use memchr::memmem;

use crate::build::Build;
use crate::memory::{MemoryExt, MemorySource, Module, Result};

const CHUNK: u64 = 16 << 20;
const PAGE: u64 = 0x1000;

type Cache = HashMap<String, HashMap<String, HashMap<String, u32>>>;

pub fn class_name(mem: &dyn MemorySource, base: u64, vt: u64) -> Option<String> {
    let col = mem.u64(vt.checked_sub(8)?).filter(|&c| c != 0)?;
    let hdr = mem.read(col, 0x18)?;
    let word = |i: usize| u32::from_le_bytes(hdr[i..i + 4].try_into().unwrap());
    if word(0) != 1 {
        return None;
    }
    let name = mem.read(base + u64::from(word(12)) + 0x10, 128)?;
    let end = name.iter().position(|&b| b == 0).unwrap_or(name.len());
    Some(name[..end].iter().map(|&b| b as char).collect())
}

pub fn module_image(mem: &dyn MemorySource, module: &Module) -> Vec<u8> {
    let mut image = Vec::with_capacity(module.size as usize);
    let mut off = 0;
    while off < module.size {
        let n = CHUNK.min(module.size - off);
        match mem.read(module.base + off, n as usize) {
            Some(bytes) => image.extend(bytes),
            None => {
                let mut q = off;
                while q < off + n {
                    let len = PAGE.min(off + n - q) as usize;
                    match mem.read(module.base + q, len) {
                        Some(bytes) => image.extend(bytes),
                        None => image.resize(image.len() + len, 0),
                    }
                    q += PAGE;
                }
            }
        }
        off += n;
    }
    image
}

pub fn vtables_for(
    mem: &dyn MemorySource,
    module: &Module,
    mangled: &str,
    image: Option<&[u8]>,
) -> HashMap<u64, u32> {
    let owned;
    let image = match image {
        Some(i) => i,
        None => {
            owned = module_image(mem, module);
            &owned
        }
    };
    let mut out = HashMap::new();
    let mut needle = mangled.as_bytes().to_vec();
    needle.push(0);
    let Some(name_at) = memmem::find(image, &needle) else {
        return out;
    };
    let Some(td_rva) = name_at.checked_sub(0x10) else {
        return out;
    };
    let td_pat = (td_rva as u32).to_le_bytes();
    for j in memmem::find_iter(image, &td_pat) {
        let Some(c) = j.checked_sub(0xC) else {
            continue;
        };
        if c % 4 != 0 || image.get(c..c + 8).is_none() {
            continue;
        }
        if u32::from_le_bytes(image[c..c + 4].try_into().unwrap()) != 1 {
            continue;
        }
        let offset = u32::from_le_bytes(image[c + 4..c + 8].try_into().unwrap());
        let col_ptr = (module.base + c as u64).to_le_bytes();
        for k in memmem::find_iter(image, &col_ptr[..5]) {
            if k % 8 == 0 && image.get(k..k + 8) == Some(&col_ptr[..]) {
                out.insert(module.base + k as u64 + 8, offset);
            }
        }
    }
    out
}

pub fn default_cache_path() -> PathBuf {
    let root = std::env::var_os("LOCALAPPDATA")
        .or_else(|| std::env::var_os("USERPROFILE"))
        .or_else(|| std::env::var_os("HOME"))
        .map(PathBuf::from)
        .unwrap_or_default();
    root.join("Moneyball FM27").join("classes.json")
}

pub fn class_vtables(
    mem: &dyn MemorySource,
    build: &Build,
    names: &[&str],
    cache_path: &Path,
) -> Result<HashMap<String, HashMap<u64, u32>>> {
    let base = build.module.base;
    let id = build.id();
    let mut saved: Cache = std::fs::read_to_string(cache_path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    let cached = saved.get(&id).filter(|known| {
        names
            .iter()
            .all(|n| known.get(*n).is_some_and(|v| !v.is_empty()))
    });
    let known: HashMap<String, HashMap<String, u32>> = match cached {
        Some(known) => known.clone(),
        None => {
            let image = module_image(mem, &build.module);
            let found: HashMap<_, _> = names
                .iter()
                .map(|n| {
                    let by_rva = vtables_for(mem, &build.module, n, Some(&image))
                        .into_iter()
                        .map(|(v, off)| ((v - base).to_string(), off))
                        .collect();
                    (n.to_string(), by_rva)
                })
                .collect();
            if found.values().all(|v: &HashMap<String, u32>| !v.is_empty()) {
                saved.insert(id, found.clone());
                if let Some(dir) = cache_path.parent() {
                    let _ = std::fs::create_dir_all(dir);
                }
                if let Ok(json) = serde_json::to_string(&saved) {
                    let _ = std::fs::write(cache_path, json);
                }
            }
            found
        }
    };
    Ok(names
        .iter()
        .map(|n| {
            let vts = known
                .get(*n)
                .map(|m| {
                    m.iter()
                        .filter_map(|(rva, off)| Some((base + rva.parse::<u64>().ok()?, *off)))
                        .collect()
                })
                .unwrap_or_default();
            (n.to_string(), vts)
        })
        .collect())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::memory::FakeMemory;

    const BASE: u64 = 0x1_4000_0000;
    const TD: usize = 0x100;
    const COL: usize = 0x200;
    const VT: usize = 0x300;
    const NAME: &str = ".?AVTEAM@db@@";

    fn image() -> Vec<u8> {
        let mut img = vec![0u8; 0x400];
        img[TD + 0x10..TD + 0x10 + NAME.len()].copy_from_slice(NAME.as_bytes());
        img[COL..COL + 4].copy_from_slice(&1u32.to_le_bytes());
        img[COL + 12..COL + 16].copy_from_slice(&(TD as u32).to_le_bytes());
        img[VT - 8..VT].copy_from_slice(&(BASE + COL as u64).to_le_bytes());
        img
    }

    fn mem() -> FakeMemory {
        FakeMemory::new()
            .with_region(BASE, image(), false)
            .with_module("game_plugin.dll", BASE, 0x400)
    }

    fn build(mem: &FakeMemory) -> Build {
        Build {
            module: mem.modules().unwrap().remove(0),
            timestamp: 0xAB,
            image_size: 0x400,
        }
    }

    #[test]
    fn vtables_for_finds_col_and_vtable() {
        let mem = mem();
        let m = &mem.modules().unwrap()[0];
        let got = vtables_for(&mem, m, NAME, None);
        assert_eq!(got, HashMap::from([(BASE + VT as u64, 0)]));
        assert!(vtables_for(&mem, m, ".?AVNOPE@@", None).is_empty());
    }

    #[test]
    fn class_name_roundtrip() {
        let mem = mem();
        assert_eq!(
            class_name(&mem, BASE, BASE + VT as u64).as_deref(),
            Some(NAME)
        );
        assert_eq!(class_name(&mem, BASE, BASE + 0x10), None);
    }

    #[test]
    fn module_image_zero_fills_unreadable_pages() {
        let mut bytes = vec![7u8; 0x1000];
        bytes.extend(vec![0u8; 0]);
        let mem = FakeMemory::new().with_region(BASE, bytes, false);
        let m = Module {
            name: "x".into(),
            path: "x".into(),
            base: BASE,
            size: 0x2000,
        };
        let img = module_image(&mem, &m);
        assert_eq!(img.len(), 0x2000);
        assert!(img[..0x1000].iter().all(|&b| b == 7));
        assert!(img[0x1000..].iter().all(|&b| b == 0));
    }

    #[test]
    fn cache_roundtrip_and_python_format() {
        let mem = mem();
        let b = build(&mem);
        let dir = std::env::temp_dir().join(format!("fm-rtti-{}", std::process::id()));
        let path = dir.join("classes.json");
        let first = class_vtables(&mem, &b, &[NAME], &path).unwrap();
        assert_eq!(first[NAME], HashMap::from([(BASE + VT as u64, 0)]));
        let json: serde_json::Value =
            serde_json::from_str(&std::fs::read_to_string(&path).unwrap()).unwrap();
        assert_eq!(json["000000AB-400"][NAME][VT.to_string()], 0);
        let empty = FakeMemory::new().with_module("game_plugin.dll", BASE, 0x400);
        let again = class_vtables(&empty, &b, &[NAME], &path).unwrap();
        assert_eq!(again, first);
        std::fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn default_cache_path_matches_python() {
        assert!(default_cache_path().ends_with(Path::new("Moneyball FM27").join("classes.json")));
    }

    #[test]
    fn cache_skips_empty_lookup() {
        let mem = mem();
        let b = build(&mem);
        let path = std::env::temp_dir().join(format!("fm-rtti-empty-{}.json", std::process::id()));
        let _ = std::fs::remove_file(&path);
        let got = class_vtables(&mem, &b, &[NAME, ".?AVNOPE@@"], &path).unwrap();
        assert!(got[".?AVNOPE@@"].is_empty());
        assert!(!path.exists());
    }
}
