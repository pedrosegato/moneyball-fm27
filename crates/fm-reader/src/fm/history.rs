use std::collections::BTreeMap;
use std::path::PathBuf;

use super::profile::{Scope, Width, RECORD, RECORD_SIZE};
use super::record::{PastSeason, Record, Season};

pub const MANAGER_CONTAINER: u64 = 0x20;
pub const CONTAINER_LIST: u64 = 0x08;
pub const STORE_INDEX_BEGIN: u64 = 0x78;
pub const STORE_INDEX_END: u64 = 0x80;
pub const STORE_ROW_SIZE: u64 = 0x9C;
pub const STORE_VERSION: u64 = 0xA0;
pub const INDEX_STRIDE: usize = 0x18;
pub const P_HISTORY_KEY: i64 = 0xEC;
pub const FILE_HEADER: usize = 8;
pub const ROW_SIZE: usize = 168;
pub const ROW_VERSION: u32 = 7;
pub const MAX_ROWS_PER_PLAYER: usize = 1024;
pub const MAX_KEYS: usize = 1 << 20;

const ROW_CLUB: usize = 0x01;
const ROW_YEAR: usize = 0x0B;
const NO_CLUB: u32 = u32::MAX;
const LEAGUE: u8 = 1;
const ROW_COMPETITION: usize = 0x1F;
const ROW_RECORD: usize = 0x20;

const ROW_ENTRY: [(usize, Width); 14] = [
    (0x0D, Width::U16),
    (0x0F, Width::U16),
    (0x18, Width::U8),
    (0x19, Width::U8),
    (0x1A, Width::U8),
    (0x1B, Width::U8),
    (0x1C, Width::U8),
    (0x11, Width::U8),
    (0x12, Width::U8),
    (0x13, Width::U8),
    (0x1D, Width::U8),
    (0x14, Width::U8),
    (0x15, Width::U8),
    (0x16, Width::U8),
];

pub struct HistoryStore {
    pub items: Vec<(u64, u64)>,
    pub file: Vec<u8>,
}

impl HistoryStore {
    pub fn rows<'a>(&'a self, offsets: &'a [u32]) -> impl Iterator<Item = &'a [u8]> + 'a {
        offsets.iter().filter_map(|&off| {
            let start = FILE_HEADER + off as usize;
            self.file.get(start..start + ROW_SIZE)
        })
    }
}

pub fn history_file() -> Option<PathBuf> {
    std::env::var_os("LOCALAPPDATA").map(|root| {
        PathBuf::from(root)
            .join("Sports Interactive")
            .join("Football Manager 27")
            .join("Temporary")
            .join("player_stats_hist_dt.cmt")
    })
}

pub fn index_items(bytes: &[u8]) -> Vec<(u64, u64)> {
    bytes
        .chunks_exact(INDEX_STRIDE)
        .map(|item| (le_u64(&item[0..8]), le_u64(&item[8..16])))
        .collect()
}

pub fn offsets(bytes: &[u8]) -> Vec<u32> {
    bytes
        .chunks_exact(4)
        .map(|b| u32::from_le_bytes([b[0], b[1], b[2], b[3]]))
        .collect()
}

pub fn competitions(scope: Scope) -> &'static [u8] {
    match scope {
        Scope::Competitive => &[1, 2, 3],
        Scope::League => &[1],
        Scope::Cups => &[2],
        Scope::Continental => &[3],
        Scope::All => &[0, 1, 2, 3, 4],
    }
}

fn le_u64(b: &[u8]) -> u64 {
    u64::from_le_bytes(b.try_into().expect("8 bytes"))
}

fn counter(row: &[u8], off: usize, width: Width) -> i32 {
    match width {
        Width::U8 => i32::from(row[off]),
        Width::U16 => i32::from(u16::from_le_bytes([row[off], row[off + 1]])),
        Width::I16 => i32::from(i16::from_le_bytes([row[off], row[off + 1]])),
    }
}

#[derive(Default)]
struct YearSum {
    season: Season,
    record: Record,
    club: Option<(u32, i32)>,
}

impl YearSum {
    fn note_club(&mut self, club: Option<u32>, minutes: i32) {
        let Some(club) = club else { return };
        if self.club.is_none_or(|(_, most)| minutes > most) {
            self.club = Some((club, minutes));
        }
    }
}

fn row_club(row: &[u8]) -> Option<u32> {
    let club = u32::from_le_bytes(row[ROW_CLUB..ROW_CLUB + 4].try_into().expect("4 bytes"));
    (club != NO_CLUB).then_some(club)
}

fn row_season(row: &[u8]) -> Season {
    let mut season = Season::default();
    for (value, &(off, width)) in season.values_mut().zip(&ROW_ENTRY) {
        *value = counter(row, off, width);
    }
    season
}

fn row_record(row: &[u8]) -> Record {
    let body = &row[ROW_RECORD..ROW_RECORD + RECORD_SIZE];
    let mut record = Record::default();
    for (value, &(_, off, width)) in record.values_mut().zip(&RECORD) {
        *value = counter(body, off as usize, width);
    }
    record
}

pub fn past_seasons<'a>(rows: impl IntoIterator<Item = &'a [u8]>, scope: Scope) -> Vec<PastSeason> {
    let wanted = competitions(scope);
    let mut years: BTreeMap<u16, YearSum> = BTreeMap::new();
    for row in rows {
        if row.len() < ROW_SIZE || !wanted.contains(&row[ROW_COMPETITION]) {
            continue;
        }
        let year = u16::from_le_bytes([row[ROW_YEAR], row[ROW_YEAR + 1]]);
        let sum = years.entry(year).or_default();
        let season = row_season(row);
        if row[ROW_COMPETITION] == LEAGUE {
            sum.note_club(row_club(row), season.minutes);
        }
        sum.season.add(&season);
        sum.record.add(&row_record(row));
    }
    years
        .into_iter()
        .rev()
        .filter(|(_, sum)| sum.season.minutes > 0)
        .map(|(year, sum)| PastSeason {
            year,
            partial: sum.record.distance10 == 0 && sum.record.sprints == 0,
            season: sum.season.values(),
            record: sum.record.values(),
            club: sum.club.map(|(club, _)| club),
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn row(
        year: u16,
        competition: u8,
        minutes: u16,
        goals: u8,
        pas_att: u16,
        distance10: u16,
    ) -> Vec<u8> {
        let mut r = vec![0u8; ROW_SIZE];
        r[ROW_YEAR..ROW_YEAR + 2].copy_from_slice(&year.to_le_bytes());
        r[ROW_COMPETITION] = competition;
        r[0x0F..0x11].copy_from_slice(&minutes.to_le_bytes());
        r[0x18] = 10;
        r[0x19] = 2;
        r[0x1B] = goals;
        r[ROW_RECORD + 0x08..ROW_RECORD + 0x0A].copy_from_slice(&pas_att.to_le_bytes());
        r[ROW_RECORD + 0x2E..ROW_RECORD + 0x30].copy_from_slice(&distance10.to_le_bytes());
        r
    }

    fn field(season: &PastSeason, name: &str) -> i32 {
        season.season[Season::FIELDS.iter().position(|f| *f == name).unwrap()]
    }

    fn stat(season: &PastSeason, name: &str) -> i32 {
        season.record[Record::FIELDS.iter().position(|f| *f == name).unwrap()]
    }

    #[test]
    fn sums_the_official_competitions_of_each_year_newest_first() {
        let rows = [
            row(2026, 1, 900, 3, 400, 900),
            row(2026, 2, 180, 1, 80, 200),
            row(2026, 0, 90, 5, 30, 50),
            row(2025, 1, 450, 0, 200, 0),
        ];
        let seasons = past_seasons(rows.iter().map(Vec::as_slice), Scope::Competitive);
        assert_eq!(
            seasons.iter().map(|s| s.year).collect::<Vec<_>>(),
            [2026, 2025]
        );
        assert_eq!(field(&seasons[0], "minutes"), 1080);
        assert_eq!(field(&seasons[0], "goals"), 4);
        assert_eq!(field(&seasons[0], "starts"), 20);
        assert_eq!(stat(&seasons[0], "pas_att"), 480);
        assert!(!seasons[0].partial);
        assert!(seasons[1].partial);
    }

    #[test]
    fn league_scope_keeps_only_league_rows_and_drops_years_without_minutes() {
        let rows = [
            row(2026, 1, 900, 3, 400, 900),
            row(2026, 2, 180, 1, 80, 200),
            row(2027, 1, 0, 0, 0, 0),
        ];
        let seasons = past_seasons(rows.iter().map(Vec::as_slice), Scope::League);
        assert_eq!(seasons.len(), 1);
        assert_eq!(field(&seasons[0], "minutes"), 900);
    }

    #[test]
    fn keeps_the_league_club_with_the_most_minutes_of_each_year() {
        let at = |mut r: Vec<u8>, club: u32| {
            r[ROW_CLUB..ROW_CLUB + 4].copy_from_slice(&club.to_le_bytes());
            r
        };
        let rows = [
            at(row(2026, 1, 600, 0, 0, 0), 65),
            at(row(2026, 1, 1400, 0, 0, 0), 2502),
            at(row(2026, 2, 2000, 0, 0, 0), 77),
            at(row(2025, 1, 900, 0, 0, 0), NO_CLUB),
        ];
        let seasons = past_seasons(rows.iter().map(Vec::as_slice), Scope::Competitive);
        assert_eq!(seasons[0].club, Some(2502));
        assert_eq!(seasons[1].club, None);
    }

    #[test]
    fn reads_the_index_and_row_offsets_and_skips_rows_past_the_file() {
        let mut index = vec![0u8; 2 * INDEX_STRIDE];
        index[0..8].copy_from_slice(&0x1000u64.to_le_bytes());
        index[8..16].copy_from_slice(&0x1008u64.to_le_bytes());
        assert_eq!(index_items(&index), [(0x1000, 0x1008), (0, 0)]);
        let store = HistoryStore {
            items: vec![],
            file: vec![0u8; FILE_HEADER + ROW_SIZE],
        };
        let offs = offsets(&[0, 0, 0, 0, 168, 0, 0, 0]);
        assert_eq!(offs, [0, 168]);
        assert_eq!(store.rows(&offs).count(), 1);
    }
}
