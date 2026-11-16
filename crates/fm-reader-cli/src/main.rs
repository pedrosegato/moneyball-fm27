mod diff;
#[cfg_attr(not(windows), allow(dead_code))]
mod probe;

use std::path::PathBuf;
use std::process::ExitCode;

use clap::{Parser, Subcommand};
use serde_json::Value;

#[derive(Parser)]
#[command(
    name = "fm-reader-cli",
    about = "Read-only dev tools for the FM27 memory reader"
)]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    Dump {
        #[arg(long, default_value = "competitive")]
        scope: String,
        #[arg(long)]
        all: bool,
        #[arg(long)]
        out: PathBuf,
    },
    Diff {
        a: PathBuf,
        b: PathBuf,
        #[arg(long)]
        ignore: Vec<String>,
    },
    Classes {
        #[arg(required = true)]
        patterns: Vec<String>,
    },
    ProbeClub {
        #[arg(long)]
        uid: u32,
    },
    Money {
        #[arg(long = "player")]
        players: Vec<String>,
    },
}

fn load(path: &PathBuf) -> Result<Value, String> {
    let text = std::fs::read_to_string(path).map_err(|e| format!("{}: {e}", path.display()))?;
    serde_json::from_str(&text).map_err(|e| format!("{}: {e}", path.display()))
}

fn run_diff(a: &PathBuf, b: &PathBuf, ignore: &[String]) -> Result<ExitCode, String> {
    let differences = diff::diff_snapshots(&load(a)?, &load(b)?, ignore);
    for line in differences.iter().take(diff::MAX_PRINTED) {
        println!("{line}");
    }
    println!("{} differences", differences.len());
    Ok(if differences.is_empty() {
        ExitCode::SUCCESS
    } else {
        ExitCode::from(1)
    })
}

#[cfg(windows)]
mod live_commands {
    use std::path::Path;
    use std::process::ExitCode;
    use std::time::Instant;

    use fm_reader::build::{engine_build, writable_sections};
    use fm_reader::fm::money::find_block;
    use fm_reader::rtti::{class_name, module_image};
    use fm_reader::{sanity, Game, LiveProcess, MemoryExt, Scope, Snapshot};

    use crate::probe::field_lines;

    fn attach_process() -> Result<LiveProcess, String> {
        LiveProcess::attach("fm.exe").map_err(|e| e.to_string())
    }

    pub fn dump(scope: &str, all: bool, out: &Path) -> Result<ExitCode, String> {
        let scope: Scope = scope
            .parse()
            .map_err(|e: fm_reader::ReaderError| e.to_string())?;
        let t0 = Instant::now();
        let mut game = Game::attach(Box::new(attach_process()?)).map_err(|e| e.to_string())?;
        let (date, players) = game
            .read_all(scope, !all, |_, _| {})
            .map_err(|e| e.to_string())?;
        let my_clubs = game.my_clubs().map_err(|e| e.to_string())?;
        let money = game.money();
        let tactic = game.tactic();
        let seconds = (t0.elapsed().as_secs_f64() * 100.0).round() / 100.0;
        for warning in sanity::check(&players, &game.build_id()) {
            eprintln!("sanity: {warning}");
        }
        let snapshot = Snapshot {
            build: game.build_id(),
            scope,
            date,
            my_clubs,
            seconds,
            money,
            tactic,
            players,
        };
        let file = std::fs::File::create(out).map_err(|e| format!("{}: {e}", out.display()))?;
        serde_json::to_writer(std::io::BufWriter::new(file), &snapshot)
            .map_err(|e| e.to_string())?;
        println!(
            "{} players, {seconds}s, date {}, build {}",
            snapshot.players.len(),
            snapshot
                .date
                .map(|d| d.to_string())
                .unwrap_or_else(|| "null".into()),
            snapshot.build
        );
        println!(
            "tactic {}",
            snapshot.tactic.as_ref().map_or("null", |t| t.name.as_str())
        );
        Ok(ExitCode::SUCCESS)
    }

    fn is_name_byte(b: u8) -> bool {
        b.is_ascii_alphanumeric() || matches!(b, b'_' | b'@' | b'?' | b'$')
    }

    fn rtti_names(image: &[u8]) -> Vec<String> {
        const PREFIX: &[u8] = b".?AV";
        let mut names = std::collections::BTreeSet::new();
        for at in memchr::memmem::find_iter(image, PREFIX) {
            let body = &image[at + PREFIX.len()..];
            let run = body
                .iter()
                .take(120)
                .take_while(|&&b| is_name_byte(b))
                .count();
            if let Some(end) = body[..run]
                .windows(2)
                .rposition(|w| w == b"@@")
                .filter(|&e| e >= 2)
            {
                let name = &image[at..at + PREFIX.len() + end + 2];
                names.insert(String::from_utf8_lossy(name).into_owned());
            }
        }
        names.into_iter().collect()
    }

    pub fn classes(patterns: &[String]) -> Result<ExitCode, String> {
        let process = attach_process()?;
        let build = engine_build(&process).map_err(|e| e.to_string())?;
        let image = module_image(&process, &build.module);
        let wanted: Vec<String> = patterns.iter().map(|p| p.to_uppercase()).collect();
        for name in rtti_names(&image) {
            let upper = name.to_uppercase();
            if wanted.iter().any(|p| upper.contains(p)) {
                println!("{name}");
            }
        }
        Ok(ExitCode::SUCCESS)
    }

    const CLUB_SIZE: usize = 0x170;
    const OBJECT_SIZES: [usize; 3] = [0x900, 0x400, 0x100];
    const USER_SPACE: std::ops::Range<u64> = 0x10000..0x7FFF_FFFF_FFFF;

    pub fn probe_club(uid: u32) -> Result<ExitCode, String> {
        let mut game = Game::attach(Box::new(attach_process()?)).map_err(|e| e.to_string())?;
        let club = game
            .club_by_uid(uid)
            .ok_or_else(|| format!("no club with uid {uid}"))?;
        let finances = game.club_finances(uid);
        let mem = game.memory();
        let base = game.build().module.base;
        let readable = |q: u64| USER_SPACE.contains(&q) && mem.u8(q).is_some();
        let class_of = |q: u64| {
            let vt = USER_SPACE.contains(&q).then(|| mem.u64(q)).flatten()?;
            class_name(mem, base, vt)
        };
        let describe = |q: u64| class_of(q).or_else(|| readable(q).then(|| "ptr".to_string()));
        let bytes = mem.read(club, CLUB_SIZE).ok_or("club unreadable")?;
        println!(
            "club uid {uid} at 0x{club:X} {}",
            class_of(club).unwrap_or_default()
        );
        for line in field_lines(&bytes, describe) {
            println!("  {line}");
        }
        let mut seen = std::collections::HashSet::from([club]);
        for (i, &word) in bytes.as_chunks::<8>().0.iter().enumerate() {
            let target = u64::from_le_bytes(word);
            if !seen.insert(target) {
                continue;
            }
            let Some(class) = class_of(target) else {
                continue;
            };
            let Some(object) = OBJECT_SIZES.iter().find_map(|&n| mem.read(target, n)) else {
                continue;
            };
            println!(
                "club+0x{:03X} -> 0x{target:X} {class} ({} bytes)",
                i * 8,
                object.len()
            );
            for line in field_lines(&object, describe) {
                println!("  {line}");
            }
        }
        println!("club_finances: {finances:?}");
        Ok(ExitCode::SUCCESS)
    }

    pub fn money(players: &[String]) -> Result<ExitCode, String> {
        let mut game = Game::attach(Box::new(attach_process()?)).map_err(|e| e.to_string())?;
        let base = game.build().module.base;
        let t0 = Instant::now();
        let before_scan = game.money();
        println!(
            "before the scan ({:.2?}): {before_scan:?} via {:?}",
            t0.elapsed(),
            game.money_block()
                .map(|b| (b.found_by, format!("rva 0x{:X}", b.address - base)))
        );
        let (_, rows) = game
            .read_all(Scope::Competitive, false, |_, _| {})
            .map_err(|e| e.to_string())?;
        let t1 = Instant::now();
        let money = game.money();
        let block = game.money_block();
        println!(
            "after the scan ({:.2?}): via {:?}",
            t1.elapsed(),
            block.map(|b| (b.found_by, format!("rva 0x{:X}", b.address - base)))
        );
        println!(
            "{}",
            serde_json::to_string(&money).map_err(|e| e.to_string())?
        );
        if let Some(sig) = game.currency_signature() {
            let sections = writable_sections(game.memory(), &game.build().module);
            let t2 = Instant::now();
            let found = find_block(game.memory(), &sections, &sig);
            let bytes: u64 = sections.iter().map(|s| s.size).sum();
            println!(
                "content search over {} writable sections ({bytes} bytes): {:?} in {:.2?}",
                sections.len(),
                found.map(|a| format!("rva 0x{:X}", a - base)),
                t2.elapsed()
            );
        }
        let Some(money) = money else {
            return Ok(ExitCode::from(1));
        };
        for name in players {
            for r in rows.iter().filter(|r| r.name == *name) {
                let wage = r.wage.map(|w| (w, money.shown_wage(f64::from(w))));
                println!(
                    "{} ({}): value £{} -> {} {}, wage {:?} (£/week -> {} per {:?})",
                    r.name,
                    r.club.as_deref().unwrap_or("-"),
                    r.value,
                    money.shown(f64::from(r.value)),
                    money.currency.code,
                    wage,
                    money.currency.code,
                    money.wage_period
                );
            }
        }
        Ok(ExitCode::SUCCESS)
    }
}

#[cfg(not(windows))]
mod live_commands {
    use std::path::Path;
    use std::process::ExitCode;

    fn windows_only() -> Result<ExitCode, String> {
        eprintln!("Windows only");
        Ok(ExitCode::from(2))
    }

    pub fn dump(_: &str, _: bool, _: &Path) -> Result<ExitCode, String> {
        windows_only()
    }

    pub fn classes(_: &[String]) -> Result<ExitCode, String> {
        windows_only()
    }

    pub fn probe_club(_: u32) -> Result<ExitCode, String> {
        windows_only()
    }

    pub fn money(_: &[String]) -> Result<ExitCode, String> {
        windows_only()
    }
}

fn main() -> ExitCode {
    let result = match Cli::parse().command {
        Command::Dump { scope, all, out } => live_commands::dump(&scope, all, &out),
        Command::Diff { a, b, ignore } => run_diff(&a, &b, &ignore),
        Command::Classes { patterns } => live_commands::classes(&patterns),
        Command::ProbeClub { uid } => live_commands::probe_club(uid),
        Command::Money { players } => live_commands::money(&players),
    };
    result.unwrap_or_else(|e| {
        eprintln!("error: {e}");
        ExitCode::from(2)
    })
}
