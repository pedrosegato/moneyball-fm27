use std::collections::BTreeMap;

use serde_json::Value;

const FLOAT_TOLERANCE: f64 = 1e-9;
pub const MAX_PRINTED: usize = 20;

struct Players<'a> {
    by_uid: BTreeMap<u64, &'a Value>,
    without_uid: usize,
    duplicates: Vec<u64>,
    len: usize,
}

fn players_by_uid(snapshot: &Value) -> Players<'_> {
    let entries = snapshot
        .get("players")
        .and_then(Value::as_array)
        .map(Vec::as_slice)
        .unwrap_or_default();
    let mut out = Players {
        by_uid: BTreeMap::new(),
        without_uid: 0,
        duplicates: Vec::new(),
        len: entries.len(),
    };
    for p in entries {
        match p.get("uid").and_then(Value::as_u64) {
            None => out.without_uid += 1,
            Some(uid) => {
                if out.by_uid.insert(uid, p).is_some() {
                    out.duplicates.push(uid);
                }
            }
        }
    }
    out
}

fn numbers_match(a: &serde_json::Number, b: &serde_json::Number) -> bool {
    match (a.as_i64(), b.as_i64(), a.as_u64(), b.as_u64()) {
        (Some(x), Some(y), _, _) => x == y,
        (_, _, Some(x), Some(y)) => x == y,
        _ if a.is_f64() && b.is_f64() => {
            (a.as_f64().unwrap() - b.as_f64().unwrap()).abs() <= FLOAT_TOLERANCE
        }
        _ => false,
    }
}

fn compare(path: &str, a: &Value, b: &Value, out: &mut Vec<String>) {
    match (a, b) {
        (Value::Object(x), Value::Object(y)) => {
            for (key, va) in x {
                match y.get(key) {
                    Some(vb) => compare(&format!("{path}.{key}"), va, vb, out),
                    None => out.push(format!("{path}.{key}: only in A")),
                }
            }
            for key in y.keys().filter(|k| !x.contains_key(*k)) {
                out.push(format!("{path}.{key}: only in B"));
            }
        }
        (Value::Array(x), Value::Array(y)) => {
            if x.len() != y.len() {
                out.push(format!("{path}: length {} != {}", x.len(), y.len()));
            }
            for (i, (va, vb)) in x.iter().zip(y).enumerate() {
                compare(&format!("{path}[{i}]"), va, vb, out);
            }
        }
        (Value::Number(x), Value::Number(y)) if numbers_match(x, y) => {}
        _ if a == b && !a.is_number() => {}
        _ => out.push(format!("{path}: {a} != {b}")),
    }
}

fn without_fields<'a>(player: &'a Value, ignore: &[String]) -> std::borrow::Cow<'a, Value> {
    match player.as_object() {
        Some(fields) if ignore.iter().any(|k| fields.contains_key(k)) => {
            let mut kept = fields.clone();
            kept.retain(|k, _| !ignore.contains(k));
            std::borrow::Cow::Owned(Value::Object(kept))
        }
        _ => std::borrow::Cow::Borrowed(player),
    }
}

pub fn diff_snapshots(a: &Value, b: &Value, ignore: &[String]) -> Vec<String> {
    let mut out = Vec::new();
    for key in ["build", "scope", "date", "my_clubs"] {
        compare(
            key,
            a.get(key).unwrap_or(&Value::Null),
            b.get(key).unwrap_or(&Value::Null),
            &mut out,
        );
    }
    let (pa, pb) = (players_by_uid(a), players_by_uid(b));
    if pa.len != pb.len {
        out.push(format!("players: length {} != {}", pa.len, pb.len));
    }
    for (side, p) in [("A", &pa), ("B", &pb)] {
        if p.without_uid > 0 {
            out.push(format!(
                "players: {side} has {} entries without a usable uid",
                p.without_uid
            ));
        }
        for uid in &p.duplicates {
            out.push(format!("players: duplicate uid {uid} in {side}"));
        }
    }
    for (uid, va) in &pa.by_uid {
        match pb.by_uid.get(uid) {
            Some(vb) => compare(
                &format!("players[uid={uid}]"),
                &without_fields(va, ignore),
                &without_fields(vb, ignore),
                &mut out,
            ),
            None => out.push(format!("players[uid={uid}]: only in A")),
        }
    }
    for uid in pb.by_uid.keys().filter(|u| !pa.by_uid.contains_key(*u)) {
        out.push(format!("players[uid={uid}]: only in B"));
    }
    out
}
