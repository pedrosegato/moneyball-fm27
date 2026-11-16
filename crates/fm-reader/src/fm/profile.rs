use std::str::FromStr;
use std::sync::LazyLock;

use serde::{Deserialize, Serialize};

use crate::memory::ReaderError;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Profile {
    pub name: &'static str,
    pub p_stats: i64,
    pub stats_to_start: i64,
    pub human_subobject: i64,
    pub keeper_saves_summed: bool,
    pub partial_records: bool,
    pub clock_date: Option<i64>,
    pub team_rosters: bool,
    pub every_player: bool,
    pub finances: Option<FinanceOffsets>,
    pub comp_reputation: Option<i64>,
    pub money: Option<MoneyOffsets>,
    pub tactic: bool,
    pub history: Option<u64>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FinanceOffsets {
    pub club_finance: i64,
    pub transfer_budget: i64,
    pub wage_budget: i64,
    pub wage_bill: i64,
    pub verified: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct MoneyOffsets {
    pub currency_block: u64,
    pub wage_period: u64,
}

const FM26: Profile = Profile {
    name: "FM26",
    p_stats: 0x248,
    stats_to_start: -0x88,
    human_subobject: 0x478,
    keeper_saves_summed: false,
    partial_records: false,
    clock_date: None,
    team_rosters: false,
    every_player: false,
    finances: None,
    comp_reputation: None,
    money: None,
    tactic: false,
    history: None,
};

const FM27: Profile = Profile {
    name: "FM27",
    p_stats: -0x180,
    stats_to_start: 0x20,
    human_subobject: 0x468,
    keeper_saves_summed: true,
    partial_records: true,
    clock_date: Some(0x7F4),
    team_rosters: true,
    every_player: true,
    finances: None,
    comp_reputation: None,
    money: None,
    tactic: false,
    history: None,
};

pub const PROFILES: [(&str, Profile); 4] = [
    ("6A229F1E-1D8D3000", FM26),
    ("6ADFB11C-19E69000", FM27),
    (
        "6AE563A1-175DA000",
        Profile {
            name: "FM27 0.9.2409",
            ..FM27
        },
    ),
    (
        "6AE8CF77-17969000",
        Profile {
            name: "FM27 0.9.2435",
            finances: Some(FinanceOffsets {
                club_finance: 0x150,
                transfer_budget: 0x7C4,
                wage_budget: 0x808,
                wage_bill: 0x810,
                verified: false,
            }),
            comp_reputation: Some(0x188),
            money: Some(MoneyOffsets {
                currency_block: 0x53B_B708,
                wage_period: 0x537_1160,
            }),
            tactic: true,
            history: Some(0x53A_9310),
            ..FM27
        },
    ),
];
pub const LATEST: &str = "6AE8CF77-17969000";

pub fn profile_for(build_id: &str) -> Option<&'static Profile> {
    PROFILES
        .iter()
        .find(|(id, _)| *id == build_id)
        .map(|(_, p)| p)
}

pub const PLAYER_CLASS: &str = ".?AVACTUAL_PLAYER@db@@";
pub const PLAYER_SUBOBJECT: i64 = 0x288;
pub const STAFF_PLAYER_CLASS: &str = ".?AVACTUAL_PLAYER_AND_NON_PLAYER@db@@";
pub const STAFF_PLAYER_SUBOBJECT: i64 = 0x380;
pub const STAFF_PLAYER_SHIFT: i64 = 0xF8;
pub const VIRTUAL_CLASS: &str = ".?AVVIRTUAL_PLAYER@db@@";
pub const LOAN_CLASS: &str = ".?AVLOAN_CONTRACT@db@@";
pub const HUMAN_CLASS: &str = ".?AVHUMAN_NON_PLAYER@db@@";
pub const CLOCK_CLASS: &str = ".?AVTRANSFER_MANAGER@@";
pub const TEAM_CLASS: &str = ".?AVTEAM@db@@";
pub const CLUB_FINANCE_CLASS: &str = ".?AVCLUB_FINANCE@db@@";
pub const HUMAN_CONTRACT: i64 = 0x80;

pub const P_BEFORE: i64 = 0x140;
pub const P_AFTER: i64 = 0x2A0;
pub const P_ID: i64 = 0x08;
pub const P_UID: i64 = 0x0C;
pub const P_UID2: i64 = 0x10;
pub const P_FULL_NAME: i64 = 0x40;
pub const P_FIRST: i64 = 0x50;
pub const P_LAST: i64 = 0x58;
pub const P_COMMON: i64 = 0x60;
pub const P_NATION: i64 = 0x68;
pub const P_DOB: i64 = 0x88;
pub const P_CONTRACT: i64 = 0xA8;
pub const P_LOANS: i64 = 0xB0;
pub const P_UPDATED: i64 = 0x11C;
pub const P_POS: i64 = -0x138;
pub const P_LEFT: i64 = -0x111;
pub const P_RIGHT: i64 = -0x110;
pub const P_HEIGHT: i64 = -0x5A;
pub const P_VALUE: i64 = -0x54;
pub const P_CA: i64 = -0x24;
pub const P_PA: i64 = -0x22;
pub const P_ATTRS: i64 = -0x129;
#[rustfmt::skip]
pub const ATTRS: [&str; 54] = [
    "Crossing", "Dribbling", "Finishing", "Heading", "Long Shots", "Marking", "Off The Ball", "Passing",
    "Penalty Taking", "Tackling", "Vision", "Handling", "Aerial Reach", "Command Of Area", "Communication", "Kicking",
    "Throwing", "Anticipation", "Decisions", "One On Ones", "Positioning", "Reflexes", "First Touch", "Technique",
    "Left Foot", "Right Foot", "Flair", "Corners", "Teamwork", "Work Rate", "Long Throws", "Eccentricity",
    "Rushing Out", "Punching", "Acceleration", "Free Kick Taking", "Strength", "Stamina", "Pace", "Jumping Reach",
    "Leadership", "Dirtiness", "Balance", "Bravery", "Consistency", "Aggression", "Agility", "Important Matches",
    "Injury Proneness", "Versatility", "Natural Fitness", "Determination", "Composure", "Concentration",
];
#[rustfmt::skip]
pub const HIDDEN_ATTRS: [&str; 5] = ["Dirtiness", "Consistency", "Important Matches", "Injury Proneness", "Versatility"];
pub static SHOWN_ATTRS: LazyLock<[bool; 54]> = LazyLock::new(|| {
    ATTRS.map(|a| !HIDDEN_ATTRS.contains(&a) && a != "Left Foot" && a != "Right Foot")
});
pub const P_PERSONALITY: i64 = 0x70;

pub const CONTRACT_TEAM: i64 = 0x10;
pub const CONTRACT_WAGE: i64 = 0x20;
pub const CONTRACT_START: i64 = 0x44;
pub const CONTRACT_END: i64 = 0x48;
pub const CONTRACT_SQUAD_NUMBER: i64 = 0x5D;
pub const CONTRACT_SIZE: usize = 0x60;
pub const CLUB_UID: i64 = 0x0C;
pub const TEAM_CLUB: i64 = 0x30;
pub const TEAM_COMP: i64 = 0x50;
pub const TEAM_SECOND: i64 = 0x28;
pub const TEAM_AGE: i64 = 0x2C;
pub const TEAM_ROSTER: i64 = 0x38;
pub const CLUB_LONG: i64 = 0xC0;
pub const CLUB_SHORT: i64 = 0xC8;
pub const COMP_NAME: i64 = 0x40;
pub const MAX_REPUTATION: u16 = 200;
pub const NATION_CODE: i64 = 0x28;
pub const NATION_NAME: i64 = 0x18;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Scope {
    Competitive,
    League,
    All,
    Cups,
    Continental,
}

impl Scope {
    pub const EVERY: [Scope; 5] = [
        Scope::Competitive,
        Scope::League,
        Scope::All,
        Scope::Cups,
        Scope::Continental,
    ];

    pub fn key(self) -> &'static str {
        match self {
            Scope::Competitive => "competitive",
            Scope::League => "league",
            Scope::All => "all",
            Scope::Cups => "cups",
            Scope::Continental => "continental",
        }
    }

    pub fn slot(self) -> i64 {
        match self {
            Scope::Competitive => 0x28,
            Scope::League => 0x08,
            Scope::All => 0x30,
            Scope::Cups => 0x10,
            Scope::Continental => 0x18,
        }
    }

    pub fn competitions(self) -> Option<&'static [i64]> {
        match self {
            Scope::Competitive => Some(&[0x08, 0x10, 0x18]),
            Scope::All => Some(&[0x00, 0x08, 0x10, 0x18, 0x20]),
            _ => None,
        }
    }
}

impl std::fmt::Display for Scope {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.key())
    }
}

impl FromStr for Scope {
    type Err = ReaderError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Scope::EVERY
            .into_iter()
            .find(|scope| scope.key() == s)
            .ok_or_else(|| ReaderError::UnknownScope(s.to_string()))
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Width {
    U8,
    U16,
    I16,
}

pub const ENTRY_SIZE: usize = 0x20;
pub const ENTRY: [(&str, i64, Width); 14] = [
    ("rating_sum", 0x08, Width::U16),
    ("minutes", 0x0A, Width::U16),
    ("starts", 0x0C, Width::U8),
    ("subs", 0x0D, Width::U8),
    ("rated", 0x0E, Width::U8),
    ("goals", 0x0F, Width::U8),
    ("assists", 0x10, Width::U8),
    ("conceded", 0x11, Width::U8),
    ("pens_taken", 0x12, Width::U8),
    ("pens_scored", 0x13, Width::U8),
    ("motm", 0x14, Width::U8),
    ("red", 0x15, Width::U8),
    ("yellow", 0x16, Width::U8),
    ("clean_sheets", 0x17, Width::U8),
];

pub const RECORD_SIZE: usize = 0x78;
pub const RECORD: [(&str, i64, Width); 41] = [
    ("pas_att", 0x08, Width::U16),
    ("pas_cmp", 0x0A, Width::U16),
    ("tck_att", 0x0C, Width::U16),
    ("tck_won", 0x0E, Width::U16),
    ("hdr_att", 0x10, Width::U16),
    ("hdr_won", 0x12, Width::U16),
    ("drb", 0x14, Width::U16),
    ("fouls", 0x16, Width::U16),
    ("fouls_won", 0x18, Width::U16),
    ("shots", 0x1A, Width::U16),
    ("sot", 0x1C, Width::U16),
    ("distance10", 0x2E, Width::U16),
    ("offsides", 0x30, Width::U16),
    ("saves_tipped", 0x32, Width::U16),
    ("op_crs_cmp", 0x34, Width::U16),
    ("kp", 0x36, Width::U16),
    ("tck_key", 0x38, Width::U16),
    ("hdr_key", 0x3A, Width::U16),
    ("int", 0x3C, Width::U16),
    ("ccc", 0x3E, Width::U16),
    ("blocks", 0x40, Width::U16),
    ("poss_lost", 0x44, Width::U16),
    ("poss_won", 0x46, Width::U16),
    ("xg100", 0x48, Width::U16),
    ("xa100", 0x4A, Width::U16),
    ("clr", 0x4C, Width::U16),
    ("fk", 0x50, Width::U16),
    ("goals_out", 0x52, Width::U16),
    ("op_crs_att", 0x5A, Width::U16),
    ("shots_out", 0x5C, Width::U16),
    ("xgp100", 0x5E, Width::I16),
    ("sprints", 0x60, Width::U16),
    ("pr_passes", 0x64, Width::U16),
    ("pres_att", 0x66, Width::U16),
    ("pres_cmp", 0x68, Width::U16),
    ("op_kp", 0x6A, Width::U16),
    ("npxg100", 0x6C, Width::U16),
    ("crs_att", 0x70, Width::U16),
    ("crs_cmp", 0x72, Width::U16),
    ("shots_blk", 0x74, Width::U16),
    ("hdr_lost", 0x76, Width::U16),
];

#[rustfmt::skip]
pub const POS_NAMES: [&str; 15] = ["GK", "SW", "DL", "DC", "DR", "DM", "ML", "MC", "MR", "AML", "AMC", "AMR", "ST", "WBL", "WBR"];
pub const ACCOMPLISHED: u8 = 15;

#[cfg(test)]
mod tests {
    use super::*;
    use crate::fm::record::{Record, Season};

    #[test]
    fn scope_parses_python_keys() {
        for (key, slot) in [
            ("competitive", 0x28),
            ("league", 0x08),
            ("all", 0x30),
            ("cups", 0x10),
            ("continental", 0x18),
        ] {
            let scope: Scope = key.parse().unwrap();
            assert_eq!((scope.key(), scope.slot()), (key, slot));
        }
        assert!(matches!(
            "friendlies".parse::<Scope>(),
            Err(ReaderError::UnknownScope(_))
        ));
        assert!("Competitive".parse::<Scope>().is_err());
    }

    #[test]
    fn record_and_season_fields_follow_layout_tables() {
        assert_eq!(Record::FIELDS, RECORD.map(|(name, _, _)| name));
        assert_eq!(Season::FIELDS, ENTRY.map(|(name, _, _)| name));
    }

    #[test]
    fn shown_attrs_drop_hidden_and_feet() {
        let shown: Vec<usize> = (0..ATTRS.len()).filter(|&i| !SHOWN_ATTRS[i]).collect();
        assert_eq!(shown, [24, 25, 41, 44, 47, 48, 49]);
    }

    #[test]
    fn unknown_build_has_no_profile() {
        assert_eq!(
            profile_for("6AE8CF77-17969000").unwrap().name,
            "FM27 0.9.2435"
        );
        assert_eq!(profile_for(LATEST).unwrap().clock_date, Some(0x7F4));
        assert!(profile_for(LATEST).unwrap().tactic);
        assert!(!profile_for("6A229F1E-1D8D3000").unwrap().tactic);
        assert!(profile_for("00000000-0").is_none());
    }
}
