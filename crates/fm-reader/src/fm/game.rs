use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};

use chrono::{Datelike, NaiveDate};
use memchr::memmem;

use super::dates::unpack_date;
use super::history::{
    self, history_file, index_items, offsets, HistoryStore, CONTAINER_LIST, INDEX_STRIDE,
    MANAGER_CONTAINER, MAX_KEYS, MAX_ROWS_PER_PLAYER, P_HISTORY_KEY, ROW_SIZE, ROW_VERSION,
    STORE_INDEX_BEGIN, STORE_INDEX_END, STORE_ROW_SIZE, STORE_VERSION,
};
use super::money::{
    self, block_is_whole, block_matches, chosen, default_preferences_dir, find_block, listed_uid,
    preferred_wage_period, Currency, CurrencyRecord, FoundBy, Money, MoneyBlock, Signature,
    WagePeriod, BLOCK_SIZE, CURRENCY_CLASS, RECORD_NAME, RECORD_RATE, RECORD_SHORT_NAME,
    RECORD_SYMBOL, RECORD_UID,
};
use super::positions::position_string;
use super::profile::*;
use super::record::{ClubFinances, ClubRef, Keeper, PastSeason, PlayerRecord, Record, Season};
use super::tactic::{
    assemble, decode_slots, is_squad_lineup, lineup, squad_players, tactic_list, text_pointers,
    Tactic, ARRAY_SIZE, PREPARED_TACTICS_CLASS, TACTIC_SIZE,
};
use crate::build::{engine_build, writable_sections, Build};
use crate::memory::{chunks, MemoryExt, MemorySource, ReaderError, Result, DEFAULT_CHUNK};
use crate::rtti::{class_name, class_vtables, default_cache_path};

pub type Memory = Box<dyn MemorySource + Send>;

fn nonzero(p: Option<u64>) -> Option<u64> {
    p.filter(|&v| v != 0)
}

fn squad_number(contract: &[u8]) -> Option<u8> {
    match *contract.get(CONTRACT_SQUAD_NUMBER as usize)? {
        0xFF => None,
        v @ 0x80..=0xFE => Some(0xFE - v),
        v => Some(v),
    }
}

fn at(addr: u64, off: i64) -> u64 {
    addr.wrapping_add_signed(off)
}

#[derive(Clone, Copy)]
struct View<'a> {
    b: &'a [u8],
    origin: i64,
}

impl<'a> View<'a> {
    fn new(b: &'a [u8]) -> Self {
        Self { b, origin: 0 }
    }

    fn bytes(self, off: i64, n: usize) -> &'a [u8] {
        let i = (self.origin + off) as usize;
        &self.b[i..i + n]
    }

    fn array<const N: usize>(self, off: i64) -> [u8; N] {
        self.bytes(off, N).try_into().expect("slice of N bytes")
    }

    fn u8(self, off: i64) -> u8 {
        self.bytes(off, 1)[0]
    }

    fn u16(self, off: i64) -> u16 {
        u16::from_le_bytes(self.array(off))
    }

    fn i16(self, off: i64) -> i16 {
        i16::from_le_bytes(self.array(off))
    }

    fn u32(self, off: i64) -> u32 {
        u32::from_le_bytes(self.array(off))
    }

    fn u64(self, off: i64) -> u64 {
        u64::from_le_bytes(self.array(off))
    }

    fn read(self, off: i64, width: Width) -> i32 {
        match width {
            Width::U8 => i32::from(self.u8(off)),
            Width::U16 => i32::from(self.u16(off)),
            Width::I16 => i32::from(self.i16(off)),
        }
    }
}

fn read_counters<'v>(
    values: impl Iterator<Item = &'v mut i32>,
    layout: &[(&str, i64, Width)],
    b: &[u8],
) {
    let v = View::new(b);
    for (value, &(_, off, width)) in values.zip(layout) {
        *value = v.read(off, width);
    }
}

fn read_entry(eb: &[u8]) -> Season {
    let mut e = Season::default();
    read_counters(e.values_mut(), &ENTRY, eb);
    e
}

fn read_record(rb: &[u8]) -> Record {
    let mut rec = Record::default();
    read_counters(rec.values_mut(), &RECORD, rb);
    rec
}

struct PointerHits {
    pat: [u8; 8],
    needle: memmem::Finder<'static>,
}

impl PointerHits {
    fn new(ptr: u64) -> Self {
        let pat = ptr.to_le_bytes();
        Self {
            pat,
            needle: memmem::Finder::new(&pat[..5]).into_owned(),
        }
    }

    fn find(&self, buf: &[u8], base: u64, out: &mut Vec<u64>) {
        let mut from = 0;
        while let Some(k) = self.needle.find(&buf[from..]) {
            let i = from + k;
            if i % 8 == 0 && buf[i..].starts_with(&self.pat) {
                out.push(base + i as u64);
            }
            from = i + 1;
        }
    }
}

#[derive(Default)]
struct MoneyMemo {
    records: Vec<u64>,
    block: Option<Option<MoneyBlock>>,
    currency: Option<(u8, Option<Currency>)>,
}

#[derive(Default)]
struct OnceMemo {
    name: HashMap<u64, Option<String>>,
    club: HashMap<u64, (Option<String>, Option<u32>)>,
    nation: HashMap<u64, (Option<String>, Option<String>)>,
    team: HashMap<u64, Option<u64>>,
    division: HashMap<u64, (Option<String>, Option<u16>)>,
}

pub struct Game {
    mem: Memory,
    build: Build,
    known_build: bool,
    prof: Profile,
    player_vt: u64,
    staff_vt: Option<u64>,
    virtual_vt: Option<u64>,
    staff_players: HashSet<u64>,
    unlisted: usize,
    loan_vt: Option<u64>,
    human_vt: Option<u64>,
    players: Option<Vec<u64>>,
    humans: Vec<u64>,
    clock_vt: Option<u64>,
    clock: Option<u64>,
    team_vt: Option<u64>,
    teams: Vec<u64>,
    team_of: HashMap<(u64, u64), String>,
    strs: HashMap<u64, Option<String>>,
    once_memo: OnceMemo,
    currency_vt: Option<u64>,
    money: MoneyMemo,
    prepared_vt: Option<u64>,
    prepared: Vec<u64>,
    had_tactic: bool,
    preferences: Option<PathBuf>,
    history: Option<HistoryStore>,
}

fn first_vtable(
    mem: &dyn MemorySource,
    vts: &HashMap<u64, u32>,
    want: impl Fn(i64) -> bool,
) -> Option<u64> {
    vts.iter()
        .filter(|&(_, &off)| want(i64::from(off)))
        .map(|(&vt, _)| vt)
        .min_by_key(|&vt| (mem.u64(vt.wrapping_sub(8)), vt))
}

impl Game {
    pub fn attach(mem: Memory) -> Result<Game> {
        Self::attach_with_cache(mem, &default_cache_path())
    }

    pub fn attach_with_cache(mem: Memory, cache_path: &Path) -> Result<Game> {
        let build = engine_build(&*mem)?;
        let id = build.id();
        let known_build = profile_for(&id).is_some();
        let prof = *profile_for(&id)
            .or_else(|| profile_for(LATEST))
            .expect("LATEST is a profile");
        let mut names = vec![
            PLAYER_CLASS,
            LOAN_CLASS,
            HUMAN_CLASS,
            CLOCK_CLASS,
            TEAM_CLASS,
            STAFF_PLAYER_CLASS,
            VIRTUAL_CLASS,
            CURRENCY_CLASS,
        ];
        let wants_tactic = prof.tactic && known_build;
        if wants_tactic {
            names.push(PREPARED_TACTICS_CLASS);
        }
        let tables = class_vtables(&*mem, &build, &names, cache_path)?;
        let vtables =
            |name: &str, want: &dyn Fn(i64) -> bool| first_vtable(&*mem, &tables[name], want);
        let player_vt = vtables(PLAYER_CLASS, &|off| off == PLAYER_SUBOBJECT).ok_or_else(|| {
            ReaderError::UnsupportedBuild(
                "ACTUAL_PLAYER class not found - unsupported game build".into(),
            )
        })?;
        let staff_vt = if prof.every_player {
            vtables(STAFF_PLAYER_CLASS, &|off| off == STAFF_PLAYER_SUBOBJECT)
        } else {
            None
        };
        let virtual_vt = vtables(VIRTUAL_CLASS, &|off| off == 0);
        let loan_vt = vtables(LOAN_CLASS, &|_| true);
        let human_vt = vtables(HUMAN_CLASS, &|off| off == prof.human_subobject);
        let clock_vt = if prof.clock_date.is_some() {
            vtables(CLOCK_CLASS, &|off| off == 0)
        } else {
            None
        };
        let team_vt = if prof.team_rosters {
            vtables(TEAM_CLASS, &|off| off == 0)
        } else {
            None
        };
        let currency_vt = vtables(CURRENCY_CLASS, &|off| off == 0);
        let prepared_vt = if wants_tactic {
            vtables(PREPARED_TACTICS_CLASS, &|off| off == 0)
        } else {
            None
        };
        Ok(Game {
            mem,
            build,
            known_build,
            prof,
            player_vt,
            staff_vt,
            virtual_vt,
            staff_players: HashSet::new(),
            unlisted: 0,
            loan_vt,
            human_vt,
            players: None,
            humans: Vec::new(),
            clock_vt,
            clock: None,
            team_vt,
            teams: Vec::new(),
            team_of: HashMap::new(),
            strs: HashMap::new(),
            once_memo: OnceMemo::default(),
            currency_vt,
            money: MoneyMemo::default(),
            prepared_vt,
            prepared: Vec::new(),
            had_tactic: false,
            preferences: default_preferences_dir(),
            history: None,
        })
    }

    pub fn with_preferences(mut self, preferences: Option<PathBuf>) -> Self {
        self.preferences = preferences;
        self
    }

    pub fn build_id(&self) -> String {
        self.build.id()
    }

    pub fn build(&self) -> &Build {
        &self.build
    }

    pub fn known_build(&self) -> bool {
        self.known_build
    }

    pub fn profile(&self) -> &Profile {
        &self.prof
    }

    pub fn memory(&self) -> &dyn MemorySource {
        &*self.mem
    }

    pub fn unlisted(&self) -> usize {
        self.unlisted
    }

    pub fn player_vt(&self) -> u64 {
        self.player_vt
    }

    pub fn staff_vt(&self) -> Option<u64> {
        self.staff_vt
    }

    pub fn cached_players(&self) -> Option<&[u64]> {
        self.players.as_deref()
    }

    pub fn players(&mut self, refresh: bool) -> Result<&[u64]> {
        if self.players.is_none() || refresh {
            self.scan();
        }
        Ok(self.players.as_deref().unwrap_or_default())
    }

    fn ensure_scanned(&mut self) {
        if self.players.is_none() {
            self.scan();
        }
    }

    fn scan(&mut self) {
        self.clock = None;
        self.strs.clear();
        let pat = PointerHits::new(self.player_vt);
        let human_pat = self.human_vt.map(PointerHits::new);
        let clock_pat = self.clock_vt.map(PointerHits::new);
        let team_pat = self.team_vt.map(PointerHits::new);
        let staff_pat = self.staff_vt.map(PointerHits::new);
        let prepared_pat = self.prepared_vt.map(PointerHits::new);
        let currency_pat = self
            .currency_vt
            .filter(|&vt| !self.currency_records_live(vt))
            .map(PointerHits::new);
        let (mut out, mut staff, mut humans, mut teams, mut currencies, mut prepared) = (
            Vec::new(),
            Vec::new(),
            Vec::new(),
            Vec::new(),
            Vec::new(),
            Vec::new(),
        );
        let mut clock = None;
        for (base, buf) in chunks(&*self.mem, self.mem.regions(true), DEFAULT_CHUNK, 0) {
            pat.find(&buf, base, &mut out);
            if let Some(p) = &staff_pat {
                p.find(&buf, base, &mut staff);
            }
            if let Some(p) = &human_pat {
                p.find(&buf, base, &mut humans);
            }
            if let Some(p) = &team_pat {
                p.find(&buf, base, &mut teams);
            }
            if let Some(p) = &prepared_pat {
                p.find(&buf, base, &mut prepared);
            }
            if let Some(p) = &currency_pat {
                p.find(&buf, base, &mut currencies);
            }
            if let (Some(p), None) = (&clock_pat, clock) {
                let mut hits = Vec::new();
                p.find(&buf, base, &mut hits);
                clock = hits.first().copied();
            }
        }
        self.clock = clock;
        self.staff_players = staff
            .into_iter()
            .filter(|&a| self.live(a, STAFF_PLAYER_SHIFT))
            .collect();
        out.sort_unstable();
        out.dedup();
        let mut players: Vec<u64> = out.into_iter().filter(|&a| self.live(a, 0)).collect();
        players.extend(&self.staff_players);
        players.sort_unstable();
        self.players = Some(players);
        self.humans = humans;
        self.teams = teams;
        prepared.sort_unstable();
        prepared.dedup();
        self.prepared = prepared;
        if currency_pat.is_some() {
            self.money = MoneyMemo {
                records: currencies,
                ..MoneyMemo::default()
            };
        }
    }

    fn currency_records_live(&self, vt: u64) -> bool {
        self.money
            .records
            .first()
            .is_some_and(|&r| self.mem.u64(r) == Some(vt))
    }

    fn currency_address(&self, uid: u32) -> Option<u64> {
        self.money.records.iter().copied().find(|&r| {
            self.mem.u64(r) == self.currency_vt && self.mem.u32(at(r, RECORD_UID)) == Some(uid)
        })
    }

    fn currency_rate(&self, uid: u32) -> Option<f32> {
        let record = self.currency_address(uid)?;
        self.mem
            .f32(at(record, RECORD_RATE))
            .filter(|r| r.is_finite() && *r > 0.0)
    }

    pub fn currency_record(&mut self, uid: u32) -> Option<CurrencyRecord> {
        let record = self.currency_address(uid)?;
        let rate = self.currency_rate(uid)?;
        let mut text = |off: i64| {
            let s = self.mem.ptr(at(record, off));
            self.lstr(s)
        };
        Some(CurrencyRecord {
            uid,
            rate,
            name: text(RECORD_NAME),
            short_name: text(RECORD_SHORT_NAME),
            symbol: text(RECORD_SYMBOL),
        })
    }

    pub fn currency_signature(&self) -> Option<Signature> {
        money::signature(|uid| self.currency_rate(uid))
    }

    pub fn money_block(&mut self) -> Option<MoneyBlock> {
        if let Some(found) = self.money.block {
            return found;
        }
        let found = self.locate_money_block();
        self.money.block = Some(found);
        found
    }

    fn locate_money_block(&self) -> Option<MoneyBlock> {
        let mem = &*self.mem;
        let module = &self.build.module;
        let at_build_offset = self
            .prof
            .money
            .filter(|_| self.known_build)
            .map(|m| module.base + m.currency_block);
        let block_at = |a: u64| mem.read(a, BLOCK_SIZE);
        let content = |address| MoneyBlock {
            address,
            found_by: FoundBy::Content,
        };
        if let Some(sig) = self.currency_signature() {
            if let Some(a) =
                at_build_offset.filter(|&a| block_at(a).is_some_and(|b| block_matches(&b, &sig)))
            {
                return Some(content(a));
            }
            if let Some(a) = find_block(mem, &writable_sections(mem, module), &sig) {
                return Some(content(a));
            }
        }
        at_build_offset
            .filter(|&a| block_at(a).is_some_and(|b| block_is_whole(&b)))
            .map(|address| MoneyBlock {
                address,
                found_by: FoundBy::BuildOffset,
            })
    }

    fn shown_currency(&mut self, index: u8) -> Option<Currency> {
        if let Some((cached, currency)) = &self.money.currency {
            if *cached == index {
                return currency.clone();
            }
        }
        let record = listed_uid(index).and_then(|uid| self.currency_record(uid));
        let currency = money::currency(index, record.as_ref());
        self.money.currency = Some((index, currency.clone()));
        currency
    }

    pub fn wage_period(&self) -> WagePeriod {
        self.prof
            .money
            .filter(|_| self.known_build)
            .and_then(|m| self.mem.u8(self.build.module.base + m.wage_period))
            .and_then(|b| WagePeriod::from_preference(i64::from(b)))
            .or_else(|| self.preferences.as_deref().and_then(preferred_wage_period))
            .unwrap_or(WagePeriod::Week)
    }

    pub fn money(&mut self) -> Option<Money> {
        let block = self.money_block()?;
        let Some(bytes) = self
            .mem
            .read(block.address, BLOCK_SIZE)
            .filter(|b| block_is_whole(b))
        else {
            self.money.block = None;
            return None;
        };
        let (index, rate) = chosen(&bytes)?;
        Some(Money {
            currency: self.shown_currency(index)?,
            rate,
            wage_period: self.wage_period(),
        })
    }

    pub fn live(&self, a: u64, shift: i64) -> bool {
        let Some(b) = self.mem.read(at(a, P_ID), 12) else {
            return false;
        };
        let v = View::new(&b);
        let (uid, uid2) = (v.u32(4), v.u32(8));
        if uid == 0 {
            return false;
        }
        if uid == uid2 {
            return true;
        }
        self.prof.every_player
            && uid2 == 0
            && nonzero(self.mem.ptr(at(a, P_CONTRACT))).is_some()
            && nonzero(self.mem.ptr(at(a, self.prof.p_stats - shift))).is_some()
    }

    pub fn shift(&self, player: u64) -> i64 {
        if self.staff_players.contains(&player) {
            STAFF_PLAYER_SHIFT
        } else {
            0
        }
    }

    pub fn today(&mut self) -> Option<NaiveDate> {
        if let Some(d) = self.clock_date() {
            return Some(d);
        }
        self.ensure_scanned();
        let players = self.players.as_deref().unwrap_or_default();
        players
            .iter()
            .filter_map(|&a| unpack_date(self.mem.u32(at(a, P_UPDATED)).unwrap_or(0)))
            .max()
    }

    pub fn today_cached(&self) -> Option<NaiveDate> {
        let players = self.players.as_deref()?;
        let (Some(vt), Some(off)) = (self.clock_vt, self.prof.clock_date) else {
            return players
                .iter()
                .filter_map(|&a| unpack_date(self.mem.u32(at(a, P_UPDATED)).unwrap_or(0)))
                .max();
        };
        let clock = self.clock.filter(|&c| self.mem.u64(c) == Some(vt))?;
        let d = unpack_date(self.mem.u32(at(clock, off)).unwrap_or(0))?;
        (d.year() >= 2000).then_some(d)
    }

    fn clock_date(&mut self) -> Option<NaiveDate> {
        let (vt, off) = (self.clock_vt?, self.prof.clock_date?);
        self.ensure_scanned();
        if self.clock.is_some_and(|c| self.mem.u64(c) != Some(vt)) {
            self.scan();
        }
        let d = unpack_date(self.mem.u32(at(self.clock?, off)).unwrap_or(0))?;
        (d.year() >= 2000).then_some(d)
    }

    pub fn lstr(&mut self, a: Option<u64>) -> Option<String> {
        let a = nonzero(a)?;
        if let Some(s) = self.strs.get(&a) {
            return s.clone();
        }
        let n = self.mem.u32(a).unwrap_or(0);
        let s = if n != 0 && n <= 400 {
            self.mem
                .read(a.wrapping_add(4), n as usize)
                .map(|b| String::from_utf8_lossy(&b).into_owned())
        } else {
            None
        };
        self.strs.insert(a, s.clone());
        s
    }

    fn once<T: Clone>(
        &mut self,
        memo: fn(&mut OnceMemo) -> &mut HashMap<u64, T>,
        key: u64,
        read: impl FnOnce(&mut Self) -> T,
    ) -> T {
        if let Some(v) = memo(&mut self.once_memo).get(&key) {
            return v.clone();
        }
        let v = read(self);
        memo(&mut self.once_memo).insert(key, v.clone());
        v
    }

    fn name_ref(&mut self, a: u64) -> Option<String> {
        if a == 0 {
            return None;
        }
        self.once(
            |m| &mut m.name,
            a,
            |g| {
                let s = g.mem.ptr(a);
                g.lstr(s)
            },
        )
    }

    fn club_name(&mut self, club: Option<u64>) -> Option<String> {
        let club = nonzero(club)?;
        let short = self.mem.ptr(at(club, CLUB_SHORT));
        self.lstr(short).or_else(|| {
            let long = self.mem.ptr(at(club, CLUB_LONG));
            self.lstr(long)
        })
    }

    fn club_info(&mut self, club: Option<u64>) -> (Option<String>, Option<u32>) {
        let Some(club) = nonzero(club) else {
            return (None, None);
        };
        self.once(
            |m| &mut m.club,
            club,
            |g| (g.club_name(Some(club)), g.mem.u32(at(club, CLUB_UID))),
        )
    }

    fn nation_info(&mut self, nation: u64) -> (Option<String>, Option<String>) {
        if nation == 0 {
            return (None, None);
        }
        self.once(
            |m| &mut m.nation,
            nation,
            |g| {
                let (code, name) = (
                    g.mem.ptr(at(nation, NATION_CODE)),
                    g.mem.ptr(at(nation, NATION_NAME)),
                );
                (g.lstr(code), g.lstr(name))
            },
        )
    }

    fn team_club(&mut self, team: Option<u64>) -> Option<u64> {
        let team = nonzero(team)?;
        self.once(|m| &mut m.team, team, |g| g.mem.ptr(at(team, TEAM_CLUB)))
    }

    fn division(&mut self, team: Option<u64>) -> (Option<String>, Option<u16>) {
        let Some(team) = nonzero(team) else {
            return (None, None);
        };
        self.once(
            |m| &mut m.division,
            team,
            |g| {
                let Some(comp) = nonzero(g.mem.ptr(at(team, TEAM_COMP))) else {
                    return (None, None);
                };
                let name = g.mem.ptr(at(comp, COMP_NAME));
                let reputation = g
                    .prof
                    .comp_reputation
                    .filter(|_| g.known_build)
                    .and_then(|off| g.mem.u16(at(comp, off)))
                    .filter(|&r| r <= MAX_REPUTATION);
                (g.lstr(name), reputation)
            },
        )
    }

    pub fn my_clubs(&mut self) -> Result<Vec<ClubRef>> {
        let mut out: Vec<ClubRef> = Vec::new();
        for club in self.human_clubs() {
            let Some(name) = self.club_name(Some(club)) else {
                continue;
            };
            if !out.iter().any(|o| o.name == name) {
                let uid = self.mem.u32(at(club, CLUB_UID));
                out.push(ClubRef { name, uid });
            }
        }
        Ok(out)
    }

    fn squad_ids(&mut self) -> HashMap<u32, u32> {
        let humans = self.human_clubs();
        if self.team_of.is_empty() {
            self.team_of = self.team_rosters();
        }
        let mut squad = HashMap::new();
        for &(a, club) in self.team_of.keys() {
            if !humans.contains(&club) {
                continue;
            }
            if let Some(b) = self.mem.read(at(a, P_ID), 8) {
                let v = View::new(&b);
                squad.insert(v.u32(0), v.u32(4));
            }
        }
        squad
    }

    fn live_prepared(&self) -> Vec<u64> {
        let vt = self.prepared_vt;
        self.prepared
            .iter()
            .copied()
            .filter(|&a| self.mem.u64(a) == vt)
            .collect()
    }

    pub fn tactic(&mut self) -> Option<Tactic> {
        self.prepared_vt?;
        let squad = self.squad_ids();
        if squad.is_empty() {
            return None;
        }
        let all_moved = !self.prepared.is_empty() && self.live_prepared().is_empty();
        let mut found = if all_moved {
            None
        } else {
            self.tactic_from_cache(&squad)
        };
        if found.is_none() && (all_moved || self.had_tactic) {
            self.scan();
            found = self.tactic_from_cache(&squad);
        }
        self.had_tactic = found.is_some();
        found
    }

    fn tactic_from_cache(&mut self, squad: &HashMap<u32, u32>) -> Option<Tactic> {
        let mut candidates: Vec<(u64, Vec<u8>, Vec<Option<u32>>)> = self
            .live_prepared()
            .into_iter()
            .filter_map(|a| {
                let bytes = self.mem.read(a, ARRAY_SIZE)?;
                let ids = lineup(&bytes);
                is_squad_lineup(&ids, squad).then_some((a, bytes, ids))
            })
            .collect();
        candidates.sort_by_key(|(a, _, ids)| (std::cmp::Reverse(squad_players(ids, squad)), *a));
        candidates
            .into_iter()
            .find_map(|(_, bytes, ids)| self.read_tactic(&bytes, &ids, squad))
    }

    fn read_tactic(
        &mut self,
        array: &[u8],
        ids: &[Option<u32>],
        squad: &HashMap<u32, u32>,
    ) -> Option<Tactic> {
        let object = nonzero(self.mem.ptr(tactic_list(array)?))?;
        let bytes = self.mem.read(object, TACTIC_SIZE)?;
        let pairs = decode_slots(&bytes)?;
        let (name, style) = text_pointers(&bytes);
        let name = self.lstr(Some(name))?;
        let style = self.lstr(Some(style));
        Some(assemble(name, style, pairs, ids, squad))
    }

    fn human_clubs(&mut self) -> Vec<u64> {
        self.ensure_scanned();
        self.humans
            .iter()
            .filter_map(|&h| {
                let c = nonzero(self.mem.ptr(at(h, HUMAN_CONTRACT)))?;
                let team = nonzero(self.mem.ptr(at(c, CONTRACT_TEAM)))?;
                nonzero(self.mem.ptr(at(team, TEAM_CLUB)))
            })
            .collect()
    }

    pub fn club_by_uid(&mut self, uid: u32) -> Option<u64> {
        let is_it = |g: &Self, club: u64| g.mem.u32(at(club, CLUB_UID)) == Some(uid);
        if let Some(club) = self.human_clubs().into_iter().find(|&c| is_it(self, c)) {
            return Some(club);
        }
        self.teams
            .iter()
            .filter_map(|&t| nonzero(self.mem.ptr(at(t, TEAM_CLUB))))
            .find(|&c| is_it(self, c))
    }

    pub fn club_finances(&mut self, club_uid: u32) -> Option<ClubFinances> {
        let offsets = self.prof.finances.filter(|_| self.known_build)?;
        let club = self.club_by_uid(club_uid)?;
        let finance = nonzero(self.mem.ptr(at(club, offsets.club_finance)))?;
        let vt = self.mem.u64(finance)?;
        let class = class_name(&*self.mem, self.build.module.base, vt);
        if class.as_deref() != Some(CLUB_FINANCE_CLASS) {
            return None;
        }
        let field = |off: i64| self.mem.i32(at(finance, off)).map(i64::from);
        let transfer_budget = match field(offsets.transfer_budget)? {
            1..=499 => 0,
            budget => budget,
        };
        Some(ClubFinances {
            transfer_budget,
            wage_budget_weekly: field(offsets.wage_budget)?,
            wage_bill_weekly: field(offsets.wage_bill)?,
            verified: offsets.verified,
        })
    }

    fn stats_object(&self, player: u64) -> Option<u64> {
        let q = nonzero(
            self.mem
                .ptr(at(player, self.prof.p_stats - self.shift(player))),
        )?;
        nonzero(Some(at(q, self.prof.stats_to_start)))
    }

    fn keeper_saves(&self, player: u64, scope: Scope) -> Option<Keeper> {
        if !self.prof.keeper_saves_summed {
            return None;
        }
        let so = self.stats_object(player)?;
        let mut out = Keeper::default();
        let single = [scope.slot()];
        for &slot in scope.competitions().unwrap_or(&single) {
            let e = nonzero(self.mem.ptr(at(so, slot)));
            let Some(eb) = e.and_then(|e| self.mem.read(e, ENTRY_SIZE)) else {
                continue;
            };
            let entry = read_entry(&eb);
            out.clean_sheets += entry.clean_sheets;
            let Some(rb) = self.mem.read(View::new(&eb).u64(0), RECORD_SIZE) else {
                continue;
            };
            let rec = read_record(&rb);
            let saves = rec.hdr_att + rec.hdr_won + rec.saves_tipped;
            let conceded = entry.conceded;
            if saves != 0 && saves >= conceded {
                out.saves += saves;
                out.conceded += conceded;
                out.minutes += entry.minutes;
                out.xgp100 += rec.op_crs_cmp - conceded * 100;
            }
        }
        Some(out)
    }

    fn season_total(&self, player: u64, slots: &[i64]) -> (Option<Season>, Record) {
        let (mut e, mut rec) = (None::<Season>, Record::default());
        let Some(so) = self.stats_object(player) else {
            return (e, rec);
        };
        for &slot in slots {
            let entry = nonzero(self.mem.ptr(at(so, slot)));
            let Some(eb) = entry.and_then(|entry| self.mem.read(entry, ENTRY_SIZE)) else {
                continue;
            };
            let one = read_entry(&eb);
            match &mut e {
                Some(sum) => sum.add(&one),
                None => e = Some(one),
            }
            if let Some(rb) = self.mem.read(View::new(&eb).u64(0), RECORD_SIZE) {
                rec.add(&read_record(&rb));
            }
        }
        (e, rec)
    }

    fn season_entry(&self, player: u64, slot: i64) -> Option<u64> {
        let so = self.stats_object(player)?;
        nonzero(self.mem.ptr(at(so, slot)))
    }

    fn active_loan(&self, loans: u64, today: Option<NaiveDate>) -> Option<Vec<u8>> {
        let loan = if loans != 0 {
            nonzero(self.mem.ptr(loans))
        } else {
            None
        };
        let lb = loan.and_then(|loan| self.mem.read(loan, CONTRACT_SIZE))?;
        let v = View::new(&lb);
        if Some(v.u64(0)) != self.loan_vt {
            return None;
        }
        let start = unpack_date(v.u32(CONTRACT_START));
        let stop = unpack_date(v.u32(CONTRACT_END));
        let active = match (today, start, stop) {
            (Some(today), Some(start), Some(stop)) => start <= today && today <= stop,
            _ => true,
        };
        (active && v.u64(CONTRACT_TEAM) != 0).then_some(lb)
    }

    fn team_rosters(&mut self) -> HashMap<(u64, u64), String> {
        let players: HashSet<u64> = self.players.iter().flatten().copied().collect();
        let mut out = HashMap::new();
        let mut unlisted = HashSet::new();
        for &t in &self.teams {
            let Some(d) = self.mem.read(t, TEAM_ROSTER as usize + 0x10) else {
                continue;
            };
            let v = View::new(&d);
            let (first, end) = (v.u64(TEAM_ROSTER), v.u64(TEAM_ROSTER + 8));
            if first == 0 || end <= first || end - first > 0x1000 {
                continue;
            }
            let Some(ids) = self
                .mem
                .read(first, (end - first) as usize)
                .filter(|ids| ids.len() % 8 == 0)
            else {
                continue;
            };
            let age = v.u8(TEAM_AGE);
            let name = if age < 100 {
                format!("U{age}")
            } else if v.u32(TEAM_SECOND) != 0 {
                "Reserves".to_string()
            } else {
                "Senior Team".to_string()
            };
            let club = v.u64(TEAM_CLUB);
            let (pointers, _) = ids.as_chunks::<8>();
            for p in pointers.iter().map(|&c| u64::from_le_bytes(c)) {
                let a = [PLAYER_SUBOBJECT, STAFF_PLAYER_SUBOBJECT]
                    .into_iter()
                    .map(|s| at(p, s))
                    .find(|a| players.contains(a));
                match a {
                    Some(a) => {
                        out.insert((a, club), name.clone());
                    }
                    None => {
                        unlisted.insert(p);
                    }
                }
            }
        }
        self.unlisted = unlisted
            .into_iter()
            .filter(|&p| self.mem.u64(p) != self.virtual_vt)
            .count();
        out
    }

    fn read_history(&self) -> Option<HistoryStore> {
        let global = self.prof.history.filter(|_| self.known_build)?;
        let mem = &*self.mem;
        let manager = nonzero(mem.u64(self.build.module.base + global))?;
        let container = nonzero(mem.u64(manager + MANAGER_CONTAINER))?;
        if mem.u64(container + CONTAINER_LIST)? != 0 {
            return None;
        }
        let store = nonzero(mem.u64(container))?;
        let row_size = mem.u32(store + STORE_ROW_SIZE)?;
        let version = mem.u16(store + STORE_VERSION)?;
        if row_size as usize != ROW_SIZE || u32::from(version) != ROW_VERSION {
            return None;
        }
        let (begin, end) = (
            mem.u64(store + STORE_INDEX_BEGIN)?,
            mem.u64(store + STORE_INDEX_END)?,
        );
        let keys = (end.checked_sub(begin)? as usize) / INDEX_STRIDE;
        if keys == 0 || keys > MAX_KEYS {
            return None;
        }
        let items = index_items(&mem.read(begin, keys * INDEX_STRIDE)?);
        let file = std::fs::read(history_file()?).ok()?;
        Some(HistoryStore { items, file })
    }

    fn past_seasons(&self, key: u32, scope: Scope) -> Vec<PastSeason> {
        let Some(store) = &self.history else {
            return Vec::new();
        };
        let Some(&(begin, end)) = store.items.get(key as usize) else {
            return Vec::new();
        };
        let count = (end.saturating_sub(begin) as usize / 4).min(MAX_ROWS_PER_PLAYER);
        if count == 0 {
            return Vec::new();
        }
        let Some(bytes) = self.mem.read(begin, count * 4) else {
            return Vec::new();
        };
        let offsets = offsets(&bytes);
        history::past_seasons(store.rows(&offsets), scope)
    }

    pub fn read_player(
        &mut self,
        a: u64,
        today: Option<NaiveDate>,
        scope: Scope,
        require_minutes: bool,
    ) -> Option<PlayerRecord> {
        let has_minutes = |e: &Option<Season>| e.as_ref().is_some_and(|e| e.minutes != 0);
        let entry = self.season_entry(a, scope.slot());
        let eb = entry.and_then(|entry| self.mem.read(entry, ENTRY_SIZE));
        let mut e = eb.as_deref().map(read_entry);
        if require_minutes && scope != Scope::All && !has_minutes(&e) {
            return None;
        }
        let mut rec = Record::default();
        if let Some(eb) = &eb {
            let rp = nonzero(Some(View::new(eb).u64(0)));
            if let Some(rb) = rp.and_then(|rp| self.mem.read(rp, RECORD_SIZE)) {
                rec = read_record(&rb);
            }
        }
        if scope == Scope::All && self.prof.partial_records {
            (e, rec) = self.season_total(a, Scope::All.competitions().unwrap_or_default());
        }
        if require_minutes && !has_minutes(&e) {
            return None;
        }

        let back = self.shift(a);
        let start = P_BEFORE + back;
        let b = self.mem.read(at(a, -start), (start + P_AFTER) as usize)?;
        let v = View {
            b: &b,
            origin: start,
        };
        let before = |o: i64| o - back;

        let common = self.name_ref(v.u64(P_COMMON));
        let (first, last) = (self.name_ref(v.u64(P_FIRST)), self.name_ref(v.u64(P_LAST)));
        let joined = [first, last]
            .into_iter()
            .flatten()
            .collect::<Vec<_>>()
            .join(" ");
        let name = common
            .or_else(|| (!joined.is_empty()).then_some(joined))
            .or_else(|| self.lstr(Some(v.u64(P_FULL_NAME))))
            .unwrap_or_else(|| "?".to_string());

        let nation = v.u64(P_NATION);
        let contract = v.u64(P_CONTRACT);
        let cb = if contract != 0 {
            self.mem.read(contract, CONTRACT_SIZE)
        } else {
            None
        };
        let cv = cb.as_deref().map(View::new);
        let home = cv.map(|c| c.u64(CONTRACT_TEAM));
        let loan = self.active_loan(v.u64(P_LOANS), today);
        let team = loan
            .as_deref()
            .map(|l| View::new(l).u64(CONTRACT_TEAM))
            .or(home);
        let squad_number = loan.as_deref().or(cb.as_deref()).and_then(squad_number);
        let (club, owner) = (self.team_club(team), self.team_club(home));
        let (club_name, club_uid) = self.club_info(club);
        let (owner_name, owner_uid) = self.club_info(owner);
        let (nat, nation_name) = self.nation_info(nation);
        let dob = unpack_date(v.u32(P_DOB));
        let age = match (dob, today) {
            (Some(dob), Some(today)) => Some(
                today.year()
                    - dob.year()
                    - i32::from((today.month(), today.day()) < (dob.month(), dob.day())),
            ),
            _ => None,
        };
        let pos = v.bytes(before(P_POS), 15).to_vec();
        let (lf, rf) = (
            i32::from(v.u8(before(P_LEFT))),
            i32::from(v.u8(before(P_RIGHT))),
        );
        let foot = if (lf - rf).abs() <= 10 && lf.min(rf) >= 70 {
            "Either"
        } else if lf > rf {
            "Left"
        } else {
            "Right"
        };
        let attrs = v
            .bytes(before(P_ATTRS), ATTRS.len())
            .iter()
            .zip(SHOWN_ATTRS.iter())
            .filter(|&(_, &shown)| shown)
            .map(|(&value, _)| value)
            .collect();
        let is_keeper = pos[0] >= ACCOMPLISHED && pos.iter().max() == Some(&pos[0]);
        let moved = owner != club;
        let (division, competition_reputation) = self.division(team);
        Some(PlayerRecord {
            uid: v.u32(P_UID),
            name,
            position: position_string(&pos),
            age,
            dob,
            nat,
            nation: nation_name,
            club: club_name,
            club_uid,
            owner: if moved { owner_name } else { None },
            owner_uid: if nonzero(owner).is_some() && moved {
                owner_uid
            } else {
                None
            },
            division,
            competition_reputation,
            team: club.and_then(|club| self.team_of.get(&(a, club)).cloned()),
            owner_team: if moved {
                owner.and_then(|owner| self.team_of.get(&(a, owner)).cloned())
            } else {
                None
            },
            wage: cv.map(|c| c.u32(CONTRACT_WAGE)),
            contract_end: cv
                .and_then(|c| unpack_date(c.u32(CONTRACT_END)))
                .filter(|d| d.year() >= 1950),
            squad_number,
            value: v.u32(before(P_VALUE)),
            height: v.u8(before(P_HEIGHT)),
            foot: foot.to_string(),
            ca: v.u8(before(P_CA)),
            pa: v.u8(before(P_PA)),
            attrs,
            personality: v.bytes(P_PERSONALITY, 8).to_vec(),
            season: e,
            record: rec,
            keeper: if is_keeper {
                self.keeper_saves(a, scope)
            } else {
                None
            },
            partial_detail: self.prof.partial_records,
            past_seasons: self.past_seasons(v.u32(P_HISTORY_KEY), scope),
            pos,
        })
    }

    pub fn read_all(
        &mut self,
        scope: Scope,
        require_minutes: bool,
        mut progress: impl FnMut(usize, usize),
    ) -> Result<(Option<NaiveDate>, Vec<PlayerRecord>)> {
        let today = self.today();
        let ps = self.players(false)?.to_vec();
        self.once_memo = OnceMemo::default();
        self.team_of = self.team_rosters();
        self.history = self.read_history();
        let mut out: Vec<PlayerRecord> = Vec::new();
        let mut index: HashMap<u32, usize> = HashMap::new();
        for (i, &a) in ps.iter().enumerate() {
            if let Some(r) = self.read_player(a, today, scope, require_minutes) {
                match index.get(&r.uid) {
                    None => {
                        index.insert(r.uid, out.len());
                        out.push(r);
                    }
                    Some(&k) if r.team.is_some() && out[k].team.is_none() => out[k] = r,
                    Some(_) => {}
                }
            }
            if i % 2000 == 0 {
                progress(i, ps.len());
            }
        }
        Ok((today, out))
    }
}

#[cfg(test)]
#[path = "game_tests.rs"]
mod tests;
