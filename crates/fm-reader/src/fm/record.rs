use chrono::NaiveDate;
use serde::{Deserialize, Serialize};

use super::money::Money;
use super::profile::Scope;
use super::tactic::Tactic;

macro_rules! counters {
    ($(#[$meta:meta])* $name:ident { $($field:ident),+ $(,)? }) => {
        $(#[$meta])*
        #[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
        pub struct $name {
            $(pub $field: i32,)+
        }

        impl $name {
            pub const FIELDS: &'static [&'static str] = &[$(stringify!($field)),+];

            pub fn values_mut(&mut self) -> impl Iterator<Item = &mut i32> + '_ {
                [$(&mut self.$field),+].into_iter()
            }

            pub fn add(&mut self, other: &Self) {
                $(self.$field += other.$field;)+
            }

            pub fn values(&self) -> Vec<i32> {
                vec![$(self.$field),+]
            }
        }
    };
}

counters! {
    Season {
        rating_sum, minutes, starts, subs, rated, goals, assists, conceded, pens_taken, pens_scored,
        motm, red, yellow, clean_sheets,
    }
}

counters! {
    Record {
        pas_att, pas_cmp, tck_att, tck_won, hdr_att, hdr_won, drb, fouls, fouls_won, shots, sot,
        distance10, offsides, saves_tipped, op_crs_cmp, kp, tck_key, hdr_key, int, ccc, blocks,
        poss_lost, poss_won, xg100, xa100, clr, fk, goals_out, op_crs_att, shots_out, xgp100,
        sprints, pr_passes, pres_att, pres_cmp, op_kp, npxg100, crs_att, crs_cmp, shots_blk, hdr_lost,
    }
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct Keeper {
    pub saves: i32,
    pub conceded: i32,
    pub minutes: i32,
    pub xgp100: i32,
    pub clean_sheets: i32,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PlayerRecord {
    pub uid: u32,
    pub name: String,
    pub pos: Vec<u8>,
    pub position: String,
    pub age: Option<i32>,
    pub dob: Option<NaiveDate>,
    pub nat: Option<String>,
    pub nation: Option<String>,
    pub club: Option<String>,
    pub club_uid: Option<u32>,
    pub owner: Option<String>,
    pub owner_uid: Option<u32>,
    pub division: Option<String>,
    pub competition_reputation: Option<u16>,
    pub team: Option<String>,
    pub owner_team: Option<String>,
    pub wage: Option<u32>,
    pub contract_end: Option<NaiveDate>,
    pub squad_number: Option<u8>,
    pub value: u32,
    pub height: u8,
    pub foot: String,
    pub ca: u8,
    pub pa: u8,
    pub attrs: Vec<u8>,
    pub personality: Vec<u8>,
    pub season: Option<Season>,
    pub record: Record,
    pub keeper: Option<Keeper>,
    pub partial_detail: bool,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub past_seasons: Vec<PastSeason>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PastSeason {
    pub year: u16,
    pub season: Vec<i32>,
    pub record: Vec<i32>,
    pub partial: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ClubRef {
    pub name: String,
    pub uid: Option<u32>,
}

pub const READER_ONLY_FIELDS: [&str; 3] =
    ["competition_reputation", "squad_number", "past_seasons"];

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ClubFinances {
    pub transfer_budget: i64,
    pub wage_budget_weekly: i64,
    pub wage_bill_weekly: i64,
    pub verified: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Snapshot {
    pub build: String,
    pub scope: Scope,
    pub date: Option<NaiveDate>,
    pub my_clubs: Vec<ClubRef>,
    pub seconds: f64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub money: Option<Money>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tactic: Option<Tactic>,
    pub players: Vec<PlayerRecord>,
}
