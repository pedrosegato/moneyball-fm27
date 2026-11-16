const COMMANDS: &[&str] = &[
    "game_status",
    "load_players",
    "my_clubs",
    "club_finances",
    "set_poll_seconds",
];

const COMMON_CONTROLS_V6: &str = r#"<assembly xmlns="urn:schemas-microsoft-com:asm.v1" manifestVersion="1.0">
  <dependency>
    <dependentAssembly>
      <assemblyIdentity type="win32" name="Microsoft.Windows.Common-Controls" version="6.0.0.0"
        processorArchitecture="*" publicKeyToken="6595b64144ccf1df" language="*" />
    </dependentAssembly>
  </dependency>
</assembly>
"#;

fn embed_manifest_in_tests() {
    let windows_msvc = std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("windows")
        && std::env::var("CARGO_CFG_TARGET_ENV").as_deref() == Ok("msvc");
    if !windows_msvc {
        return;
    }
    let manifest =
        std::path::PathBuf::from(std::env::var("OUT_DIR").expect("OUT_DIR")).join("tests.manifest");
    std::fs::write(&manifest, COMMON_CONTROLS_V6).expect("falha ao gravar o manifesto dos testes");
    println!("cargo:rustc-link-arg-tests=/MANIFEST:EMBED");
    println!(
        "cargo:rustc-link-arg-tests=/MANIFESTINPUT:{}",
        manifest.display()
    );
}

fn main() {
    let dist = std::path::Path::new("../dist");
    if !dist.exists() {
        std::fs::create_dir_all(dist).expect("falha ao criar ../dist");
        std::fs::write(
            dist.join("index.html"),
            "<!doctype html><title>Moneyball FM27</title>",
        )
        .expect("falha ao criar ../dist/index.html");
    }
    embed_manifest_in_tests();
    tauri_build::try_build(
        tauri_build::Attributes::new()
            .app_manifest(tauri_build::AppManifest::new().commands(COMMANDS)),
    )
    .expect("falha ao gerar o manifesto de comandos do app");
}
