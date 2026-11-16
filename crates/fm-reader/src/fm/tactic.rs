use std::collections::HashMap;

use serde::{Deserialize, Serialize};

pub const PREPARED_TACTICS_CLASS: &str = ".?AVPREPARED_TACTICS_CREATOR_ARRAY@simatch@@";
pub const ARRAY_SIZE: usize = 0x84;
pub const TACTIC_SIZE: usize = 0x7A8;
pub const LINEUP_LEN: usize = 23;
pub const STARTERS: usize = 11;

const MARKER: u32 = 0x1B00_0100;
const MARKER_OFFSETS: [usize; 4] = [0xF0, 0x430, 0x750, 0x798];
const IP_SLOTS: usize = 0x118;
const OOP_SLOTS: usize = 0x438;
const SLOT_STRIDE: usize = 0x48;
const ROLE_MASK: usize = 0x40;
const OOP_MAP: usize = 0x79C;
const NAME_POINTER: usize = 0x778;
const STYLE_POINTER: usize = 0xF8;
const LIST_START: usize = 0x08;
const LIST_END: usize = 0x10;
const LINEUP_AT: usize = 0x28;

const POSITION_BITS: u32 = 0x7FFF;
const SIDE_LEFT: u32 = 0x10_0000;
const SIDE_RIGHT: u32 = 0x20_0000;
const DUTY_BITS: u64 = 0xE0_0000;
const POSITIONS: [&str; 15] = [
    "GK", "SW", "DR", "DL", "DC", "WBR", "WBL", "DM", "MR", "ML", "MC", "AMR", "AML", "AMC", "ST",
];

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Side {
    L,
    C,
    R,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TacticSlot {
    pub position: String,
    pub side: Side,
    pub role_id: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LineupSlot {
    pub ip: TacticSlot,
    pub oop: TacticSlot,
    pub player_id: Option<u32>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Tactic {
    pub name: String,
    pub style: Option<String>,
    pub slots: Vec<LineupSlot>,
    pub subs: Vec<u32>,
}

fn u32_at(b: &[u8], off: usize) -> Option<u32> {
    Some(u32::from_le_bytes(b.get(off..off + 4)?.try_into().ok()?))
}

fn u64_at(b: &[u8], off: usize) -> Option<u64> {
    Some(u64::from_le_bytes(b.get(off..off + 8)?.try_into().ok()?))
}

fn side_of_position(position: &str) -> Side {
    match position {
        "DR" | "WBR" | "MR" | "AMR" => Side::R,
        "DL" | "WBL" | "ML" | "AML" => Side::L,
        _ => Side::C,
    }
}

fn decode_slot(tactic: &[u8], at: usize, prefix: &str) -> Option<TacticSlot> {
    let mask = u32_at(tactic, at)?;
    let position_bits = mask & POSITION_BITS;
    if position_bits.count_ones() != 1 {
        return None;
    }
    let position = POSITIONS[position_bits.trailing_zeros() as usize];
    let side = match (mask & SIDE_LEFT != 0, mask & SIDE_RIGHT != 0) {
        (true, true) => return None,
        (true, false) => Side::L,
        (false, true) => Side::R,
        (false, false) => side_of_position(position),
    };
    let role_bits = u64_at(tactic, at + ROLE_MASK)? & !DUTY_BITS;
    if role_bits.count_ones() != 1 {
        return None;
    }
    Some(TacticSlot {
        position: position.to_string(),
        side,
        role_id: format!("{prefix}:{}", role_bits.trailing_zeros()),
    })
}

pub fn decode_slots(tactic: &[u8]) -> Option<Vec<(TacticSlot, TacticSlot)>> {
    if tactic.len() < TACTIC_SIZE {
        return None;
    }
    if MARKER_OFFSETS
        .iter()
        .any(|&at| u32_at(tactic, at) != Some(MARKER))
    {
        return None;
    }
    let oop = (0..STARTERS)
        .map(|j| decode_slot(tactic, OOP_SLOTS + SLOT_STRIDE * j, "oop"))
        .collect::<Option<Vec<_>>>()?;
    let mut used = [false; STARTERS];
    (0..STARTERS)
        .map(|i| {
            let ip = decode_slot(tactic, IP_SLOTS + SLOT_STRIDE * i, "ip")?;
            let j = usize::from(tactic[OOP_MAP + i]);
            if std::mem::replace(used.get_mut(j)?, true) {
                return None;
            }
            Some((ip, oop[j].clone()))
        })
        .collect()
}

pub fn text_pointers(tactic: &[u8]) -> (u64, u64) {
    (
        u64_at(tactic, NAME_POINTER).unwrap_or(0),
        u64_at(tactic, STYLE_POINTER).unwrap_or(0),
    )
}

pub fn tactic_list(array: &[u8]) -> Option<u64> {
    let start = u64_at(array, LIST_START)?;
    let end = u64_at(array, LIST_END)?;
    (start != 0 && end > start).then_some(start)
}

pub fn lineup(array: &[u8]) -> Vec<Option<u32>> {
    (0..LINEUP_LEN)
        .map(|i| {
            let raw = u32_at(array, LINEUP_AT + 4 * i)?;
            u32::try_from(raw as i32).ok()
        })
        .collect()
}

pub fn squad_players(lineup: &[Option<u32>], squad: &HashMap<u32, u32>) -> usize {
    lineup
        .iter()
        .flatten()
        .filter(|id| squad.contains_key(id))
        .count()
}

pub fn is_squad_lineup(lineup: &[Option<u32>], squad: &HashMap<u32, u32>) -> bool {
    let present = lineup.iter().flatten().count();
    present > 0 && 2 * squad_players(lineup, squad) > present
}

pub fn assemble(
    name: String,
    style: Option<String>,
    pairs: Vec<(TacticSlot, TacticSlot)>,
    lineup: &[Option<u32>],
    squad: &HashMap<u32, u32>,
) -> Tactic {
    let uid_at = |i: usize| {
        lineup
            .get(i)
            .copied()
            .flatten()
            .and_then(|id| squad.get(&id).copied())
    };
    let slots = pairs
        .into_iter()
        .enumerate()
        .map(|(i, (ip, oop))| LineupSlot {
            ip,
            oop,
            player_id: uid_at(i),
        })
        .collect();
    let subs = (STARTERS..lineup.len()).filter_map(uid_at).collect();
    Tactic {
        name,
        style,
        slots,
        subs,
    }
}

#[cfg(test)]
pub(crate) mod fixture {
    use super::*;

    const GK: u32 = 1 << 0;
    const DR: u32 = 1 << 2;
    const DL: u32 = 1 << 3;
    const DC: u32 = 1 << 4;
    const DM: u32 = 1 << 7;
    const MR: u32 = 1 << 8;
    const ML: u32 = 1 << 9;
    const MC: u32 = 1 << 10;
    const AMR: u32 = 1 << 11;
    const AML: u32 = 1 << 12;
    const ST: u32 = 1 << 14;
    const D: u64 = 0x20_0000;
    const S: u64 = 0x40_0000;
    const A: u64 = 0x80_0000;
    const L: u32 = SIDE_LEFT;
    const R: u32 = SIDE_RIGHT;

    const IP: [(u32, u64, u8); 11] = [
        (GK, 1 << 53 | D, 0),
        (DR, 1 << 2 | S, 1),
        (DC | R, 1 << 1 | D, 2),
        (DC | L, 1 << 1 | D, 3),
        (DL, 1 << 2 | S, 4),
        (AML, 1 << 7 | A, 8),
        (MC | R, 1 << 5 | S, 6),
        (MC | L, 1 << 17 | S, 10),
        (MC, 1 << 9 | A, 7),
        (AMR, 1 << 7 | A, 5),
        (ST, 1 << 11 | A, 9),
    ];

    const OOP: [(u32, u64); 11] = [
        (GK, 1 << 0 | D),
        (DR, 1 << 9 | D),
        (DC | R, 1 << 3 | D),
        (DC | L, 1 << 3 | D),
        (DL, 1 << 9 | D),
        (MR, 1 << 37 | S),
        (DM, 1 << 15 | D),
        (MC | L, 1 << 27 | S),
        (ML, 1 << 37 | S),
        (ST, 1 << 44 | A),
        (MC | R, 1 << 28 | D),
    ];

    fn put_slot(b: &mut [u8], at: usize, position: u32, role: u64) {
        b[at..at + 4].copy_from_slice(&position.to_le_bytes());
        b[at + ROLE_MASK..at + ROLE_MASK + 8].copy_from_slice(&role.to_le_bytes());
    }

    pub fn sample_433() -> Vec<u8> {
        let mut b = vec![0u8; TACTIC_SIZE];
        for at in MARKER_OFFSETS {
            b[at..at + 4].copy_from_slice(&MARKER.to_le_bytes());
        }
        for (i, &(position, role, oop)) in IP.iter().enumerate() {
            put_slot(&mut b, IP_SLOTS + SLOT_STRIDE * i, position, role);
            b[OOP_MAP + i] = oop;
        }
        for (j, &(position, role)) in OOP.iter().enumerate() {
            put_slot(&mut b, OOP_SLOTS + SLOT_STRIDE * j, position, role);
        }
        b
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn row((ip, oop): &(TacticSlot, TacticSlot)) -> String {
        format!(
            "{} {:?} {} | {} {:?} {}",
            ip.position, ip.side, ip.role_id, oop.position, oop.side, oop.role_id
        )
    }

    #[test]
    fn decodes_the_sample_433() {
        let rows: Vec<String> = decode_slots(&fixture::sample_433())
            .unwrap()
            .iter()
            .map(row)
            .collect();
        assert_eq!(
            rows,
            [
                "GK C ip:53 | GK C oop:0",
                "DR R ip:2 | DR R oop:9",
                "DC R ip:1 | DC R oop:3",
                "DC L ip:1 | DC L oop:3",
                "DL L ip:2 | DL L oop:9",
                "AML L ip:7 | ML L oop:37",
                "MC R ip:5 | DM C oop:15",
                "MC L ip:17 | MC R oop:28",
                "MC C ip:9 | MC L oop:27",
                "AMR R ip:7 | MR R oop:37",
                "ST C ip:11 | ST C oop:44",
            ]
        );
    }

    #[test]
    fn an_object_without_all_four_markers_is_not_a_tactic() {
        for at in [0xF0, 0x430, 0x750, 0x798] {
            let mut b = fixture::sample_433();
            b[at] ^= 1;
            assert_eq!(decode_slots(&b), None, "{at:#x}");
        }
        assert_eq!(
            decode_slots(&fixture::sample_433()[..TACTIC_SIZE - 1]),
            None
        );
    }

    #[test]
    fn a_slot_that_is_not_one_position_and_one_role_rejects_the_whole_object() {
        let ip3 = 0x118 + 0x48 * 3;
        let oop9 = 0x438 + 0x48 * 9;
        let cases: [(usize, Vec<u8>); 7] = [
            (ip3, 0u32.to_le_bytes().to_vec()),
            (ip3, ((1u32 << 4) | (1 << 10)).to_le_bytes().to_vec()),
            (ip3 + 0x40, 0x20_0000u64.to_le_bytes().to_vec()),
            (ip3 + 0x40, ((1u64 << 1) | (1 << 24)).to_le_bytes().to_vec()),
            (oop9, ((1u32 << 14) | 0x30_0000).to_le_bytes().to_vec()),
            (0x79C + 5, vec![11]),
            (0x79C + 5, vec![0]),
        ];
        for (at, bytes) in cases {
            let mut b = fixture::sample_433();
            b[at..at + bytes.len()].copy_from_slice(&bytes);
            assert_eq!(decode_slots(&b), None, "{at:#x} {bytes:?}");
        }
    }

    #[test]
    fn lineup_reads_23_ids_and_a_negative_id_is_an_empty_place() {
        let mut array = vec![0u8; ARRAY_SIZE];
        for i in 0..LINEUP_LEN {
            let id: i32 = if i == 4 { -1 } else { 500 + i as i32 };
            array[0x28 + 4 * i..0x2C + 4 * i].copy_from_slice(&id.to_le_bytes());
        }
        let ids = lineup(&array);
        assert_eq!(ids.len(), 23);
        assert_eq!((ids[0], ids[4], ids[22]), (Some(500), None, Some(522)));
    }

    fn squad() -> HashMap<u32, u32> {
        (500..523).map(|id| (id, id + 500)).collect()
    }

    fn ids(v: &[i64]) -> Vec<Option<u32>> {
        v.iter().map(|&i| u32::try_from(i).ok()).collect()
    }

    #[test]
    fn a_lineup_belongs_to_the_squad_when_most_of_its_players_do() {
        assert_eq!(squad_players(&ids(&[500, 501, 900, -1]), &squad()), 2);
        assert!(is_squad_lineup(&ids(&[500, 501, 900, -1]), &squad()));
        assert!(!is_squad_lineup(&ids(&[500, 900]), &squad()));
        assert!(!is_squad_lineup(&ids(&[900, 901, 902]), &squad()));
        assert!(!is_squad_lineup(&ids(&[-1; 23]), &squad()));
    }

    #[test]
    fn assemble_maps_game_ids_to_uids_and_leaves_gaps_empty() {
        let mut l: Vec<Option<u32>> = (500..523).map(Some).collect();
        l[3] = None;
        l[5] = Some(999);
        l[15] = None;
        l[16] = Some(998);
        let pairs = decode_slots(&fixture::sample_433()).unwrap();
        let t = assemble("T".into(), None, pairs, &l, &squad());
        assert_eq!(t.slots.len(), 11);
        let players: Vec<Option<u32>> = t.slots.iter().map(|s| s.player_id).collect();
        assert_eq!(
            &players[..6],
            [Some(1000), Some(1001), Some(1002), None, Some(1004), None]
        );
        assert_eq!(
            t.subs,
            [1011, 1012, 1013, 1014, 1017, 1018, 1019, 1020, 1021, 1022]
        );
    }

    #[test]
    fn a_tactic_serializes_in_the_shape_the_app_reads() {
        let dc = |side, role: &str| TacticSlot {
            position: "DC".into(),
            side,
            role_id: role.into(),
        };
        let t = Tactic {
            name: "4-3-3".into(),
            style: None,
            slots: vec![LineupSlot {
                ip: dc(Side::L, "ip:1"),
                oop: dc(Side::R, "oop:3"),
                player_id: None,
            }],
            subs: vec![1011],
        };
        assert_eq!(
            serde_json::to_value(&t).unwrap(),
            serde_json::json!({
                "name": "4-3-3",
                "style": null,
                "slots": [{
                    "ip": {"position": "DC", "side": "L", "roleId": "ip:1"},
                    "oop": {"position": "DC", "side": "R", "roleId": "oop:3"},
                    "playerId": null
                }],
                "subs": [1011]
            })
        );
    }

    #[test]
    fn a_snapshot_without_a_tactic_leaves_the_key_out() {
        let snapshot = crate::fm::Snapshot {
            build: "6AE8CF77-17969000".into(),
            scope: crate::fm::Scope::Competitive,
            date: None,
            my_clubs: vec![],
            seconds: 0.0,
            money: None,
            tactic: None,
            players: vec![],
        };
        assert!(serde_json::to_value(&snapshot)
            .unwrap()
            .get("tactic")
            .is_none());
    }
}
