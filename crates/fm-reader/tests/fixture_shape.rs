use std::path::Path;

use fm_reader::fm::record::{Snapshot, READER_ONLY_FIELDS};
use serde_json::Value;

fn without_reader_only_fields(mut player: Value) -> Value {
    if let Some(fields) = player.as_object_mut() {
        for key in READER_ONLY_FIELDS {
            fields.remove(key);
        }
    }
    player
}

#[test]
fn snapshot_fixture_deserializes() {
    let path = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../.dev-data/snapshots/2026-11-11-raw-competitive.json");
    let Ok(text) = std::fs::read_to_string(&path) else {
        eprintln!("skipped: fixture {} not found", path.display());
        return;
    };
    let raw: Value = serde_json::from_str(&text).unwrap();
    let snap: Snapshot = serde_json::from_str(&text).unwrap();
    assert_eq!(
        without_reader_only_fields(serde_json::to_value(&snap.players[0]).unwrap()),
        raw["players"][0]
    );
    let mut round_trip = serde_json::to_value(&snap).unwrap();
    if let Some(players) = round_trip["players"].as_array_mut() {
        for p in players.iter_mut() {
            *p = without_reader_only_fields(p.take());
        }
    }
    assert_eq!(round_trip, raw, "every player and the header round-trip");
}
