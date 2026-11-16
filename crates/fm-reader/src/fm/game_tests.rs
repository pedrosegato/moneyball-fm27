use std::path::PathBuf;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};

use chrono::{Datelike, NaiveDate};

use super::*;
use crate::fm::record::{Keeper, Record, Season};
use crate::fm::tactic::fixture::sample_433;
use crate::fm::tactic::{Tactic, ARRAY_SIZE, TACTIC_SIZE};
use crate::memory::{Module, ReaderError, Region};

const MODULE: u64 = 0x1_4000_0000;
const MODULE_SIZE: usize = 0x1000;
const HEAP: u64 = 0x2_0000_0000;
const HEAP_SIZE: usize = 0x10_0000;

const FM27_BUILD: (u32, u32) = (0x6AE8_CF77, 0x1796_9000);
const FM26_BUILD: (u32, u32) = (0x6A22_9F1E, 0x1D8D_3000);

const PLAYER_VT: u64 = MODULE + 0x100;
const STAFF_VT: u64 = MODULE + 0x110;
const VIRTUAL_VT: u64 = MODULE + 0x120;
const LOAN_VT: u64 = MODULE + 0x130;
const HUMAN_VT: u64 = MODULE + 0x140;
const CLOCK_VT: u64 = MODULE + 0x150;
const TEAM_VT: u64 = MODULE + 0x160;
const PLAYER_BASE_VT: u64 = MODULE + 0x170;
const STAFF_BASE_VT: u64 = MODULE + 0x180;
const HUMAN_OTHER_VT: u64 = MODULE + 0x190;
const CLOCK_OTHER_VT: u64 = MODULE + 0x1A0;
const VIRTUAL_OTHER_VT: u64 = MODULE + 0x1B0;
const PLAYER_ALT_VT: u64 = MODULE + 0x1C0;
const CURRENCY_VT: u64 = MODULE + 0x1D0;
const PREPARED_VT: u64 = MODULE + 0x1E0;

const CURRENCY_BLOCK_RVA: u64 = 0x53B_B708;
const WAGE_PERIOD_RVA: u64 = 0x537_1160;
const RECORDED_BLOCK: &[u8] = include_bytes!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/testdata/currency-block-6AE8CF77-17969000.bin"
));
const EURO: f64 = 1.164_101_123_809_814_5;
const REAL: f64 = 6.950_955_867_767_334;

const TODAY: (i32, u32, u32) = (2026, 10, 30);

fn ymd(y: i32, m: u32, d: u32) -> NaiveDate {
    NaiveDate::from_ymd_opt(y, m, d).unwrap()
}

fn packed(y: i32, m: u32, d: u32) -> u32 {
    ((y as u32) << 16) | ymd(y, m, d).ordinal()
}

type ModuleData = Arc<Mutex<Vec<(u64, Vec<u8>)>>>;

struct TestMem {
    module: Vec<u8>,
    module_data: ModuleData,
    heap: Arc<Mutex<Vec<u8>>>,
}

impl MemorySource for TestMem {
    fn read(&self, addr: u64, len: usize) -> Option<Vec<u8>> {
        let mut buf = vec![0; len];
        self.read_into(addr, &mut buf).then_some(buf)
    }

    fn read_into(&self, addr: u64, buf: &mut [u8]) -> bool {
        let Some(end) = addr.checked_add(buf.len() as u64) else {
            return false;
        };
        if addr >= MODULE && end <= MODULE + self.module.len() as u64 {
            let i = (addr - MODULE) as usize;
            buf.copy_from_slice(&self.module[i..i + buf.len()]);
            return true;
        }
        for (rva, bytes) in self.module_data.lock().unwrap().iter() {
            let start = MODULE + rva;
            if addr >= start && end <= start + bytes.len() as u64 {
                let i = (addr - start) as usize;
                buf.copy_from_slice(&bytes[i..i + buf.len()]);
                return true;
            }
        }
        let heap = self.heap.lock().unwrap();
        if addr >= HEAP && end <= HEAP + heap.len() as u64 {
            let i = (addr - HEAP) as usize;
            buf.copy_from_slice(&heap[i..i + buf.len()]);
            return true;
        }
        false
    }

    fn modules(&self) -> crate::memory::Result<Vec<Module>> {
        Ok(vec![Module {
            name: "game_plugin.dll".into(),
            path: "game_plugin.dll".into(),
            base: MODULE,
            size: MODULE_SIZE as u64,
        }])
    }

    fn regions(&self, private_only: bool) -> Box<dyn Iterator<Item = Region> + '_> {
        let module = Region {
            base: MODULE,
            size: MODULE_SIZE as u64,
            protect: 0x02,
            private: false,
        };
        let heap = Region {
            base: HEAP,
            size: HEAP_SIZE as u64,
            protect: 0x04,
            private: true,
        };
        Box::new(
            [module, heap]
                .into_iter()
                .filter(move |r| !private_only || r.private),
        )
    }
}

#[derive(Clone, Copy)]
struct P {
    a: u64,
    back: i64,
}

impl P {
    fn at(self, off: i64) -> u64 {
        let off = if off < 0 { off - self.back } else { off };
        self.a.wrapping_add_signed(off)
    }

    fn object(self) -> u64 {
        let sub = if self.back == 0 {
            PLAYER_SUBOBJECT
        } else {
            STAFF_PLAYER_SUBOBJECT
        };
        self.a - sub as u64
    }
}

struct World {
    heap: Arc<Mutex<Vec<u8>>>,
    module_data: ModuleData,
    sections: usize,
    preferences: Option<PathBuf>,
    next: u64,
    build: (u32, u32),
    vtables: Vec<(&'static str, u64, u32)>,
    module: Vec<u8>,
    stats_to_start: i64,
    p_stats: i64,
}

impl World {
    fn fm27() -> Self {
        Self::new(FM27_BUILD)
    }

    fn new(build: (u32, u32)) -> Self {
        let id = format!("{:08X}-{:X}", build.0, build.1);
        let prof = profile_for(&id).copied().unwrap_or(PROFILES[3].1);
        let mut module = vec![0u8; MODULE_SIZE];
        module[..2].copy_from_slice(b"MZ");
        module[0x3C..0x40].copy_from_slice(&0x80u32.to_le_bytes());
        module[0x80..0x84].copy_from_slice(b"PE\0\0");
        module[0x88..0x8C].copy_from_slice(&build.0.to_le_bytes());
        module[0xD0..0xD4].copy_from_slice(&build.1.to_le_bytes());
        World {
            heap: Arc::new(Mutex::new(vec![0; HEAP_SIZE])),
            module_data: Arc::new(Mutex::new(Vec::new())),
            sections: 0,
            preferences: None,
            next: HEAP + 0x1000,
            build,
            vtables: vec![
                (PLAYER_CLASS, PLAYER_BASE_VT, 0),
                (PLAYER_CLASS, PLAYER_VT, 0x288),
                (STAFF_PLAYER_CLASS, STAFF_BASE_VT, 0),
                (STAFF_PLAYER_CLASS, STAFF_VT, 0x380),
                (VIRTUAL_CLASS, VIRTUAL_VT, 0),
                (VIRTUAL_CLASS, VIRTUAL_OTHER_VT, 0x30),
                (LOAN_CLASS, LOAN_VT, 0),
                (HUMAN_CLASS, HUMAN_OTHER_VT, 0x440),
                (HUMAN_CLASS, HUMAN_VT, prof.human_subobject as u32),
                (CLOCK_CLASS, CLOCK_VT, 0),
                (CLOCK_CLASS, CLOCK_OTHER_VT, 8),
                (TEAM_CLASS, TEAM_VT, 0),
                (CURRENCY_CLASS, CURRENCY_VT, 0),
                (PREPARED_TACTICS_CLASS, PREPARED_VT, 0),
            ],
            module,
            stats_to_start: prof.stats_to_start,
            p_stats: prof.p_stats,
        }
    }

    fn read_u64(&self, addr: u64) -> u64 {
        let i = (addr - HEAP) as usize;
        let heap = self.heap.lock().unwrap();
        u64::from_le_bytes(heap[i..i + 8].try_into().unwrap())
    }

    fn tactic_object(&mut self, name: &str, style: Option<&str>) -> u64 {
        let t = self.alloc(TACTIC_SIZE);
        self.put(t, &sample_433());
        let name = self.str(name);
        self.u64(t + 0x778, name);
        if let Some(style) = style {
            let style = self.str(style);
            self.u64(t + 0xF8, style);
        }
        t
    }

    fn prepared(&mut self, tactic: Option<u64>, lineup: &[i32; 23]) -> u64 {
        let a = self.alloc(ARRAY_SIZE);
        self.u64(a, PREPARED_VT);
        if let Some(t) = tactic {
            let list = self.alloc(8);
            self.u64(list, t);
            self.u64(a + 0x08, list);
            self.u64(a + 0x10, list + 8);
        }
        for (i, id) in lineup.iter().enumerate() {
            self.put(a + 0x28 + 4 * i as u64, &id.to_le_bytes());
        }
        a
    }

    fn alloc(&mut self, size: usize) -> u64 {
        let a = self.next;
        self.next += (size as u64 + 0xF) & !0xF;
        assert!(self.next <= HEAP + HEAP_SIZE as u64, "test heap full");
        a
    }

    fn put(&mut self, addr: u64, bytes: &[u8]) {
        let i = (addr - HEAP) as usize;
        self.heap.lock().unwrap()[i..i + bytes.len()].copy_from_slice(bytes);
    }

    fn u8(&mut self, addr: u64, v: u8) {
        self.put(addr, &[v]);
    }

    fn u16(&mut self, addr: u64, v: u16) {
        self.put(addr, &v.to_le_bytes());
    }

    fn u32(&mut self, addr: u64, v: u32) {
        self.put(addr, &v.to_le_bytes());
    }

    fn u64(&mut self, addr: u64, v: u64) {
        self.put(addr, &v.to_le_bytes());
    }

    fn raw_str(&mut self, b: &[u8]) -> u64 {
        let a = self.alloc(4 + b.len());
        self.u32(a, b.len() as u32);
        self.put(a + 4, b);
        a
    }

    fn str(&mut self, s: &str) -> u64 {
        self.raw_str(s.as_bytes())
    }

    fn name(&mut self, s: &str) -> u64 {
        let entry = self.alloc(8);
        let text = self.str(s);
        self.u64(entry, text);
        entry
    }

    fn club(&mut self, short: &str, uid: u32) -> u64 {
        let c = self.alloc(0x170);
        self.u32(c + 0x0C, uid);
        let long = self.str(&format!("{short} Football Club"));
        self.u64(c + 0xC0, long);
        let s = self.str(short);
        self.u64(c + 0xC8, s);
        c
    }

    fn nation(&mut self, code: &str, name: &str) -> u64 {
        let n = self.alloc(0x30);
        let s = self.str(name);
        self.u64(n + 0x18, s);
        let s = self.str(code);
        self.u64(n + 0x28, s);
        n
    }

    fn team(&mut self, club: u64, division: &str) -> u64 {
        let t = self.alloc(0x58);
        self.u64(t, TEAM_VT);
        self.u8(t + 0x2C, 100);
        self.u64(t + 0x30, club);
        let comp = self.alloc(0x190);
        let s = self.str(division);
        self.u64(comp + 0x40, s);
        self.u64(t + 0x50, comp);
        t
    }

    fn comp_reputation(&mut self, team: u64, reputation: u16) {
        let i = (team + 0x50 - HEAP) as usize;
        let comp = u64::from_le_bytes(self.heap.lock().unwrap()[i..i + 8].try_into().unwrap());
        self.u16(comp + 0x188, reputation);
    }

    fn rtti_class(&mut self, slot: usize, class: &str) -> u64 {
        let td = 0x400 + slot * 0x180;
        let (col, vt) = (td + 0xA0, td + 0xC0);
        assert!(vt + 8 <= MODULE_SIZE && class.len() < 0x80);
        self.module[td + 0x10..td + 0x10 + class.len()].copy_from_slice(class.as_bytes());
        self.module[col..col + 4].copy_from_slice(&1u32.to_le_bytes());
        self.module[col + 12..col + 16].copy_from_slice(&(td as u32).to_le_bytes());
        self.module[vt - 8..vt].copy_from_slice(&(MODULE + col as u64).to_le_bytes());
        MODULE + vt as u64
    }

    fn finances(&mut self, club: u64, vt: u64, transfer: i32, wage_budget: i32, wage_bill: i32) {
        let f = self.alloc(0x8B0);
        self.u64(f, vt);
        self.u32(f + 0x7C4, transfer as u32);
        self.u32(f + 0x808, wage_budget as u32);
        self.u32(f + 0x810, wage_bill as u32);
        self.u64(club + 0x150, f);
    }

    fn roster(&mut self, team: u64, age: u8, second: u32, entries: &[u64]) {
        let list = self.alloc(8 * entries.len());
        for (i, &p) in entries.iter().enumerate() {
            self.u64(list + 8 * i as u64, p);
        }
        self.u64(team + 0x38, list);
        self.u64(team + 0x40, list + 8 * entries.len() as u64);
        self.u8(team + 0x2C, age);
        self.u32(team + 0x28, second);
    }

    fn contract(&mut self, team: u64, wage: u32, start: u32, end: u32) -> u64 {
        let c = self.alloc(0x60);
        self.u8(c + 0x5D, 0xFF);
        self.u64(c + 0x10, team);
        self.u32(c + 0x20, wage);
        self.u32(c + 0x44, start);
        self.u32(c + 0x48, end);
        c
    }

    fn loan(&mut self, team: u64, start: u32, end: u32) -> u64 {
        let l = self.contract(team, 0, start, end);
        self.u64(l, LOAN_VT);
        let node = self.alloc(8);
        self.u64(node, l);
        node
    }

    fn record(&mut self, fields: &[(u64, u16)]) -> u64 {
        let r = self.alloc(0x78);
        for &(off, v) in fields {
            self.u16(r + off, v);
        }
        r
    }

    fn entry(&mut self, minutes: u16, bytes: &[(u64, u8)], record: Option<u64>) -> u64 {
        let e = self.alloc(0x20);
        self.u64(e, record.unwrap_or(0));
        self.u16(e + 0x0A, minutes);
        for &(off, v) in bytes {
            self.u8(e + off, v);
        }
        e
    }

    fn stats(&mut self, p: P, slots: &[(i64, u64)]) {
        let block = self.alloc(0x100);
        let so = block + 0x88;
        for &(slot, entry) in slots {
            self.u64(so + slot as u64, entry);
        }
        let link = so.wrapping_add_signed(-self.stats_to_start);
        let at = p.a.wrapping_add_signed(self.p_stats - p.back);
        self.u64(at, link);
    }

    fn player_with(&mut self, uid: u32, vt: u64, staff: bool) -> P {
        let object = self.alloc(0x700);
        let (sub, back) = if staff {
            (STAFF_PLAYER_SUBOBJECT, STAFF_PLAYER_SHIFT)
        } else {
            (PLAYER_SUBOBJECT, 0)
        };
        let p = P {
            a: object + sub as u64,
            back,
        };
        self.u64(p.a, vt);
        self.u32(p.at(P_UID), uid);
        self.u32(p.at(P_UID2), uid);
        self.put(p.at(P_POS), &[5; 15]);
        p
    }

    fn player(&mut self, uid: u32) -> P {
        self.player_with(uid, PLAYER_VT, false)
    }

    fn common_name(&mut self, p: P, name: &str) {
        let n = self.name(name);
        self.u64(p.at(P_COMMON), n);
    }

    fn sign(&mut self, p: P, team: u64) {
        let c = self.contract(team, 1000, packed(2024, 7, 1), packed(2028, 6, 30));
        self.u64(p.at(P_CONTRACT), c);
    }

    fn regular(&mut self, uid: u32, name: &str, team: u64, minutes: u16) -> P {
        let p = self.player(uid);
        self.common_name(p, name);
        self.sign(p, team);
        let e = self.entry(minutes, &[], None);
        self.stats(p, &[(0x28, e)]);
        p
    }

    fn clock(&mut self, date: u32) -> u64 {
        let c = self.alloc(0x800);
        self.u64(c, CLOCK_VT);
        self.u32(c + 0x7F4, date);
        c
    }

    fn human(&mut self, team: Option<u64>) -> u64 {
        let h = self.alloc(0x88);
        self.u64(h, HUMAN_VT);
        if let Some(team) = team {
            let c = self.contract(team, 0, 0, 0);
            self.u64(h + 0x80, c);
        }
        h
    }

    fn build_id(&self) -> String {
        format!("{:08X}-{:X}", self.build.0, self.build.1)
    }

    fn cache_json(&self) -> serde_json::Value {
        let mut classes = serde_json::Map::new();
        for &(class, vt, off) in &self.vtables {
            let entry = classes
                .entry(class)
                .or_insert_with(|| serde_json::json!({}));
            entry[(vt - MODULE).to_string()] = off.into();
        }
        serde_json::json!({ self.build_id(): classes })
    }

    fn attach(&self) -> crate::memory::Result<Game> {
        static N: AtomicUsize = AtomicUsize::new(0);
        let path: PathBuf = std::env::temp_dir().join(format!(
            "fm-game-{}-{}.json",
            std::process::id(),
            N.fetch_add(1, Ordering::Relaxed)
        ));
        std::fs::write(&path, self.cache_json().to_string()).unwrap();
        let mem = TestMem {
            module: self.module.clone(),
            module_data: Arc::clone(&self.module_data),
            heap: Arc::clone(&self.heap),
        };
        let game = Game::attach_with_cache(Box::new(mem), &path)
            .map(|g| g.with_preferences(self.preferences.clone()));
        let _ = std::fs::remove_file(&path);
        game
    }

    fn module_bytes(&mut self, rva: u64, bytes: &[u8]) {
        let mut data = self.module_data.lock().unwrap();
        data.retain(|(at, _)| *at != rva);
        data.push((rva, bytes.to_vec()));
    }

    fn section(&mut self, rva: u32, size: u32, flags: u32) {
        const TABLE: usize = 0x80 + 24 + 0xF0;
        self.module[0x94..0x96].copy_from_slice(&0xF0u16.to_le_bytes());
        let h = TABLE + self.sections * 40;
        self.module[h + 8..h + 12].copy_from_slice(&size.to_le_bytes());
        self.module[h + 12..h + 16].copy_from_slice(&rva.to_le_bytes());
        self.module[h + 36..h + 40].copy_from_slice(&flags.to_le_bytes());
        self.sections += 1;
        self.module[0x86..0x88].copy_from_slice(&(self.sections as u16).to_le_bytes());
    }

    fn currency(&mut self, uid: u32, rate: f64, names: [&str; 2], symbol: Option<&str>) -> u64 {
        let r = self.alloc(0x58);
        self.u64(r, CURRENCY_VT);
        self.u32(r + 0x0C, uid);
        let [name, short] = names.map(|n| self.str(n));
        self.u64(r + 0x18, name);
        self.u64(r + 0x20, short);
        if let Some(symbol) = symbol {
            let s = self.str(symbol);
            self.u64(r + 0x30, s);
        }
        self.put(r + 0x38, &(rate as f32).to_le_bytes());
        r
    }

    fn currency_database(&mut self) {
        self.currency(86, 1.0, ["United Kingdom Pound", "Pound"], Some("£"));
        self.currency(13, REAL, ["Brazilian Real", "Real"], Some("R$"));
        self.currency(28, EURO, ["European Euro", "Euro"], Some("€"));
        self.currency(
            87,
            1.347_619_056_701_660_2,
            ["United States Dollar", "Dollar"],
            Some("$"),
        );
    }

    fn currency_block_at(&mut self, rva: u64, chosen: u8) {
        let mut block = RECORDED_BLOCK.to_vec();
        block[5] = chosen;
        self.module_bytes(rva, &block);
    }

    fn data_section_with_block(&mut self, rva: u32, offset: usize) {
        let mut data = vec![0u8; 0x4000];
        data[offset..offset + RECORDED_BLOCK.len()].copy_from_slice(RECORDED_BLOCK);
        self.section(rva, data.len() as u32, 0xC000_0040);
        self.module_bytes(u64::from(rva), &data);
    }

    fn wage_period_byte(&mut self, value: u8) {
        self.module_bytes(WAGE_PERIOD_RVA, &[value]);
    }

    fn game(&self) -> Game {
        self.attach().unwrap()
    }
}

fn read(game: &mut Game, scope: Scope, require_minutes: bool) -> Vec<PlayerRecord> {
    game.read_all(scope, require_minutes, |_, _| {}).unwrap().1
}

fn by_uid(rows: &[PlayerRecord], uid: u32) -> &PlayerRecord {
    rows.iter().find(|r| r.uid == uid).unwrap()
}

#[test]
fn read_all_reads_a_contracted_player() {
    let mut w = World::fm27();
    w.clock(packed(TODAY.0, TODAY.1, TODAY.2));
    let club = w.club("MFC", 301344);
    let team = w.team(club, "Sky Bet League One");
    w.comp_reputation(team, 87);
    let nation = w.nation("BRA", "Brazil");
    let p = w.player(1001);
    w.common_name(p, "Negueba");
    w.u64(p.at(P_NATION), nation);
    w.u32(p.at(P_DOB), packed(1999, 10, 31));
    let c = w.contract(team, 12_000, packed(2024, 7, 1), packed(2028, 6, 30));
    w.u64(p.at(P_CONTRACT), c);
    w.u8(c + 0x5D, 11);
    let mut pos = [5u8; 15];
    pos[8] = 20;
    pos[11] = 18;
    w.put(p.at(P_POS), &pos);
    let mut attrs: Vec<u8> = (1..=54).collect();
    attrs[24] = 40;
    attrs[25] = 95;
    w.put(p.at(P_ATTRS), &attrs);
    w.put(p.at(P_PERSONALITY), &[1, 2, 3, 4, 5, 6, 7, 8]);
    w.u8(p.at(P_HEIGHT), 175);
    w.u32(p.at(P_VALUE), 2_500_000);
    w.u8(p.at(P_CA), 120);
    w.u8(p.at(P_PA), 150);
    let rec = w.record(&[
        (0x08, 740),
        (0x0A, 417),
        (0x5E, (-35i16) as u16),
        (0x6C, 1035),
    ]);
    let e = w.entry(
        3128,
        &[(0x0C, 35), (0x0F, 10), (0x10, 4), (0x17, 2)],
        Some(rec),
    );
    w.u16(e + 0x08, 2418);
    w.stats(p, &[(0x28, e)]);
    w.roster(team, 100, 0, &[p.object()]);

    let mut game = w.game();
    let (today, rows) = game.read_all(Scope::Competitive, true, |_, _| {}).unwrap();

    assert_eq!(today, Some(ymd(2026, 10, 30)));
    assert_eq!(rows.len(), 1);
    let r = &rows[0];
    let shown: Vec<u8> = (0..54)
        .filter(|&i| SHOWN_ATTRS[i])
        .map(|i| attrs[i])
        .collect();
    let expected = PlayerRecord {
        uid: 1001,
        name: "Negueba".into(),
        pos: pos.to_vec(),
        position: "M (R), AM (R)".into(),
        age: Some(26),
        dob: Some(ymd(1999, 10, 31)),
        nat: Some("BRA".into()),
        nation: Some("Brazil".into()),
        club: Some("MFC".into()),
        club_uid: Some(301344),
        owner: None,
        owner_uid: None,
        division: Some("Sky Bet League One".into()),
        competition_reputation: Some(87),
        team: Some("Senior Team".into()),
        owner_team: None,
        wage: Some(12_000),
        contract_end: Some(ymd(2028, 6, 30)),
        squad_number: Some(11),
        value: 2_500_000,
        height: 175,
        foot: "Right".into(),
        ca: 120,
        pa: 150,
        attrs: shown,
        personality: vec![1, 2, 3, 4, 5, 6, 7, 8],
        season: Some(Season {
            rating_sum: 2418,
            minutes: 3128,
            starts: 35,
            goals: 10,
            assists: 4,
            clean_sheets: 2,
            ..Season::default()
        }),
        record: Record {
            pas_att: 740,
            pas_cmp: 417,
            xgp100: -35,
            npxg100: 1035,
            ..Record::default()
        },
        keeper: None,
        partial_detail: true,
        past_seasons: Vec::new(),
    };
    assert_eq!(*r, expected);
    assert_eq!(r.attrs.len(), 47);
}

#[test]
fn loanee_plays_for_the_loan_club_and_keeps_the_owner() {
    let mut w = World::fm27();
    w.clock(packed(TODAY.0, TODAY.1, TODAY.2));
    let parent = w.club("Parent", 1);
    let parent_team = w.team(parent, "Premier League");
    let borrower = w.club("Borrower", 2);
    let borrower_team = w.team(borrower, "Championship");
    let p = w.regular(7, "Loanee", parent_team, 900);
    let node = w.loan(borrower_team, packed(2026, 7, 1), packed(2027, 6, 30));
    w.u64(p.at(P_LOANS), node);
    w.roster(parent_team, 100, 1, &[p.object()]);
    w.roster(borrower_team, 21, 0, &[p.object()]);

    let rows = read(&mut w.game(), Scope::Competitive, true);
    let r = by_uid(&rows, 7);
    assert_eq!(r.club.as_deref(), Some("Borrower"));
    assert_eq!(r.club_uid, Some(2));
    assert_eq!(r.division.as_deref(), Some("Championship"));
    assert_eq!(r.team.as_deref(), Some("U21"));
    assert_eq!(r.owner.as_deref(), Some("Parent"));
    assert_eq!(r.owner_uid, Some(1));
    assert_eq!(r.owner_team.as_deref(), Some("Reserves"));
}

#[test]
fn loan_outside_its_dates_counts_the_contract_team() {
    let mut w = World::fm27();
    w.clock(packed(TODAY.0, TODAY.1, TODAY.2));
    let parent = w.club("Parent", 1);
    let parent_team = w.team(parent, "Premier League");
    let borrower = w.club("Borrower", 2);
    let borrower_team = w.team(borrower, "Championship");
    let p = w.regular(7, "Back from loan", parent_team, 900);
    let node = w.loan(borrower_team, packed(2025, 7, 1), packed(2026, 6, 30));
    w.u64(p.at(P_LOANS), node);

    let rows = read(&mut w.game(), Scope::Competitive, true);
    let r = by_uid(&rows, 7);
    assert_eq!(r.club.as_deref(), Some("Parent"));
    assert_eq!(
        (r.owner.as_deref(), r.owner_uid, r.owner_team.as_deref()),
        (None, None, None)
    );
}

#[test]
fn free_agent_and_dateless_contract_have_no_club_fields() {
    let mut w = World::fm27();
    let free = w.player(1);
    w.common_name(free, "Free Agent");
    let club = w.club("Club", 3);
    let team = w.team(club, "League");
    let dateless = w.player(2);
    w.common_name(dateless, "Dateless");
    let c = w.contract(team, 500, packed(2020, 1, 1), packed(1900, 1, 2));
    w.u64(dateless.at(P_CONTRACT), c);

    let rows = read(&mut w.game(), Scope::Competitive, false);
    let f = by_uid(&rows, 1);
    assert_eq!(
        (
            &f.club,
            f.club_uid,
            &f.owner,
            f.owner_uid,
            &f.division,
            &f.team,
            f.wage,
            f.contract_end
        ),
        (&None, None, &None, None, &None, &None, None, None)
    );
    assert_eq!(
        (f.age, f.dob, &f.season, &f.record),
        (None, None, &None, &Record::default())
    );
    let d = by_uid(&rows, 2);
    assert_eq!(
        (d.club.as_deref(), d.wage, d.contract_end),
        (Some("Club"), Some(500), None)
    );
}

#[test]
fn name_falls_back_to_first_last_then_full_name_then_question_mark() {
    let mut w = World::fm27();
    let both = w.player(1);
    let (first, last) = (w.name("Lionel"), w.name("Messi"));
    w.u64(both.at(P_FIRST), first);
    w.u64(both.at(P_LAST), last);
    let last_only = w.player(2);
    let hulk = w.name("Hulk");
    w.u64(last_only.at(P_LAST), hulk);
    let full = w.player(3);
    let s = w.str("Givanildo Vieira de Sousa");
    w.u64(full.at(P_FULL_NAME), s);
    w.player(4);
    let common = w.player(5);
    w.u64(common.at(P_FIRST), first);
    w.common_name(common, "Leo");

    let rows = read(&mut w.game(), Scope::Competitive, false);
    let names: Vec<&str> = (1..=5)
        .map(|uid| by_uid(&rows, uid).name.as_str())
        .collect();
    assert_eq!(
        names,
        [
            "Lionel Messi",
            "Hulk",
            "Givanildo Vieira de Sousa",
            "?",
            "Leo"
        ]
    );
}

#[test]
fn require_minutes_drops_players_without_minutes() {
    let mut w = World::fm27();
    let club = w.club("Club", 3);
    let team = w.team(club, "League");
    w.regular(1, "Benched", team, 0);
    let unlinked = w.player(2);
    w.common_name(unlinked, "No Stats");
    w.regular(3, "Starter", team, 90);

    let mut game = w.game();
    let played: Vec<u32> = read(&mut game, Scope::Competitive, true)
        .iter()
        .map(|r| r.uid)
        .collect();
    assert_eq!(played, [3]);
    let everyone = read(&mut game, Scope::Competitive, false);
    assert_eq!(everyone.len(), 3);
    assert_eq!(
        by_uid(&everyone, 1).season.as_ref().map(|s| s.minutes),
        Some(0)
    );
    assert_eq!(by_uid(&everyone, 2).season, None);
}

#[test]
fn all_scope_adds_up_every_competition_on_partial_records() {
    let mut w = World::fm27();
    let p = w.player(1);
    w.common_name(p, "Everywhere");
    let friendly_rec = w.record(&[(0x08, 10)]);
    let friendly = w.entry(90, &[(0x0F, 1)], Some(friendly_rec));
    let league_rec = w.record(&[(0x08, 100), (0x5E, (-20i16) as u16)]);
    let league = w.entry(900, &[(0x0F, 3)], Some(league_rec));
    let internationals = w.entry(180, &[], None);
    let own_all = w.entry(500, &[(0x0F, 9)], None);
    w.stats(
        p,
        &[
            (0x00, friendly),
            (0x08, league),
            (0x20, internationals),
            (0x30, own_all),
        ],
    );

    let rows = read(&mut w.game(), Scope::All, true);
    let r = by_uid(&rows, 1);
    let season = r.season.as_ref().unwrap();
    assert_eq!((season.minutes, season.goals), (1170, 4));
    assert_eq!((r.record.pas_att, r.record.xgp100), (110, -20));
}

#[test]
fn keeper_saves_skip_competitions_short_of_a_save_per_goal() {
    let mut w = World::fm27();
    let p = w.player(1);
    w.common_name(p, "Keeper");
    let mut pos = [1u8; 15];
    pos[0] = 20;
    w.put(p.at(P_POS), &pos);
    let league_rec = w.record(&[(0x10, 20), (0x12, 8), (0x32, 2), (0x34, 1250)]);
    let league = w.entry(900, &[(0x11, 10), (0x17, 3)], Some(league_rec));
    let cup_rec = w.record(&[(0x10, 2)]);
    let cup = w.entry(180, &[(0x11, 34), (0x17, 1)], Some(cup_rec));
    let continental = w.entry(90, &[(0x11, 1), (0x17, 1)], None);
    let combined = w.entry(1170, &[], None);
    w.stats(
        p,
        &[
            (0x08, league),
            (0x10, cup),
            (0x18, continental),
            (0x28, combined),
        ],
    );
    let outfield = w.player(2);
    w.common_name(outfield, "Emergency Keeper");
    let mut pos = [1u8; 15];
    pos[0] = 15;
    pos[12] = 20;
    w.put(outfield.at(P_POS), &pos);
    let e = w.entry(90, &[], None);
    w.stats(outfield, &[(0x28, e)]);

    let rows = read(&mut w.game(), Scope::Competitive, true);
    assert_eq!(
        by_uid(&rows, 1).keeper,
        Some(Keeper {
            saves: 30,
            conceded: 10,
            minutes: 900,
            xgp100: 250,
            clean_sheets: 5
        })
    );
    assert_eq!(by_uid(&rows, 2).keeper, None);
}

#[test]
fn freed_records_are_skipped_and_generated_players_kept() {
    let mut w = World::fm27();
    let club = w.club("Club", 3);
    let team = w.team(club, "League");
    let freed = w.player(0);
    w.u32(freed.at(P_UID2), 0);
    let stale = w.player(5);
    w.u32(stale.at(P_UID2), 6);
    let generated = w.player(7);
    w.u32(generated.at(P_UID2), 0);
    w.sign(generated, team);
    w.stats(generated, &[]);
    let unlinked = w.player(8);
    w.u32(unlinked.at(P_UID2), 0);
    w.sign(unlinked, team);

    let mut game = w.game();
    assert_eq!(game.players(false).unwrap(), [generated.a]);
    let uids: Vec<u32> = read(&mut game, Scope::Competitive, false)
        .iter()
        .map(|r| r.uid)
        .collect();
    assert_eq!(uids, [7]);
}

#[test]
fn staff_player_reads_negative_offsets_further_back() {
    let mut w = World::fm27();
    let club = w.club("Club", 3);
    let team = w.team(club, "League");
    let p = w.player_with(42, STAFF_VT, true);
    w.common_name(p, "Player-Coach");
    w.sign(p, team);
    w.u8(p.at(P_CA), 99);
    w.u32(p.at(P_VALUE), 77_000);
    let mut pos = [1u8; 15];
    pos[3] = 20;
    w.put(p.at(P_POS), &pos);
    let e = w.entry(450, &[], None);
    w.stats(p, &[(0x28, e)]);
    w.roster(team, 100, 0, &[p.object()]);

    let mut game = w.game();
    assert_eq!(game.players(false).unwrap(), [p.a]);
    let rows = read(&mut game, Scope::Competitive, true);
    let r = by_uid(&rows, 42);
    assert_eq!((r.ca, r.value, r.position.as_str()), (99, 77_000, "D (C)"));
    assert_eq!(r.season.as_ref().map(|s| s.minutes), Some(450));
    assert_eq!(r.team.as_deref(), Some("Senior Team"));
}

#[test]
fn duplicate_uid_prefers_the_rostered_copy_in_first_position() {
    let mut w = World::fm27();
    let club = w.club("Club", 3);
    let team = w.team(club, "League");
    let old = w.regular(10, "Old Copy", team, 90);
    w.u8(old.at(P_CA), 1);
    w.regular(11, "Other", team, 90);
    let current = w.regular(10, "Current Copy", team, 90);
    w.u8(current.at(P_CA), 2);
    w.roster(team, 100, 0, &[current.object()]);

    let rows = read(&mut w.game(), Scope::Competitive, true);
    let order: Vec<(u32, u8)> = rows.iter().map(|r| (r.uid, r.ca)).collect();
    assert_eq!(order, [(10, 2), (11, 0)]);
}

#[test]
fn today_falls_back_to_the_latest_player_date_without_a_clock() {
    let mut w = World::fm27();
    let a = w.player(1);
    w.u32(a.at(P_UPDATED), packed(2026, 10, 1));
    let b = w.player(2);
    w.u32(b.at(P_UPDATED), packed(2026, 10, 29));
    assert_eq!(w.game().today(), Some(ymd(2026, 10, 29)));
    w.clock(packed(1900, 1, 1));
    assert_eq!(w.game().today(), Some(ymd(2026, 10, 29)));
}

#[test]
fn moved_clock_triggers_a_rescan() {
    let mut w = World::fm27();
    let first = w.clock(packed(2026, 10, 30));
    let mut game = w.game();
    assert_eq!(game.today(), Some(ymd(2026, 10, 30)));
    w.u64(first, 0);
    w.clock(packed(2026, 11, 2));
    assert_eq!(game.today(), Some(ymd(2026, 11, 2)));
}

#[test]
fn today_cached_never_rescans_a_stale_clock() {
    let mut w = World::fm27();
    let first = w.clock(packed(2026, 10, 30));
    let mut game = w.game();
    assert_eq!(game.today_cached(), None, "nothing scanned yet");
    assert_eq!(game.today(), Some(ymd(2026, 10, 30)));
    assert_eq!(game.today_cached(), Some(ymd(2026, 10, 30)));
    w.u64(first, 0);
    w.clock(packed(2026, 11, 2));
    assert_eq!(
        game.today_cached(),
        None,
        "the clock object moved: wait for the next load"
    );
    assert_eq!(game.today(), Some(ymd(2026, 11, 2)));
    assert_eq!(game.today_cached(), Some(ymd(2026, 11, 2)));
}

#[test]
fn players_are_cached_until_refresh() {
    let mut w = World::fm27();
    let a = w.player(1);
    let mut game = w.game();
    assert_eq!(game.players(false).unwrap(), [a.a]);
    let b = w.player(2);
    assert_eq!(game.players(false).unwrap(), [a.a]);
    assert_eq!(game.players(true).unwrap(), [a.a, b.a]);
}

#[test]
fn my_clubs_lists_each_human_club_once() {
    let mut w = World::fm27();
    let mfc = w.club("MFC", 301344);
    let senior = w.team(mfc, "League One");
    let reserves = w.team(mfc, "Reserve League");
    let other = w.club("Other", 5);
    let other_team = w.team(other, "League Two");
    w.human(Some(senior));
    w.human(None);
    w.human(Some(reserves));
    w.human(Some(other_team));

    let clubs = w.game().my_clubs().unwrap();
    assert_eq!(
        clubs,
        [
            ClubRef {
                name: "MFC".into(),
                uid: Some(301344)
            },
            ClubRef {
                name: "Other".into(),
                uid: Some(5)
            }
        ]
    );
}

fn mfc_finances(w: &mut World, transfer: i32) -> u64 {
    let vt = w.rtti_class(0, CLUB_FINANCE_CLASS);
    let mfc = w.club("MFC", 301344);
    w.finances(mfc, vt, transfer, 157_249, 160_137);
    let senior = w.team(mfc, "Brasileirão Assaí Série A");
    w.human(Some(senior));
    mfc
}

#[test]
fn club_finances_read_the_budgets_of_a_human_club() {
    let mut w = World::fm27();
    mfc_finances(&mut w, 1_123_660);

    assert_eq!(
        w.game().club_finances(301344),
        Some(ClubFinances {
            transfer_budget: 1_123_660,
            wage_budget_weekly: 157_249,
            wage_bill_weekly: 160_137,
            verified: false,
        })
    );
}

#[test]
fn transfer_budget_under_500_reads_as_zero_like_the_game() {
    for (stored, shown) in [(499, 0), (1, 0), (500, 500), (0, 0), (-25_000, -25_000)] {
        let mut w = World::fm27();
        mfc_finances(&mut w, stored);
        let finances = w.game().club_finances(301344).unwrap();
        assert_eq!(finances.transfer_budget, shown, "stored {stored}");
    }
}

#[test]
fn club_finances_find_a_club_nobody_manages_through_its_teams() {
    let mut w = World::fm27();
    mfc_finances(&mut w, 1);
    let vt = w.rtti_class(0, CLUB_FINANCE_CLASS);
    let rival = w.club("Rival", 7);
    w.finances(rival, vt, 52_100_000, 4_546_686, 3_043_085);
    w.team(rival, "Premier League");

    let read = w.game().club_finances(7).unwrap();
    let budgets = (read.transfer_budget, read.wage_budget_weekly);
    assert_eq!(budgets, (52_100_000, 4_546_686));
    assert_eq!(read.wage_bill_weekly, 3_043_085);
    assert_eq!(w.game().club_finances(8), None);
}

#[test]
fn club_finances_need_the_full_finance_object() {
    let mut w = World::fm27();
    let mfc = mfc_finances(&mut w, 1_123_660);
    let base_vt = w.rtti_class(1, ".?AVCLUB_FINANCE_BASE@db@@");
    w.finances(mfc, base_vt, 1_123_660, 157_249, 160_137);
    assert_eq!(w.game().club_finances(301344), None);

    w.u64(mfc + 0x150, 0);
    assert_eq!(w.game().club_finances(301344), None);
}

#[test]
fn club_finances_need_a_build_whose_offsets_are_mapped() {
    let mut fm26 = World::new(FM26_BUILD);
    mfc_finances(&mut fm26, 1_123_660);
    assert_eq!(fm26.game().club_finances(301344), None);

    let mut unknown = World::new((0x1234, 0x5000));
    mfc_finances(&mut unknown, 1_123_660);
    assert_eq!(unknown.game().club_finances(301344), None);
}

#[test]
fn competition_reputation_follows_the_team_the_player_plays_for() {
    let mut w = World::fm27();
    w.clock(packed(TODAY.0, TODAY.1, TODAY.2));
    let parent = w.club("Parent", 1);
    let parent_team = w.team(parent, "Premier League");
    w.comp_reputation(parent_team, 189);
    let host = w.club("Host", 2);
    let host_team = w.team(host, "Torneo Argentino C");
    w.comp_reputation(host_team, 63);
    let loanee = w.regular(10, "Loanee", parent_team, 900);
    let node = w.loan(host_team, packed(2026, 7, 1), packed(2027, 6, 30));
    w.u64(loanee.at(P_LOANS), node);
    let free = w.player(11);
    let e = w.entry(900, &[], None);
    w.stats(free, &[(0x28, e)]);

    let rows = read(&mut w.game(), Scope::Competitive, true);
    assert_eq!(by_uid(&rows, 10).competition_reputation, Some(63));
    assert_eq!(by_uid(&rows, 11).competition_reputation, None);
}

fn reputation_read(mut w: World, stored: u16) -> Option<u16> {
    let club = w.club("Club", 3);
    let team = w.team(club, "League");
    w.comp_reputation(team, stored);
    w.regular(1, "Player", team, 900);
    let rows = read(&mut w.game(), Scope::Competitive, true);
    by_uid(&rows, 1).competition_reputation
}

#[test]
fn competition_reputation_needs_a_build_whose_offset_is_mapped() {
    assert_eq!(reputation_read(World::fm27(), 189), Some(189));
    assert_eq!(reputation_read(World::new(FM26_BUILD), 189), None);
    let older_fm27 = (0x6ADF_B11C, 0x19E6_9000);
    assert_eq!(reputation_read(World::new(older_fm27), 189), None);
    assert_eq!(reputation_read(World::new((0x1234, 0x5000)), 189), None);
}

#[test]
fn competition_reputation_outside_0_to_200_reads_as_none() {
    for (stored, read) in [(0, Some(0)), (200, Some(200)), (201, None), (0xFFFF, None)] {
        let got = reputation_read(World::fm27(), stored);
        assert_eq!(got, read, "stored {stored}");
    }
}

#[test]
fn unlisted_counts_roster_entries_that_are_not_virtual_players() {
    let mut w = World::fm27();
    let club = w.club("Club", 3);
    let team = w.team(club, "League");
    let p = w.regular(1, "Listed", team, 90);
    let unknown = w.alloc(0x10);
    let virtual_player = w.alloc(0x10);
    w.u64(virtual_player, VIRTUAL_VT);
    w.roster(
        team,
        100,
        0,
        &[p.object(), unknown, virtual_player, unknown],
    );

    let mut game = w.game();
    read(&mut game, Scope::Competitive, true);
    assert_eq!(game.unlisted(), 1);
}

#[test]
fn a_torn_roster_skips_that_team_and_keeps_the_load() {
    let mut w = World::fm27();
    let club = w.club("Club", 3);
    let torn = w.team(club, "League");
    w.regular(1, "Torn", torn, 90);
    let list = w.alloc(0x10);
    w.u64(torn + 0x38, list);
    w.u64(torn + 0x40, list + 12);
    let other = w.club("Other", 4);
    let team = w.team(other, "League");
    let listed = w.regular(2, "Listed", team, 90);
    w.roster(team, 100, 0, &[listed.object()]);

    let rows = read(&mut w.game(), Scope::Competitive, true);
    assert_eq!(by_uid(&rows, 1).team, None);
    assert_eq!(by_uid(&rows, 2).team.as_deref(), Some("Senior Team"));
}

#[test]
fn lstr_replaces_invalid_utf8_like_python() {
    let cases: [(&[u8], &str); 6] = [
        (b"\xed\xa0\x80", "\u{FFFD}\u{FFFD}\u{FFFD}"),
        (b"\xf0\x9f\x98", "\u{FFFD}"),
        (b"a\xffb", "a\u{FFFD}b"),
        (b"\xf4\x90\x80\x80", "\u{FFFD}\u{FFFD}\u{FFFD}\u{FFFD}"),
        (b"\xe0\x80\xaf", "\u{FFFD}\u{FFFD}\u{FFFD}"),
        ("Müller".as_bytes(), "Müller"),
    ];
    let mut w = World::fm27();
    for (uid, (raw, _)) in (1..).zip(cases) {
        let p = w.player(uid);
        let entry = w.alloc(8);
        let text = w.raw_str(raw);
        w.u64(entry, text);
        w.u64(p.at(P_COMMON), entry);
    }
    let too_long = w.player(99);
    let entry = w.alloc(8);
    let text = w.raw_str(&[b'x'; 401]);
    w.u64(entry, text);
    w.u64(too_long.at(P_COMMON), entry);

    let rows = read(&mut w.game(), Scope::Competitive, false);
    for (uid, (_, want)) in (1..).zip(cases) {
        assert_eq!(by_uid(&rows, uid).name, want);
    }
    assert_eq!(by_uid(&rows, 99).name, "?");
}

#[test]
fn progress_reports_every_2000th_player() {
    let mut w = World::fm27();
    for uid in 1..=3 {
        w.player(uid);
    }
    let mut calls = Vec::new();
    w.game()
        .read_all(Scope::Competitive, false, |done, total| {
            calls.push((done, total))
        })
        .unwrap();
    assert_eq!(calls, [(0, 3)]);
}

#[test]
fn unknown_build_falls_back_to_latest_and_is_flagged() {
    let w = World::new((0x1234, 0x5000));
    let game = w.game();
    assert_eq!(game.build_id(), "00001234-5000");
    assert!(!game.known_build());
    assert_eq!(game.profile().name, "FM27 0.9.2435");
    assert!(World::fm27().game().known_build());
}

#[test]
fn missing_player_subobject_is_an_unsupported_build() {
    let mut w = World::fm27();
    w.vtables
        .retain(|&(class, vt, _)| class != PLAYER_CLASS || vt == PLAYER_BASE_VT);
    let err = w.attach().err().unwrap();
    assert!(matches!(err, ReaderError::UnsupportedBuild(_)));
    assert_eq!(
        err.to_string(),
        "ACTUAL_PLAYER class not found - unsupported game build"
    );
}

#[test]
fn vtable_choice_follows_python_discovery_order() {
    let mut w = World::fm27();
    w.vtables.push((PLAYER_CLASS, PLAYER_ALT_VT, 0x288));
    let (col_late, col_early) = (MODULE + 0x900, MODULE + 0x800);
    let at = |vt: u64| (vt - 8 - MODULE) as usize;
    w.module[at(PLAYER_VT)..at(PLAYER_VT) + 8].copy_from_slice(&col_late.to_le_bytes());
    w.module[at(PLAYER_ALT_VT)..at(PLAYER_ALT_VT) + 8].copy_from_slice(&col_early.to_le_bytes());
    w.player(1);
    let alt = w.player_with(2, PLAYER_ALT_VT, false);

    assert_eq!(w.game().players(false).unwrap(), [alt.a]);
}

#[test]
fn fm26_profile_reads_without_rosters_clock_or_keeper_sums() {
    let mut w = World::new(FM26_BUILD);
    w.clock(packed(2030, 1, 1));
    let club = w.club("Club", 3);
    let team = w.team(club, "League");
    let keeper = w.regular(1, "Keeper", team, 90);
    w.u8(keeper.at(P_POS), 20);
    w.u32(keeper.at(P_UPDATED), packed(2025, 12, 1));
    w.roster(team, 100, 0, &[keeper.object()]);
    let generated = w.player(2);
    w.u32(generated.at(P_UID2), 0);
    w.sign(generated, team);
    w.stats(generated, &[]);
    let staff = w.player_with(3, STAFF_VT, true);
    let e = w.entry(90, &[], None);
    w.stats(staff, &[(0x28, e)]);

    let mut game = w.game();
    assert_eq!(game.profile().name, "FM26");
    let (today, rows) = game.read_all(Scope::Competitive, true, |_, _| {}).unwrap();
    assert_eq!(today, Some(ymd(2025, 12, 1)));
    assert_eq!(rows.len(), 1);
    let r = &rows[0];
    assert_eq!(
        (
            r.uid,
            r.keeper.as_ref(),
            r.team.as_deref(),
            r.partial_detail
        ),
        (1, None, None, false)
    );
    assert_eq!(r.season.as_ref().map(|s| s.minutes), Some(90));
}

#[test]
fn keeper_competition_with_exactly_one_save_per_goal_counts() {
    let mut w = World::fm27();
    let p = w.player(1);
    let mut pos = [1u8; 15];
    pos[0] = 20;
    w.put(p.at(P_POS), &pos);
    let rec = w.record(&[(0x10, 4), (0x34, 300)]);
    let league = w.entry(270, &[(0x11, 4)], Some(rec));
    w.stats(p, &[(0x08, league)]);

    let rows = read(&mut w.game(), Scope::Competitive, false);
    assert_eq!(
        by_uid(&rows, 1).keeper,
        Some(Keeper {
            saves: 4,
            conceded: 4,
            minutes: 270,
            xgp100: -100,
            clean_sheets: 0
        })
    );
}

#[test]
fn pointer_hits_find_an_aligned_pointer_right_after_an_unaligned_prefix() {
    let ptr: u64 = 0x7FF6_A4C6_1234;
    let pat = ptr.to_le_bytes();
    let mut buf = vec![0u8; 32];
    buf[3..8].copy_from_slice(&pat[..5]);
    buf[8..16].copy_from_slice(&pat);
    buf[17..25].copy_from_slice(&pat);
    let mut out = Vec::new();
    PointerHits::new(ptr).find(&buf, 0x1000, &mut out);
    assert_eq!(out, [0x1008]);
}

#[test]
fn game_can_be_shared_behind_a_mutex() {
    fn send<T: Send>() {}
    send::<Game>();
}

fn euro_month() -> Money {
    Money {
        currency: Currency {
            code: "EUR".into(),
            symbol: "€".into(),
            name: "Euro".into(),
        },
        rate: EURO,
        wage_period: WagePeriod::Month,
    }
}

fn mfc_in_euros() -> World {
    let mut w = World::fm27();
    w.currency_database();
    w.currency_block_at(CURRENCY_BLOCK_RVA, 7);
    w.wage_period_byte(2);
    w
}

#[test]
fn money_follows_the_currency_and_wage_period_the_game_shows() {
    let mut game = mfc_in_euros().game();
    game.players(false).unwrap();

    assert_eq!(game.money(), Some(euro_month()));
    assert_eq!(
        game.money_block(),
        Some(MoneyBlock {
            address: MODULE + CURRENCY_BLOCK_RVA,
            found_by: FoundBy::Content
        })
    );
}

#[test]
fn money_reads_the_build_offset_before_the_currency_records_are_scanned() {
    let mut game = mfc_in_euros().game();

    let money = game.money().unwrap();
    assert_eq!(
        (money.currency.symbol.as_str(), money.currency.name.as_str()),
        ("€", "European Euro")
    );
    assert_eq!((money.rate, money.wage_period), (EURO, WagePeriod::Month));
    assert_eq!(game.money_block().unwrap().found_by, FoundBy::BuildOffset);

    game.players(false).unwrap();
    assert_eq!(game.money(), Some(euro_month()));
    assert_eq!(game.money_block().unwrap().found_by, FoundBy::Content);
}

#[test]
fn a_currency_or_wage_period_switched_in_the_game_shows_on_the_next_read() {
    let mut w = mfc_in_euros();
    let mut game = w.game();
    game.players(false).unwrap();
    assert_eq!(game.money(), Some(euro_month()));

    w.currency_block_at(CURRENCY_BLOCK_RVA, 4);
    w.wage_period_byte(1);
    assert_eq!(
        game.money(),
        Some(Money {
            currency: Currency {
                code: "BRL".into(),
                symbol: "R$".into(),
                name: "Real".into()
            },
            rate: REAL,
            wage_period: WagePeriod::Week,
        })
    );

    w.currency_block_at(CURRENCY_BLOCK_RVA, 0);
    w.wage_period_byte(3);
    let pounds = game.money().unwrap();
    assert_eq!(
        (
            pounds.currency.code.as_str(),
            pounds.rate,
            pounds.wage_period
        ),
        ("GBP", 1.0, WagePeriod::Year)
    );
}

#[test]
fn a_block_that_moved_is_found_by_its_content() {
    let mut w = World::fm27();
    w.currency_database();
    w.data_section_with_block(0x531_D000, 0x2000);
    w.module_bytes(CURRENCY_BLOCK_RVA, &[0; 0x900]);
    w.wage_period_byte(2);
    let mut game = w.game();
    game.players(false).unwrap();

    assert_eq!(game.money(), Some(euro_month()));
    assert_eq!(
        game.money_block(),
        Some(MoneyBlock {
            address: MODULE + 0x531_D000 + 0x2000,
            found_by: FoundBy::Content
        })
    );
}

#[test]
fn an_unknown_build_finds_the_block_by_content_and_the_period_in_the_preferences() {
    let prefs = std::env::temp_dir().join(format!("fm-game-prefs-{}", std::process::id()));
    std::fs::create_dir_all(prefs.join("version 6")).unwrap();
    std::fs::write(
        prefs.join("version 6").join("wage_string_type.xml"),
        "<record>\n\t<integer id=\"value\" value=\"2\"/>\n</record>\n",
    )
    .unwrap();
    let mut w = World::new((0x6B00_0000, 0x1800_0000));
    w.currency_database();
    w.data_section_with_block(0x540_0000, 0x1008);
    w.wage_period_byte(3);
    w.preferences = Some(prefs.clone());
    let mut game = w.game();

    assert_eq!(game.money(), None);
    game.players(false).unwrap();
    let money = game.money();
    std::fs::remove_dir_all(&prefs).unwrap();
    assert_eq!(money, Some(euro_month()));
}

#[test]
fn without_the_block_or_the_records_the_money_stays_unread() {
    let mut w = World::new((0x6B00_0000, 0x1800_0000));
    w.data_section_with_block(0x540_0000, 0x1008);
    let mut game = w.game();
    game.players(false).unwrap();
    assert_eq!(game.money(), None);

    let mut w = World::fm27();
    w.currency_database();
    w.wage_period_byte(2);
    let mut game = w.game();
    game.players(false).unwrap();
    assert_eq!(game.money(), None);

    let mut torn = RECORDED_BLOCK.to_vec();
    torn[4] = 0;
    w.module_bytes(CURRENCY_BLOCK_RVA, &torn);
    assert_eq!(w.game().money(), None);
}

#[test]
fn a_wage_period_byte_out_of_range_falls_back_to_weekly_wages() {
    let mut w = mfc_in_euros();
    w.wage_period_byte(0);
    let mut game = w.game();
    game.players(false).unwrap();
    assert_eq!(game.money().unwrap().wage_period, WagePeriod::Week);
}

fn squad_lineup() -> [i32; 23] {
    std::array::from_fn(|i| 500 + i as i32)
}

const MINE: &str = "4-3-3 Com Extremos Cauteloso - Contra-Ataque Directo";

fn mfc_with_squad(w: &mut World) {
    let mfc = w.club("MFC", 301344);
    let senior = w.team(mfc, "Brasileirão Assaí Série A");
    w.human(Some(senior));
    let objects: Vec<u64> = (0..23)
        .map(|i| {
            let p = w.player(1000 + i);
            w.u32(p.at(P_ID), 500 + i);
            p.object()
        })
        .collect();
    w.roster(senior, 100, 0, &objects);
}

fn tactic_after_read(w: &World) -> Option<Tactic> {
    let mut game = w.game();
    read(&mut game, Scope::Competitive, false);
    game.tactic()
}

#[test]
fn the_tactic_is_the_prepared_lineup_made_of_the_human_squad() {
    let mut w = World::fm27();
    mfc_with_squad(&mut w);
    let rival = w.club("Rival", 7);
    let rival_team = w.team(rival, "Brasileirão Assaí Série A");
    let theirs: Vec<u64> = (0..23)
        .map(|i| {
            let p = w.player(2000 + i);
            w.u32(p.at(P_ID), 900 + i);
            p.object()
        })
        .collect();
    w.roster(rival_team, 100, 0, &theirs);
    let rival_tactic = w.tactic_object("Rival 4-4-2", None);
    w.prepared(Some(rival_tactic), &std::array::from_fn(|i| 900 + i as i32));
    let stored = w.tactic_object(
        "4-3-3 MD Com Extremos Cauteloso - Contra-Ataque Directo",
        None,
    );
    w.prepared(Some(stored), &[-1; 23]);
    let mine = w.tactic_object(MINE, Some("Contra-Ataque Directo"));
    w.prepared(Some(mine), &squad_lineup());

    let tactic = tactic_after_read(&w).unwrap();

    assert_eq!(tactic.name, MINE);
    assert_eq!(tactic.style.as_deref(), Some("Contra-Ataque Directo"));
    let starters: Vec<Option<u32>> = tactic.slots.iter().map(|s| s.player_id).collect();
    assert_eq!(starters, (1000..1011).map(Some).collect::<Vec<_>>());
    assert_eq!(tactic.subs, (1011..1023).collect::<Vec<_>>());
    let jose_aldo = &tactic.slots[7];
    assert_eq!(
        (
            jose_aldo.ip.role_id.as_str(),
            jose_aldo.oop.role_id.as_str()
        ),
        ("ip:17", "oop:28")
    );
}

#[test]
fn starters_left_empty_or_gone_from_the_squad_have_no_player() {
    let mut w = World::fm27();
    mfc_with_squad(&mut w);
    let gone = w.player(3000);
    w.u32(gone.at(P_ID), 999);
    let mut lineup = squad_lineup();
    lineup[3] = -1;
    lineup[5] = 999;
    lineup[20] = -1;
    let mine = w.tactic_object(MINE, None);
    w.prepared(Some(mine), &lineup);

    let tactic = tactic_after_read(&w).unwrap();

    assert_eq!(tactic.style, None);
    let players = |i: usize| tactic.slots[i].player_id;
    assert_eq!(
        (players(3), players(4), players(5)),
        (None, Some(1004), None)
    );
    assert_eq!(tactic.subs.len(), 11);
    assert!(!tactic.subs.contains(&1020));
}

#[test]
fn no_tactic_without_a_human_club_or_on_a_build_whose_tactic_is_not_mapped() {
    let mut w = World::fm27();
    let mfc = w.club("MFC", 301344);
    let senior = w.team(mfc, "Brasileirão Assaí Série A");
    let p = w.player(1000);
    w.u32(p.at(P_ID), 500);
    w.roster(senior, 100, 0, &[p.object()]);
    let mine = w.tactic_object(MINE, None);
    w.prepared(Some(mine), &squad_lineup());
    assert_eq!(tactic_after_read(&w), None);

    for build in [FM26_BUILD, (0x1234, 0x5000)] {
        let mut w = World::new(build);
        mfc_with_squad(&mut w);
        let mine = w.tactic_object(MINE, None);
        w.prepared(Some(mine), &squad_lineup());
        assert_eq!(tactic_after_read(&w), None, "{build:x?}");
    }
}

#[test]
fn a_copy_that_fails_to_decode_gives_way_to_the_next_one() {
    let mut w = World::fm27();
    mfc_with_squad(&mut w);
    let broken = w.tactic_object(MINE, None);
    w.u32(broken + 0x430, 0);
    w.prepared(Some(broken), &squad_lineup());
    w.prepared(None, &squad_lineup());
    let good = w.tactic_object(MINE, Some("Contra-Ataque Directo"));
    w.prepared(Some(good), &squad_lineup());

    let style = tactic_after_read(&w).and_then(|t| t.style);
    assert_eq!(style.as_deref(), Some("Contra-Ataque Directo"));
}

#[test]
fn a_lineup_whose_copies_all_moved_is_found_again_after_one_rescan() {
    let mut w = World::fm27();
    mfc_with_squad(&mut w);
    let first = w.tactic_object("Antiga", None);
    let old = w.prepared(Some(first), &squad_lineup());
    let mut game = w.game();
    read(&mut game, Scope::Competitive, false);
    assert_eq!(game.tactic().map(|t| t.name), Some("Antiga".into()));

    w.u64(old, 0);
    let moved = w.tactic_object("Nova", None);
    w.prepared(Some(moved), &squad_lineup());

    assert_eq!(game.tactic().map(|t| t.name), Some("Nova".into()));
}

#[test]
fn a_lineup_that_moved_is_found_again_while_a_rival_array_stays_alive() {
    let mut w = World::fm27();
    mfc_with_squad(&mut w);
    let rival = w.tactic_object("Rival", None);
    w.prepared(Some(rival), &std::array::from_fn(|i| 9000 + i as i32));
    let first = w.tactic_object("Antiga", None);
    let old = w.prepared(Some(first), &squad_lineup());
    let mut game = w.game();
    read(&mut game, Scope::Competitive, false);
    assert_eq!(game.tactic().map(|t| t.name), Some("Antiga".into()));

    w.u64(old, 0);
    let moved = w.tactic_object("Nova", None);
    w.prepared(Some(moved), &squad_lineup());

    assert_eq!(game.tactic().map(|t| t.name), Some("Nova".into()));
}

#[test]
fn a_save_that_never_showed_a_tactic_does_not_rescan_on_every_load() {
    let mut w = World::fm27();
    mfc_with_squad(&mut w);
    let rival = w.tactic_object("Rival", None);
    w.prepared(Some(rival), &std::array::from_fn(|i| 9000 + i as i32));
    let mut game = w.game();
    read(&mut game, Scope::Competitive, false);
    assert_eq!(game.tactic(), None);

    let late = w.tactic_object("Tarde", None);
    w.prepared(Some(late), &squad_lineup());
    assert_eq!(game.tactic(), None);
}

#[test]
fn without_a_human_club_the_tactic_returns_before_any_rescan() {
    let mut w = World::fm27();
    let mfc = w.club("MFC", 301344);
    let senior = w.team(mfc, "Brasileirão Assaí Série A");
    let p = w.player(1000);
    w.roster(senior, 100, 0, &[p.object()]);
    let mine = w.tactic_object(MINE, None);
    let old = w.prepared(Some(mine), &squad_lineup());
    let mut game = w.game();
    read(&mut game, Scope::Competitive, false);
    w.u64(old, 0);
    let before = game.prepared.clone();
    assert_eq!(game.tactic(), None);
    assert_eq!(game.prepared, before);
}

#[test]
fn squad_number_decodes_like_the_game() {
    for (byte, number) in [
        (11u8, Some(11u8)),
        (0, Some(0)),
        (0x7F, Some(0x7F)),
        (0xFF, None),
        (0x80, Some(0x7E)),
        (0xFE, Some(0)),
    ] {
        let mut contract = vec![0u8; CONTRACT_SIZE];
        contract[CONTRACT_SQUAD_NUMBER as usize] = byte;
        assert_eq!(squad_number(&contract), number, "{byte:#x}");
    }
}

#[test]
fn the_shirt_number_is_the_one_at_the_club_he_plays_for() {
    let mut w = World::fm27();
    w.clock(packed(TODAY.0, TODAY.1, TODAY.2));
    let parent = w.club("Parent", 1);
    let parent_team = w.team(parent, "Premier League");
    let borrower = w.club("Borrower", 2);
    let borrower_team = w.team(borrower, "Championship");
    let on_loan = w.regular(7, "Japa", parent_team, 900);
    let back = w.regular(8, "Back from loan", parent_team, 900);
    w.regular(9, "Thomazella", parent_team, 900);
    for (p, start, end) in [
        (on_loan, packed(2026, 7, 1), packed(2027, 6, 30)),
        (back, packed(2025, 7, 1), packed(2026, 6, 30)),
    ] {
        let owner = w.read_u64(p.at(P_CONTRACT));
        w.u8(owner + 0x5D, 9);
        let node = w.loan(borrower_team, start, end);
        let loan = w.read_u64(node);
        w.u8(loan + 0x5D, 5);
        w.u64(p.at(P_LOANS), node);
    }
    let free = w.player(10);
    w.common_name(free, "Free Agent");

    let rows = read(&mut w.game(), Scope::Competitive, false);
    let number = |uid| by_uid(&rows, uid).squad_number;
    assert_eq!(
        (number(7), number(8), number(9), number(10)),
        (Some(5), Some(9), None, None)
    );
}
