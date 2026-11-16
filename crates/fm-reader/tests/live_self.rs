#![cfg(windows)]

use fm_reader::live::LiveProcess;
use fm_reader::MemorySource;

#[test]
fn reads_own_process_buffer() {
    let buf = vec![0xABu8; 4096];
    let proc = LiveProcess::open(std::process::id()).unwrap();
    let got = proc.read(buf.as_ptr() as u64, 4096).unwrap();
    assert_eq!(got, buf);
}

#[test]
fn attach_missing_exe_errors() {
    let err = LiveProcess::attach("definitely-not-running.exe").unwrap_err();
    assert!(err.to_string().contains("is not running"), "{err}");
}

#[test]
fn own_process_has_regions_and_modules() {
    let proc = LiveProcess::open(std::process::id()).unwrap();
    assert!(proc.regions(false).next().is_some());
    assert!(!proc.modules().unwrap().is_empty());
}

#[test]
#[ignore = "needs fm.exe running; read-only"]
fn fm_game_plugin_starts_with_mz() {
    let proc = LiveProcess::attach("fm.exe").unwrap();
    let m = proc
        .modules()
        .unwrap()
        .into_iter()
        .find(|m| m.name.eq_ignore_ascii_case("game_plugin.dll"))
        .unwrap();
    assert_eq!(proc.read(m.base, 2).unwrap(), b"MZ");
}

#[test]
#[ignore = "needs fm.exe running; read-only"]
fn fm_engine_build_and_actual_player_vtable() {
    let proc = LiveProcess::attach("fm.exe").unwrap();
    let build = fm_reader::build::engine_build(&proc).unwrap();
    assert_eq!(build.id(), "6AE8CF77-17969000");
    let vts = fm_reader::rtti::vtables_for(&proc, &build.module, ".?AVACTUAL_PLAYER@db@@", None);
    assert!(!vts.is_empty());
}
