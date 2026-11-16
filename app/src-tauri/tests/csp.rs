use std::collections::HashMap;

fn config() -> serde_json::Value {
    serde_json::from_str(include_str!("../tauri.conf.json")).unwrap()
}

fn csp() -> HashMap<String, Vec<String>> {
    let config = config();
    let text = config["app"]["security"]["csp"]
        .as_str()
        .expect("a CSP string");
    text.split(';')
        .filter_map(|directive| {
            let mut words = directive.split_whitespace().map(str::to_string);
            Some((words.next()?, words.collect()))
        })
        .collect()
}

#[test]
fn csp_runs_no_eval_and_no_inline_script() {
    for (directive, sources) in csp() {
        assert!(!sources.iter().any(|s| s == "'unsafe-eval'"), "{directive}");
        if directive != "style-src" {
            assert!(
                !sources.iter().any(|s| s == "'unsafe-inline'"),
                "{directive}"
            );
        }
    }
}

#[test]
fn csp_reaches_no_remote_origin() {
    let csp = csp();
    assert_eq!(csp["connect-src"], ["ipc:", "http://ipc.localhost"]);
    for (directive, sources) in &csp {
        for source in sources {
            let remote = source.contains("://") && source != "http://ipc.localhost";
            let wildcard = source.contains('*')
                || ["http:", "https:", "ws:", "wss:"].contains(&source.as_str());
            assert!(!remote && !wildcard, "{directive} {source}");
        }
    }
}

#[test]
fn csp_closes_the_directives_that_do_not_fall_back_to_default_src() {
    let csp = csp();
    assert_eq!(csp["default-src"], ["'self'"]);
    assert_eq!(csp["object-src"], ["'none'"]);
    assert_eq!(csp["base-uri"], ["'none'"]);
    assert_eq!(csp["form-action"], ["'none'"]);
}

#[test]
fn scripts_run_only_from_the_app_bundle() {
    let csp = csp();
    for directive in ["default-src", "script-src"] {
        for source in csp.get(directive).into_iter().flatten() {
            assert!(
                !["data:", "blob:", "'unsafe-eval'"].contains(&source.as_str()),
                "{directive} {source}"
            );
        }
    }
}

#[test]
fn security_config_keeps_tauri_defaults_that_protect_the_webview() {
    let config = config();
    let security = &config["app"]["security"];
    assert!(
        security["dangerousDisableAssetCspModification"].is_null(),
        "Tauri must keep adding its CSP nonces"
    );
    assert_ne!(security["assetProtocol"]["enable"], true);
    assert!(
        security["devCsp"].is_null(),
        "a dev-only CSP would differ from the shipped one"
    );
    assert_ne!(config["app"]["withGlobalTauri"], true);
}
