use std::path::PathBuf;
use std::process::{Command, Output};

fn snapshot(minutes: i64, seconds: f64) -> String {
    format!(
        r#"{{"build":"B","scope":"competitive","date":"2026-10-30","my_clubs":[],"seconds":{seconds},"players":[{{"uid":123,"name":"A","xg":0.1,"season":{{"minutes":{minutes}}}}}]}}"#
    )
}

fn write(name: &str, body: &str) -> PathBuf {
    let dir = std::env::temp_dir().join(format!("fm-reader-cli-diff-{}", std::process::id()));
    std::fs::create_dir_all(&dir).unwrap();
    let path = dir.join(name);
    std::fs::write(&path, body).unwrap();
    path
}

fn diff(a: &PathBuf, b: &PathBuf) -> Output {
    Command::new(env!("CARGO_BIN_EXE_fm-reader-cli"))
        .arg("diff")
        .arg(a)
        .arg(b)
        .output()
        .unwrap()
}

#[test]
fn diff_identical_is_zero() {
    let a = write("same-a.json", &snapshot(10, 17.5));
    let b = write("same-b.json", &snapshot(10, 11.5));
    let out = diff(&a, &b);
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stdout)
    );
    assert!(String::from_utf8_lossy(&out.stdout).contains("0 differences"));
}

#[test]
fn diff_reports_changed_minutes_path() {
    let a = write("min-a.json", &snapshot(10, 1.0));
    let b = write("min-b.json", &snapshot(11, 1.0));
    let out = diff(&a, &b);
    assert_eq!(out.status.code(), Some(1));
    let text = String::from_utf8_lossy(&out.stdout);
    assert!(
        text.contains("players[uid=123].season.minutes: 10 != 11"),
        "{text}"
    );
    assert!(text.contains("1 differences"), "{text}");
}

#[test]
fn diff_reports_missing_and_extra_uids_and_tolerates_float_noise() {
    let a = write(
        "uid-a.json",
        r#"{"seconds":1,"players":[{"uid":1,"x":0.1},{"uid":2,"x":1}]}"#,
    );
    let b = write(
        "uid-b.json",
        r#"{"seconds":9,"players":[{"uid":1,"x":0.1000000000001},{"uid":3,"x":1}]}"#,
    );
    let out = diff(&a, &b);
    let text = String::from_utf8_lossy(&out.stdout);
    assert_eq!(out.status.code(), Some(1), "{text}");
    assert!(text.contains("players[uid=2]: only in A"), "{text}");
    assert!(text.contains("players[uid=3]: only in B"), "{text}");
    assert!(!text.contains("uid=1"), "{text}");
    assert!(text.contains("2 differences"), "{text}");
}

#[test]
fn diff_treats_int_and_float_of_same_value_as_different_only_beyond_tolerance() {
    let a = write("num-a.json", r#"{"players":[{"uid":1,"x":5,"y":1.5}]}"#);
    let b = write("num-b.json", r#"{"players":[{"uid":1,"x":6,"y":1.5}]}"#);
    let text = String::from_utf8_lossy(&diff(&a, &b).stdout).to_string();
    assert!(text.contains("players[uid=1].x: 5 != 6"), "{text}");
    assert!(text.contains("1 differences"), "{text}");
}

#[test]
fn diff_flags_players_without_a_usable_uid() {
    let a = write(
        "nouid-a.json",
        r#"{"players":[{"uid":1},{"name":"x"},{"uid":-3},{"uid":1.5}]}"#,
    );
    let b = write("nouid-b.json", r#"{"players":[{"uid":1}]}"#);
    let out = diff(&a, &b);
    let text = String::from_utf8_lossy(&out.stdout);
    assert_eq!(out.status.code(), Some(1), "{text}");
    assert!(
        text.contains("players: A has 3 entries without a usable uid"),
        "{text}"
    );
    assert!(text.contains("players: length 4 != 1"), "{text}");
}

#[test]
fn diff_flags_duplicate_uids() {
    let a = write(
        "dup-a.json",
        r#"{"players":[{"uid":123,"x":1},{"uid":123,"x":1}]}"#,
    );
    let b = write("dup-b.json", r#"{"players":[{"uid":123,"x":1}]}"#);
    let out = diff(&a, &b);
    let text = String::from_utf8_lossy(&out.stdout);
    assert_eq!(out.status.code(), Some(1), "{text}");
    assert!(text.contains("players: duplicate uid 123 in A"), "{text}");
}

#[test]
fn diff_unreadable_file_exits_2() {
    let a = write("err-a.json", "{}");
    let out = diff(&a, &PathBuf::from("/nonexistent/x.json"));
    assert_eq!(out.status.code(), Some(2));
}

#[test]
fn diff_ignores_the_named_player_fields_only() {
    let a = write(
        "ign-a.json",
        r#"{"players":[{"uid":1,"x":1,"competition_reputation":146,"y":2}]}"#,
    );
    let b = write("ign-b.json", r#"{"players":[{"uid":1,"x":1,"y":3}]}"#);
    let plain = String::from_utf8_lossy(&diff(&a, &b).stdout).to_string();
    assert!(
        plain.contains("players[uid=1].competition_reputation: only in A"),
        "{plain}"
    );

    let out = Command::new(env!("CARGO_BIN_EXE_fm-reader-cli"))
        .args(["diff", "--ignore", "competition_reputation"])
        .arg(&a)
        .arg(&b)
        .output()
        .unwrap();
    let text = String::from_utf8_lossy(&out.stdout);
    assert!(!text.contains("competition_reputation"), "{text}");
    assert!(text.contains("players[uid=1].y: 2 != 3"), "{text}");
    assert!(text.contains("1 differences"), "{text}");
}
