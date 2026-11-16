use serde_json::{json, Value};
use tauri::ipc::{CallbackFn, InvokeBody};
use tauri::test::{get_ipc_response, mock_builder, MockRuntime, INVOKE_KEY};
use tauri::webview::InvokeRequest;
use tauri::{App, Manager, WebviewWindow};

const LOCAL: &str = if cfg!(windows) {
    "http://tauri.localhost"
} else {
    "tauri://localhost"
};
const NO_STORE: u32 = 4_000_000_000;

fn app() -> App<MockRuntime> {
    let mut app = moneyball_fm27_lib::configure(mock_builder())
        .build(tauri::generate_context!())
        .expect("mock app");
    #[allow(deprecated)]
    app.run_iteration(|_, _| {});
    app
}

fn main_window(app: &App<MockRuntime>) -> WebviewWindow<MockRuntime> {
    app.get_webview_window("main")
        .expect("the main window from tauri.conf.json")
}

fn call_from(
    window: &WebviewWindow<MockRuntime>,
    origin: &str,
    cmd: &str,
    args: Value,
) -> Result<Value, String> {
    get_ipc_response(
        window,
        InvokeRequest {
            cmd: cmd.into(),
            callback: CallbackFn(0),
            error: CallbackFn(1),
            url: origin.parse().unwrap(),
            body: InvokeBody::Json(args),
            headers: Default::default(),
            invoke_key: INVOKE_KEY.to_string(),
        },
    )
    .map(|body| body.deserialize::<Value>().unwrap())
    .map_err(|e| e.as_str().map_or_else(|| e.to_string(), str::to_string))
}

fn call(window: &WebviewWindow<MockRuntime>, cmd: &str, args: Value) -> Result<Value, String> {
    call_from(window, LOCAL, cmd, args)
}

fn denied(result: &Result<Value, String>) -> bool {
    matches!(result, Err(e) if e.contains("not allowed"))
}

#[test]
fn remote_pages_reach_no_command() {
    let app = app();
    let window = main_window(&app);
    for cmd in [
        "game_status",
        "set_poll_seconds",
        "plugin:event|listen",
        "plugin:store|get_store",
    ] {
        let result = call_from(&window, "https://evil.example", cmd, json!({}));
        assert!(denied(&result), "{cmd}: {result:?}");
    }
}

#[test]
fn the_webview_has_no_file_shell_network_opener_or_window_access() {
    let app = app();
    let window = main_window(&app);
    for cmd in [
        "plugin:fs|read_text_file",
        "plugin:fs|write_text_file",
        "plugin:shell|execute",
        "plugin:shell|open",
        "plugin:http|fetch",
        "plugin:process|exit",
        "plugin:opener|open_url",
        "plugin:opener|open_path",
        "plugin:opener|reveal_item_in_dir",
        "plugin:image|from_path",
        "plugin:path|resolve_directory",
        "plugin:menu|new",
        "plugin:tray|new",
        "plugin:app|name",
        "plugin:window|set_title",
        "plugin:webview|create_webview_window",
    ] {
        let result = call(&window, cmd, json!({}));
        assert!(denied(&result), "{cmd}: {result:?}");
    }
}

#[test]
fn the_webview_listens_to_the_reader_events() {
    let app = app();
    let window = main_window(&app);
    for cmd in ["plugin:event|listen", "plugin:event|unlisten"] {
        let result = call(&window, cmd, json!({}));
        assert!(!denied(&result), "{cmd}: {result:?}");
    }
}

#[test]
fn the_store_cannot_open_a_file_the_app_did_not_open() {
    let app = app();
    let window = main_window(&app);
    let outside = std::env::temp_dir().join("moneyball-fm27-acl-probe.json");
    for path in [
        outside.to_string_lossy().into_owned(),
        "../../moneyball-fm27-acl-probe.json".into(),
        "moneyball-fm27.json".into(),
    ] {
        let result = call(&window, "plugin:store|load", json!({ "path": path }));
        assert!(denied(&result), "{path}: {result:?}");
    }
    for cmd in [
        "plugin:store|clear",
        "plugin:store|reset",
        "plugin:store|delete",
        "plugin:store|reload",
    ] {
        let result = call(&window, cmd, json!({ "rid": NO_STORE, "key": "k" }));
        assert!(denied(&result), "{cmd}: {result:?}");
    }
}

#[test]
fn a_denied_load_leaves_no_store_the_webview_can_reach() {
    let app = app();
    let window = main_window(&app);
    let outside = std::env::temp_dir()
        .join("moneyball-fm27-acl-probe.json")
        .to_string_lossy()
        .into_owned();
    for path in [outside, "../../moneyball-fm27-acl-probe.json".into()] {
        let _ = call(&window, "plugin:store|load", json!({ "path": path }));
        let reached = call(&window, "plugin:store|get_store", json!({ "path": path }));
        assert_eq!(reached, Ok(Value::Null), "{path}");
    }
}

#[test]
fn the_webview_asks_for_the_store_under_the_name_the_app_opened() {
    let storage_keys = include_str!("../../src/lib/storageKeys.ts");
    let declared = format!(
        "export const TAURI_STORE_FILE = \"{}\";",
        moneyball_fm27_lib::SETTINGS_STORE
    );
    assert!(
        storage_keys.contains(&declared),
        "app/src/lib/storageKeys.ts must declare {declared}"
    );
}

#[test]
fn the_settings_store_is_opened_by_the_app_and_reached_by_name() {
    let app = app();
    let window = main_window(&app);
    let rid = call(
        &window,
        "plugin:store|get_store",
        json!({ "path": "moneyball-fm27.json" }),
    );
    assert!(matches!(rid, Ok(Value::Number(_))), "{rid:?}");
    let elsewhere = call(
        &window,
        "plugin:store|get_store",
        json!({ "path": "../../moneyball-fm27.json" }),
    );
    assert_eq!(elsewhere, Ok(Value::Null));
    for cmd in ["plugin:store|get", "plugin:store|set", "plugin:store|save"] {
        let result = call(
            &window,
            cmd,
            json!({ "rid": NO_STORE, "key": "k", "value": 1 }),
        );
        assert!(result.is_err() && !denied(&result), "{cmd}: {result:?}");
    }
}

#[test]
fn set_poll_seconds_takes_only_whole_seconds_from_2_to_60() {
    let app = app();
    let window = main_window(&app);
    assert_eq!(
        call(&window, "set_poll_seconds", json!({ "n": 10 })),
        Ok(Value::Null)
    );
    for n in [
        json!(0),
        json!(1),
        json!(61),
        json!(u64::MAX),
        json!(-5),
        json!(2.5),
        json!("10"),
        json!(null),
    ] {
        let result = call(&window, "set_poll_seconds", json!({ "n": n }));
        assert!(result.is_err() && !denied(&result), "{n}: {result:?}");
    }
}

#[test]
fn load_players_rejects_an_unknown_scope_before_reading_the_game() {
    let app = app();
    let window = main_window(&app);
    for scope in [json!("galaxia"), json!("competitive "), json!(1)] {
        let result = call(
            &window,
            "load_players",
            json!({ "scope": scope, "rescan": false }),
        );
        assert!(result.is_err() && !denied(&result), "{scope}: {result:?}");
    }
}
