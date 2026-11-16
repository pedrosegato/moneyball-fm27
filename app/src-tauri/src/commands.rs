use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};

use fm_reader::Snapshot;
use serde::Serialize;
use tauri::{AppHandle, Emitter, Runtime, State};

use crate::state::{parse_scope, GameStatus, Reader};

pub const DEFAULT_POLL_SECONDS: u64 = 5;
const PROGRESS_INTERVAL: Duration = Duration::from_millis(50);

pub struct PollSeconds(pub AtomicU64);

impl Default for PollSeconds {
    fn default() -> Self {
        Self(AtomicU64::new(DEFAULT_POLL_SECONDS))
    }
}

#[derive(Serialize)]
pub struct ClubFinances {
    pub club_uid: u32,
    pub transfer_budget: Option<i64>,
    pub wage_budget_weekly: Option<i64>,
    pub verified: bool,
}

impl From<(u32, fm_reader::ClubFinances)> for ClubFinances {
    fn from((club_uid, read): (u32, fm_reader::ClubFinances)) -> Self {
        Self {
            club_uid,
            transfer_budget: Some(read.transfer_budget),
            wage_budget_weekly: Some(read.wage_budget_weekly),
            verified: read.verified,
        }
    }
}

#[derive(Serialize, Clone)]
struct LoadProgress {
    phase: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    done: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    total: Option<usize>,
}

pub const MIN_POLL_SECONDS: u64 = 2;
pub const MAX_POLL_SECONDS: u64 = 60;

pub fn clamp_poll_seconds(n: u64) -> Result<u64, String> {
    if (MIN_POLL_SECONDS..=MAX_POLL_SECONDS).contains(&n) {
        Ok(n)
    } else {
        Err(format!(
            "intervalo deve ficar entre {MIN_POLL_SECONDS} e {MAX_POLL_SECONDS} segundos"
        ))
    }
}

async fn blocking<T: Send + 'static>(
    job: impl FnOnce() -> T + Send + 'static,
) -> Result<T, String> {
    tauri::async_runtime::spawn_blocking(job)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn game_status(reader: State<'_, Arc<Reader>>) -> Result<GameStatus, String> {
    let reader = reader.inner().clone();
    blocking(move || reader.status()).await
}

#[tauri::command]
pub async fn load_players<R: Runtime>(
    app: AppHandle<R>,
    reader: State<'_, Arc<Reader>>,
    scope: String,
    rescan: bool,
) -> Result<Snapshot, String> {
    let scope = parse_scope(&scope)?;
    let reader = reader.inner().clone();
    let _ = app.emit(
        "load-progress",
        LoadProgress {
            phase: "scan",
            done: None,
            total: None,
        },
    );
    blocking(move || {
        let mut last_emit = Instant::now() - PROGRESS_INTERVAL;
        reader.load(scope, rescan, |done, total| {
            if done >= total || last_emit.elapsed() >= PROGRESS_INTERVAL {
                last_emit = Instant::now();
                let _ = app.emit(
                    "load-progress",
                    LoadProgress {
                        phase: "read",
                        done: Some(done),
                        total: Some(total),
                    },
                );
            }
        })
    })
    .await?
}

#[tauri::command]
pub async fn my_clubs(reader: State<'_, Arc<Reader>>) -> Result<Vec<fm_reader::ClubRef>, String> {
    let reader = reader.inner().clone();
    blocking(move || reader.my_clubs()).await?
}

#[tauri::command]
pub async fn club_finances(reader: State<'_, Arc<Reader>>) -> Result<Option<ClubFinances>, String> {
    let reader = reader.inner().clone();
    Ok(blocking(move || reader.club_finances())
        .await??
        .map(ClubFinances::from))
}

#[tauri::command]
pub fn set_poll_seconds(poll: State<'_, Arc<PollSeconds>>, n: u64) -> Result<(), String> {
    poll.0.store(clamp_poll_seconds(n)?, Ordering::Relaxed);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn club_finances_keep_the_ts_contract_name_their_club_and_leave_the_wage_bill_out() {
        let read = fm_reader::ClubFinances {
            transfer_budget: 1_123_660,
            wage_budget_weekly: 157_249,
            wage_bill_weekly: 160_137,
            verified: false,
        };
        assert_eq!(
            serde_json::to_value(ClubFinances::from((301_344, read))).unwrap(),
            serde_json::json!({
                "club_uid": 301_344,
                "transfer_budget": 1_123_660,
                "wage_budget_weekly": 157_249,
                "verified": false
            })
        );
    }

    #[test]
    fn poll_seconds_must_be_between_2_and_60() {
        assert!(clamp_poll_seconds(1).is_err());
        assert!(clamp_poll_seconds(61).is_err());
        assert_eq!(clamp_poll_seconds(2), Ok(2));
        assert_eq!(clamp_poll_seconds(60), Ok(60));
    }
}
