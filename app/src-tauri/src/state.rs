use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Mutex, MutexGuard, TryLockError};
use std::time::Instant;

use fm_reader::{ClubFinances, ClubRef, Game, MemoryExt, Money, ReaderError, Scope, Snapshot};
use serde::Serialize;

pub const WINDOWS_ONLY: &str = "Windows only";
pub const BUSY: &str = "leitor ocupado com uma leitura do jogo";

pub struct Attached {
    pub mem: Box<dyn fm_reader::MemorySource + Send>,
    pub pid: u32,
}

pub type AttachFn = Box<dyn Fn() -> Result<Attached, String> + Send + Sync>;

#[derive(Debug, Default, Clone, Serialize, PartialEq)]
pub struct GameStatus {
    pub ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pid: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub build: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub build_known: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub game: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub date: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub busy: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub money: Option<Money>,
}

pub struct Reader {
    attach: AttachFn,
    game: Mutex<Option<(Game, u32)>>,
    last_status: Mutex<Option<GameStatus>>,
    loading: AtomicBool,
}

struct Loading<'a>(&'a AtomicBool);

impl<'a> Loading<'a> {
    fn start(flag: &'a AtomicBool) -> Self {
        flag.store(true, Ordering::Release);
        Self(flag)
    }
}

impl Drop for Loading<'_> {
    fn drop(&mut self) {
        self.0.store(false, Ordering::Release);
    }
}

#[cfg(windows)]
pub fn default_attach() -> AttachFn {
    Box::new(|| {
        let process = fm_reader::LiveProcess::attach("fm.exe").map_err(|e| message(&e))?;
        let pid = process.pid();
        Ok(Attached {
            mem: Box::new(process),
            pid,
        })
    })
}

#[cfg(not(windows))]
pub fn default_attach() -> AttachFn {
    Box::new(|| Err(WINDOWS_ONLY.to_string()))
}

pub const GAME_CLOSED_MID_READ: &str = "O jogo fechou durante a leitura";
pub const NO_PLAYERS: &str =
    "o jogo não devolveu nenhum jogador; ele pode estar no menu principal ou carregando um save";
pub const UNSUPPORTED_BUILD: &str =
    "O leitor não consegue ler esta versão do jogo. Aguarde uma atualização do app.";

pub fn message(e: &ReaderError) -> String {
    match e {
        ReaderError::ProcessNotFound(exe) => {
            format!("O jogo não está aberto ({exe} não encontrado)")
        }
        ReaderError::ModuleNotLoaded(module) => {
            format!("O jogo ainda está abrindo ({module} não carregado)")
        }
        ReaderError::BadImage(_) => "Não foi possível identificar a versão do jogo".to_string(),
        ReaderError::Os(detail) => format!("O Windows recusou o acesso ao jogo: {detail}"),
        ReaderError::UnsupportedBuild(_) => UNSUPPORTED_BUILD.to_string(),
        ReaderError::UnknownScope(scope) => format!("Escopo desconhecido: {scope}"),
    }
}

#[derive(Debug)]
struct Unattached {
    error: String,
    unsupported_build: Option<String>,
}

impl Unattached {
    fn reading(e: &ReaderError, build: Option<String>) -> Self {
        let unsupported_build =
            matches!(e, ReaderError::UnsupportedBuild(_)).then(|| build.unwrap_or_default());
        Self {
            error: message(e),
            unsupported_build,
        }
    }

    fn status(self) -> GameStatus {
        GameStatus {
            build_known: self.unsupported_build.as_ref().map(|_| false),
            build: self.unsupported_build,
            error: Some(self.error),
            ..Default::default()
        }
    }
}

impl From<String> for Unattached {
    fn from(error: String) -> Self {
        Self {
            error,
            unsupported_build: None,
        }
    }
}

impl From<Unattached> for String {
    fn from(unattached: Unattached) -> Self {
        unattached.error
    }
}

fn torn_read(still_mapped: bool, players: usize, had_players: bool) -> Result<(), String> {
    if !still_mapped {
        return Err(GAME_CLOSED_MID_READ.to_string());
    }
    if players == 0 && had_players {
        return Err(NO_PLAYERS.to_string());
    }
    Ok(())
}

pub fn my_club(clubs: &[ClubRef]) -> Option<u32> {
    clubs.iter().find_map(|c| c.uid)
}

pub fn parse_scope(text: &str) -> Result<Scope, String> {
    text.parse::<Scope>().map_err(|e| message(&e))
}

pub fn date_change(last: &mut Option<String>, now: Option<String>) -> Option<String> {
    let now = now?;
    if last.as_ref() == Some(&now) {
        return None;
    }
    *last = Some(now.clone());
    Some(now)
}

const HEALTH_SAMPLE: usize = 200;

fn engine_still_mapped(game: &Game) -> bool {
    game.memory().read(game.build().module.base, 2).as_deref() == Some(b"MZ")
}

fn cache_healthy(game: &Game) -> bool {
    let Some(players) = game.cached_players().filter(|p| !p.is_empty()) else {
        return false;
    };
    if !engine_still_mapped(game) {
        return false;
    }
    let sample = players.len().min(HEALTH_SAMPLE);
    let stride = players.len() / sample;
    let start = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_or(0, |d| d.subsec_nanos() as usize)
        % stride;
    let mem = game.memory();
    let alive = (0..sample)
        .map(|i| players[start + i * stride])
        .filter(|&a| {
            let vt = mem.u64(a);
            (vt == Some(game.player_vt()) || (vt.is_some() && vt == game.staff_vt()))
                && game.live(a, game.shift(a))
        })
        .count();
    alive * 100 >= sample * 98
}

impl Reader {
    pub fn new(attach: AttachFn) -> Self {
        Self {
            attach,
            game: Mutex::new(None),
            last_status: Mutex::new(None),
            loading: AtomicBool::new(false),
        }
    }

    fn lock(&self) -> MutexGuard<'_, Option<(Game, u32)>> {
        self.game
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }

    fn try_lock(&self) -> Option<MutexGuard<'_, Option<(Game, u32)>>> {
        match self.game.try_lock() {
            Ok(slot) => Some(slot),
            Err(TryLockError::Poisoned(poisoned)) => Some(poisoned.into_inner()),
            Err(TryLockError::WouldBlock) => None,
        }
    }

    fn lock_between_loads(&self) -> Result<MutexGuard<'_, Option<(Game, u32)>>, String> {
        if self.loading.load(Ordering::Acquire) {
            return Err(BUSY.to_string());
        }
        Ok(self.lock())
    }

    fn ensure_attached(&self, slot: &mut Option<(Game, u32)>) -> Result<(), Unattached> {
        if slot
            .as_ref()
            .is_some_and(|(game, _)| !engine_still_mapped(game))
        {
            *slot = None;
        }
        if slot.is_none() {
            let Attached { mem, pid } = (self.attach)()?;
            let build = fm_reader::build::engine_build(&*mem).ok().map(|b| b.id());
            let game = Game::attach(mem).map_err(|e| Unattached::reading(&e, build))?;
            *slot = Some((game, pid));
        }
        Ok(())
    }

    pub fn status(&self) -> GameStatus {
        let Some(mut slot) = self.try_lock() else {
            return self.busy_status();
        };
        let status = match self.ensure_attached(&mut slot) {
            Err(unattached) => {
                *slot = None;
                unattached.status()
            }
            Ok(()) => {
                let (game, pid) = slot.as_mut().expect("attached above");
                GameStatus {
                    ok: true,
                    pid: Some(*pid),
                    build: Some(game.build_id()),
                    build_known: Some(game.known_build()),
                    game: game.known_build().then(|| game.profile().name.to_string()),
                    date: game.today_cached().map(|d| d.to_string()),
                    money: game.money(),
                    ..Default::default()
                }
            }
        };
        *self.last_status.lock().unwrap_or_else(|p| p.into_inner()) = Some(status.clone());
        status
    }

    fn busy_status(&self) -> GameStatus {
        let last = self
            .last_status
            .lock()
            .unwrap_or_else(|p| p.into_inner())
            .clone();
        match last {
            Some(last) if last.ok => GameStatus {
                busy: Some(true),
                ..last
            },
            _ => GameStatus {
                busy: Some(true),
                ..Default::default()
            },
        }
    }

    pub fn load(
        &self,
        scope: Scope,
        rescan: bool,
        mut progress: impl FnMut(usize, usize),
    ) -> Result<Snapshot, String> {
        let started = Instant::now();
        let _loading = Loading::start(&self.loading);
        let mut slot = self.lock();
        let had_players = slot
            .as_ref()
            .and_then(|(game, _)| game.cached_players())
            .is_some_and(|players| !players.is_empty());
        let mut last_error = String::new();
        for _ in 0..2 {
            let attempt = self
                .ensure_attached(&mut slot)
                .map_err(String::from)
                .and_then(|()| {
                    let (game, _) = slot.as_mut().expect("attached above");
                    if rescan || !cache_healthy(game) {
                        game.players(true).map_err(|e| message(&e))?;
                    }
                    let (date, players) = game
                        .read_all(scope, false, &mut progress)
                        .map_err(|e| message(&e))?;
                    torn_read(engine_still_mapped(game), players.len(), had_players)?;
                    let total = game.cached_players().map_or(0, <[u64]>::len);
                    progress(total, total);
                    let my_clubs = game.my_clubs().unwrap_or_default();
                    let money = game.money();
                    let tactic = game.tactic();
                    Ok(Snapshot {
                        build: game.build_id(),
                        scope,
                        date,
                        my_clubs,
                        seconds: (started.elapsed().as_secs_f64() * 10.0).round() / 10.0,
                        money,
                        tactic,
                        players,
                    })
                });
            match attempt {
                Ok(snapshot) => return Ok(snapshot),
                Err(error) => {
                    *slot = None;
                    if error == NO_PLAYERS {
                        return Err(error);
                    }
                    last_error = error;
                }
            }
        }
        Err(last_error)
    }

    pub fn my_clubs(&self) -> Result<Vec<ClubRef>, String> {
        let mut slot = self.lock_between_loads()?;
        self.ensure_attached(&mut slot)?;
        let (game, _) = slot.as_mut().expect("attached above");
        game.my_clubs().map_err(|e| message(&e))
    }

    pub fn club_finances(&self) -> Result<Option<(u32, ClubFinances)>, String> {
        let mut slot = self.lock_between_loads()?;
        self.ensure_attached(&mut slot)?;
        let (game, _) = slot.as_mut().expect("attached above");
        let mine = game.my_clubs().map_err(|e| message(&e))?;
        Ok(my_club(&mine).and_then(|uid| Some((uid, game.club_finances(uid)?))))
    }

    pub fn game_date(&self) -> Option<String> {
        let mut slot = self.try_lock()?;
        let (game, _) = slot.as_mut()?;
        if !engine_still_mapped(game) {
            *slot = None;
            return None;
        }
        game.today_cached().map(|d| d.to_string())
    }
}

#[cfg(test)]
mod tests {
    use std::sync::{mpsc, Arc};
    use std::time::Duration;

    use super::*;

    fn failing(msg: &'static str) -> Reader {
        Reader::new(Box::new(move || Err(msg.to_string())))
    }

    #[test]
    fn status_when_process_missing_returns_error() {
        let status = failing("processo fm.exe não encontrado").status();
        assert!(!status.ok);
        assert_eq!(
            status.error.as_deref(),
            Some("processo fm.exe não encontrado")
        );
        assert_eq!(status.pid, None);
        let json = serde_json::to_value(&status).unwrap();
        assert_eq!(
            json,
            serde_json::json!({"ok": false, "error": "processo fm.exe não encontrado"})
        );
    }

    #[test]
    fn status_while_a_load_holds_the_game_reports_busy_with_the_last_good_status() {
        let reader = failing("sem jogo");
        let _held = reader.game.lock().unwrap();
        let first = reader.status();
        assert!(!first.ok);
        assert_eq!(first.busy, Some(true));

        *reader.last_status.lock().unwrap() = Some(GameStatus {
            ok: true,
            pid: Some(7),
            build: Some("B".into()),
            build_known: Some(true),
            ..Default::default()
        });
        let busy = reader.status();
        assert_eq!(
            (busy.ok, busy.pid, busy.build.as_deref(), busy.busy),
            (true, Some(7), Some("B"), Some(true))
        );
    }

    fn asked<T: Send + 'static>(job: impl FnOnce() -> T + Send + 'static) -> mpsc::Receiver<T> {
        let (tx, rx) = mpsc::channel();
        std::thread::spawn(move || {
            let _ = tx.send(job());
        });
        rx
    }

    type Answers = (Option<Result<(), String>>, Option<Result<(), String>>);

    fn ask_finances_and_clubs(reader: &Arc<Reader>) -> impl FnOnce() -> Answers {
        let r = reader.clone();
        let finances = asked(move || r.club_finances().map(|_| ()));
        let r = reader.clone();
        let clubs = asked(move || r.my_clubs().map(|_| ()));
        let within = |rx: mpsc::Receiver<_>| rx.recv_timeout(Duration::from_secs(2)).ok();
        move || (within(finances), within(clubs))
    }

    #[test]
    fn my_clubs_and_finances_wait_out_a_short_hold_and_answer() {
        let reader = Arc::new(failing("sem jogo"));
        let held = reader.game.lock().unwrap();
        let answers = ask_finances_and_clubs(&reader);
        std::thread::sleep(Duration::from_millis(100));
        drop(held);
        let answered = Some(Err("sem jogo".to_string()));
        assert_eq!(answers(), (answered.clone(), answered));
    }

    fn reader_with_a_parked_load(started: mpsc::Sender<()>) -> (Arc<Reader>, mpsc::Sender<()>) {
        let (gate, parked) = mpsc::channel::<()>();
        let parked = Mutex::new(parked);
        let reader = Arc::new(Reader::new(Box::new(move || {
            let _ = started.send(());
            let _ = parked.lock().unwrap().recv();
            Err("sem jogo".to_string())
        })));
        (reader, gate)
    }

    #[test]
    fn my_clubs_and_finances_answer_busy_while_a_load_runs_and_answer_again_after_it() {
        let (started, attaching) = mpsc::channel();
        let (reader, gate) = reader_with_a_parked_load(started);
        let r = reader.clone();
        let load = std::thread::spawn(move || r.load(Scope::Competitive, false, |_, _| {}));
        attaching.recv().unwrap();
        let busy = Some(Err(BUSY.to_string()));
        assert_eq!(ask_finances_and_clubs(&reader)(), (busy.clone(), busy));
        drop(gate);
        assert_eq!(load.join().unwrap().unwrap_err(), "sem jogo");
        let answered = Some(Err("sem jogo".to_string()));
        assert_eq!(
            ask_finances_and_clubs(&reader)(),
            (answered.clone(), answered)
        );
    }

    #[test]
    fn scope_parse_rejects_unknown() {
        assert_eq!(
            parse_scope("galaxia").unwrap_err(),
            "Escopo desconhecido: galaxia"
        );
        assert_eq!(parse_scope("competitive").unwrap(), Scope::Competitive);
    }

    #[test]
    fn reader_errors_reach_the_app_in_pt_br() {
        let cases = [
            (
                ReaderError::ProcessNotFound("fm.exe".into()),
                "O jogo não está aberto (fm.exe não encontrado)",
            ),
            (
                ReaderError::ModuleNotLoaded("game_plugin.dll".into()),
                "O jogo ainda está abrindo (game_plugin.dll não carregado)",
            ),
            (
                ReaderError::BadImage("bad PE signature".into()),
                "Não foi possível identificar a versão do jogo",
            ),
            (
                ReaderError::Os("Acesso negado.".into()),
                "O Windows recusou o acesso ao jogo: Acesso negado.",
            ),
            (
                ReaderError::UnsupportedBuild(
                    "ACTUAL_PLAYER class not found - unsupported game build".into(),
                ),
                UNSUPPORTED_BUILD,
            ),
            (
                ReaderError::UnknownScope("galaxia".into()),
                "Escopo desconhecido: galaxia",
            ),
        ];
        for (error, expected) in cases {
            assert_eq!(message(&error), expected, "{error:?}");
        }
    }

    #[test]
    fn a_build_whose_players_cannot_be_found_is_an_unsupported_version_not_a_missing_game() {
        let error = ReaderError::UnsupportedBuild(
            "ACTUAL_PLAYER class not found - unsupported game build".into(),
        );
        let status = Unattached::reading(&error, Some("6B000000-1".into())).status();
        assert_eq!(
            serde_json::to_value(&status).unwrap(),
            serde_json::json!({"ok": false, "build": "6B000000-1", "build_known": false, "error": UNSUPPORTED_BUILD})
        );
    }

    #[test]
    fn status_sends_the_game_money_in_the_ts_contract_shape() {
        let status = GameStatus {
            ok: true,
            money: Some(Money {
                currency: fm_reader::Currency {
                    code: "EUR".into(),
                    symbol: "€".into(),
                    name: "Euro".into(),
                },
                rate: 1.164_101_123_809_814_5,
                wage_period: fm_reader::WagePeriod::Month,
            }),
            ..Default::default()
        };
        assert_eq!(
            serde_json::to_value(&status).unwrap(),
            serde_json::json!({
                "ok": true,
                "money": {
                    "currency": {"code": "EUR", "symbol": "€", "name": "Euro"},
                    "rate": 1.164_101_123_809_814_5,
                    "wage_period": "month"
                }
            })
        );
    }

    #[test]
    fn any_other_attach_failure_reports_only_the_error() {
        let error = ReaderError::ProcessNotFound("fm.exe".into());
        let status = Unattached::reading(&error, Some("6B000000-1".into())).status();
        assert_eq!(
            serde_json::to_value(&status).unwrap(),
            serde_json::json!({"ok": false, "error": "O jogo não está aberto (fm.exe não encontrado)"})
        );
    }

    #[test]
    fn a_read_the_game_closed_during_is_an_error() {
        assert_eq!(
            torn_read(false, 30_000, true),
            Err(GAME_CLOSED_MID_READ.to_string())
        );
        assert_eq!(
            torn_read(false, 30_000, false),
            Err(GAME_CLOSED_MID_READ.to_string())
        );
    }

    #[test]
    fn an_empty_read_is_an_error_only_after_players_were_found() {
        assert_eq!(torn_read(true, 0, true), Err(NO_PLAYERS.to_string()));
        assert_eq!(torn_read(true, 0, false), Ok(()));
        assert_eq!(torn_read(true, 45_985, true), Ok(()));
    }

    #[test]
    fn my_club_is_the_first_human_club_with_a_uid() {
        let club = |name: &str, uid| ClubRef {
            name: name.into(),
            uid,
        };
        assert_eq!(
            my_club(&[
                club("Sem uid", None),
                club("MFC", Some(301_344)),
                club("Outro", Some(7))
            ]),
            Some(301_344)
        );
        assert_eq!(my_club(&[club("Sem uid", None)]), None);
        assert_eq!(my_club(&[]), None);
    }

    #[test]
    fn load_my_clubs_and_finances_fail_when_process_missing() {
        let reader = failing("sem jogo");
        assert_eq!(
            reader
                .load(Scope::Competitive, false, |_, _| {})
                .unwrap_err(),
            "sem jogo"
        );
        assert_eq!(reader.my_clubs().unwrap_err(), "sem jogo");
        assert_eq!(reader.club_finances().unwrap_err(), "sem jogo");
        assert_eq!(reader.game_date(), None);
    }

    #[test]
    fn date_change_fires_only_on_a_new_date() {
        let mut last = None;
        assert_eq!(date_change(&mut last, None), None);
        assert_eq!(
            date_change(&mut last, Some("2026-10-30".into())),
            Some("2026-10-30".into())
        );
        assert_eq!(date_change(&mut last, Some("2026-10-30".into())), None);
        assert_eq!(date_change(&mut last, None), None);
        assert_eq!(date_change(&mut last, Some("2026-10-30".into())), None);
        assert_eq!(
            date_change(&mut last, Some("2026-10-31".into())),
            Some("2026-10-31".into())
        );
    }

    #[cfg(not(windows))]
    #[test]
    fn default_factory_reports_windows_only() {
        let status = Reader::new(default_attach()).status();
        assert_eq!(status.error.as_deref(), Some(WINDOWS_ONLY));
    }

    #[cfg(windows)]
    #[test]
    #[ignore = "needs fm.exe running"]
    fn live_status_and_date_against_running_game() {
        let reader = Reader::new(default_attach());
        let status = reader.status();
        println!("{status:?}");
        assert!(status.ok, "{:?}", status.error);
        assert_eq!(status.build.as_deref(), Some("6AE8CF77-17969000"));
        assert_eq!(status.build_known, Some(true));
        let snapshot = reader.load(Scope::Competitive, false, |_, _| {}).unwrap();
        println!(
            "{} players, date {:?}, clubs {:?}",
            snapshot.players.len(),
            snapshot.date,
            snapshot.my_clubs
        );
        assert!(reader.game_date().is_some());
        let again = reader.load(Scope::Competitive, false, |_, _| {}).unwrap();
        assert_eq!(again.players.len(), snapshot.players.len());
        let finances = reader.club_finances().unwrap();
        println!("finances {finances:?}");
        assert!(finances.is_some());
        let money = reader.status().money;
        println!("money {money:?}");
        assert_eq!(money.map(|m| m.currency.code), Some("EUR".into()));
    }
}
