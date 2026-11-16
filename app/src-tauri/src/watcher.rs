use std::panic::{self, AssertUnwindSafe};
use std::sync::atomic::Ordering;
use std::sync::Arc;
use std::time::{Duration, Instant};

use serde::Serialize;
use tauri::{AppHandle, Emitter, Runtime};

use crate::commands::PollSeconds;
use crate::state::{date_change, Reader};

const TICK: Duration = Duration::from_millis(250);

#[derive(Serialize, Clone)]
struct GameDate {
    date: String,
}

pub fn spawn<R: Runtime>(app: AppHandle<R>, reader: Arc<Reader>, poll: Arc<PollSeconds>) {
    std::thread::spawn(move || {
        let mut last_date = None;
        let mut last_poll = Instant::now();
        loop {
            std::thread::sleep(TICK);
            if last_poll.elapsed() < Duration::from_secs(poll.0.load(Ordering::Relaxed)) {
                continue;
            }
            last_poll = Instant::now();
            let tick = panic::catch_unwind(AssertUnwindSafe(|| {
                if let Some(date) = date_change(&mut last_date, reader.game_date()) {
                    let _ = app.emit("game-date", GameDate { date });
                }
            }));
            if tick.is_err() {
                eprintln!("watcher: tick panicked, continuing");
            }
        }
    });
}
