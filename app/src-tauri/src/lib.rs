pub mod commands;
pub mod state;
pub mod watcher;

use std::sync::Arc;

use tauri::Runtime;
use tauri_plugin_store::StoreExt;

pub const SETTINGS_STORE: &str = "moneyball-fm27.json";

pub fn configure<R: Runtime>(builder: tauri::Builder<R>) -> tauri::Builder<R> {
    let reader = Arc::new(state::Reader::new(state::default_attach()));
    let poll = Arc::new(commands::PollSeconds::default());
    builder
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(
            tauri::plugin::Builder::<R>::new("app-pages")
                .on_navigation(|_, url| is_app_page(url))
                .build(),
        )
        .manage(reader.clone())
        .manage(poll.clone())
        .setup(move |app| {
            if let Err(e) = app
                .store_builder(SETTINGS_STORE)
                .disable_auto_save()
                .build()
            {
                eprintln!("configurações: {SETTINGS_STORE} não abriu: {e}");
            }
            watcher::spawn(app.handle().clone(), reader.clone(), poll.clone());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::game_status,
            commands::load_players,
            commands::my_clubs,
            commands::club_finances,
            commands::set_poll_seconds,
        ])
}

fn is_app_page(url: &tauri::Url) -> bool {
    match url.scheme() {
        "blob" => url
            .path()
            .parse()
            .is_ok_and(|inner: tauri::Url| is_app_origin(&inner)),
        _ => is_app_origin(url),
    }
}

fn is_app_origin(url: &tauri::Url) -> bool {
    let host = url.host_str();
    match url.scheme() {
        "tauri" => host == Some("localhost") && url.port().is_none(),
        "http" | "https" => {
            (host == Some("tauri.localhost") && url.port().is_none())
                || (cfg!(debug_assertions) && host == Some("localhost") && url.port() == Some(1420))
        }
        _ => false,
    }
}

pub fn run() {
    configure(tauri::Builder::default())
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o Moneyball FM27");
}

#[cfg(test)]
mod tests {
    use super::is_app_page;

    #[test]
    fn only_app_pages_load_in_the_window() {
        for ok in [
            "tauri://localhost/",
            "http://tauri.localhost/index.html",
            "http://tauri.localhost/#/carrinho",
            "blob:http://tauri.localhost/0b1c",
        ] {
            assert!(is_app_page(&ok.parse().unwrap()), "{ok}");
        }
        for bad in [
            "https://evil.example/",
            "http://tauri.localhost.evil.example/",
            "http://evil.example/tauri.localhost",
            "http://tauri.localhost:8080/",
            "tauri://evil.example/",
            "file:///C:/x",
            "javascript:alert(1)",
            "data:text/html,x",
            "about:blank",
            "blob:https://evil.example/1",
            "blob:blob:http://tauri.localhost/1",
        ] {
            assert!(!is_app_page(&bad.parse().unwrap()), "{bad}");
        }
    }

    #[test]
    fn the_dev_server_loads_only_in_debug_builds() {
        assert_eq!(
            is_app_page(&"http://localhost:1420/".parse().unwrap()),
            cfg!(debug_assertions)
        );
        assert!(!is_app_page(&"http://localhost:1421/".parse().unwrap()));
        assert!(!is_app_page(&"http://localhost/".parse().unwrap()));
    }
}
