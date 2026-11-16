#![cfg(windows)]

use std::collections::{HashMap, HashSet};
use std::time::Instant;

use fm_reader::fm::record::READER_ONLY_FIELDS;
use fm_reader::{Game, LiveProcess, Scope, Snapshot};

const SAVE_DATE: &str = "2026-10-30";
const SAVE_PLAYERS: usize = 45985;
const MFC: u32 = 301344;

fn python_shape(player: &impl serde::Serialize) -> serde_json::Value {
    let mut v = serde_json::to_value(player).unwrap();
    for key in READER_ONLY_FIELDS {
        v.as_object_mut().unwrap().remove(key);
    }
    v
}

#[test]
#[ignore = "needs fm.exe running; read-only"]
fn fm_read_all_competitive_everyone() {
    let t0 = Instant::now();
    let mut game = Game::attach(Box::new(LiveProcess::attach("fm.exe").unwrap())).unwrap();
    let attached = t0.elapsed();
    let scanned = game.players(false).unwrap().len();
    let t_scan = t0.elapsed();
    let (today, rows) = game.read_all(Scope::Competitive, false, |_, _| {}).unwrap();
    let t_read = t0.elapsed();
    let clubs = game.my_clubs().unwrap();
    println!(
        "build {} (known {}), {scanned} player addresses, {} rows, date {today:?}, unlisted {}",
        game.build_id(),
        game.known_build(),
        rows.len(),
        game.unlisted()
    );
    println!(
        "attach {:.2?}, scan {:.2?}, read {:.2?}, total {:.2?}",
        attached,
        t_scan - attached,
        t_read - t_scan,
        t_read
    );
    println!("my_clubs {clubs:?}");

    let t_again = Instant::now();
    let (_, again) = game.read_all(Scope::Competitive, false, |_, _| {}).unwrap();
    println!(
        "warm read_all {:.2?} ({} rows)",
        t_again.elapsed(),
        again.len()
    );

    assert!(
        clubs
            .iter()
            .any(|c| c.name == "MFC" && c.uid == Some(301344)),
        "{clubs:?}"
    );
    let date = today.map(|d| d.to_string());
    if date.as_deref() == Some(SAVE_DATE) {
        assert_eq!(rows.len(), SAVE_PLAYERS);
    } else {
        println!(
            "game moved on: date {date:?}, {} rows (fixture: {SAVE_DATE}, {SAVE_PLAYERS})",
            rows.len()
        );
        assert!(rows.len().abs_diff(SAVE_PLAYERS) < 500);
    }

    let negueba = rows
        .iter()
        .find(|r| r.name == "Negueba" && r.club.as_deref() == Some("MFC"))
        .unwrap();
    let season = negueba.season.as_ref().unwrap();
    println!("Negueba: minutes {} goals {}", season.minutes, season.goals);
    if date.as_deref() == Some(SAVE_DATE) {
        assert_eq!((season.minutes, season.goals), (3128, 10));
    }

    if let Ok(path) = std::env::var("FM_RAW_FIXTURE") {
        let python: Snapshot =
            serde_json::from_str(&std::fs::read_to_string(path).unwrap()).unwrap();
        let ours: HashMap<u32, serde_json::Value> =
            rows.iter().map(|r| (r.uid, python_shape(r))).collect();
        let python_uids: HashSet<u32> = python.players.iter().map(|p| p.uid).collect();
        let only_rust = ours.keys().filter(|u| !python_uids.contains(u)).count();
        let mut differing = Vec::new();
        for p in &python.players {
            let theirs = python_shape(p);
            match ours.get(&p.uid) {
                None => differing.push((p.uid, vec!["missing in Rust".to_string()])),
                Some(mine) if *mine != theirs => {
                    let keys = theirs
                        .as_object()
                        .unwrap()
                        .iter()
                        .filter(|(k, v)| mine.get(k.as_str()) != Some(v));
                    differing.push((p.uid, keys.map(|(k, _)| k.clone()).collect()));
                }
                Some(_) => {}
            }
        }
        println!(
            "parity vs Python dump ({} on {:?}): {} of {} players differ, {only_rust} uids only in Rust; first: {:?}",
            python.build,
            python.date,
            differing.len(),
            python.players.len(),
            &differing[..differing.len().min(10)]
        );
    }
}

#[test]
#[ignore = "needs fm.exe running with the MFC save; read-only"]
fn fm_club_finances_of_my_club() {
    let mut game = Game::attach(Box::new(LiveProcess::attach("fm.exe").unwrap())).unwrap();
    let finances = game.club_finances(MFC);
    println!("MFC finances {finances:?}");
    let finances = finances.expect("MFC has full finances on this build");
    assert!(
        finances.wage_budget_weekly > 0 && finances.wage_bill_weekly > 0,
        "{finances:?}"
    );
}

#[test]
#[ignore = "needs fm.exe running with the MFC save; read-only"]
fn fm_money_is_the_euro_monthly_wages_the_game_shows() {
    let mut game = Game::attach(Box::new(LiveProcess::attach("fm.exe").unwrap())).unwrap();
    game.players(false).unwrap();
    let money = game.money();
    println!("money {money:?} via {:?}", game.money_block());
    let money = money.expect("the display currency is read on this build");
    assert_eq!(
        (money.currency.code.as_str(), money.wage_period),
        ("EUR", fm_reader::WagePeriod::Month)
    );
    assert_eq!(money.shown_wage(157_249.0), 793_232.0);
}
