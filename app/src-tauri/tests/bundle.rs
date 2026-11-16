use std::path::Path;

fn bundle() -> serde_json::Value {
    let config: serde_json::Value =
        serde_json::from_str(include_str!("../tauri.conf.json")).unwrap();
    config["bundle"].clone()
}

#[test]
fn the_installer_shows_the_licence_and_installs_it_with_the_third_party_notices() {
    let bundle = bundle();
    let here = Path::new(env!("CARGO_MANIFEST_DIR"));
    let licence = bundle["licenseFile"]
        .as_str()
        .expect("a licence page in the installer");
    assert!(
        here.join(licence).ends_with("LICENSE") && here.join(licence).is_file(),
        "{licence}"
    );
    let resources = bundle["resources"]
        .as_object()
        .expect("resources mapped to where they install");
    for name in ["LICENSE", "THIRD_PARTY_NOTICES.md"] {
        let (source, _) = resources
            .iter()
            .find(|(_, target)| *target == name)
            .unwrap_or_else(|| panic!("{name}"));
        assert!(
            here.join(source).ends_with(name) && here.join(source).is_file(),
            "{source}"
        );
    }
}
