use std::path::{Path, PathBuf};

use memchr::memmem;
use serde::{Deserialize, Serialize};

use crate::memory::{chunks, MemorySource, Region, DEFAULT_CHUNK};

pub const CURRENCY_CLASS: &str = ".?AVCURRENCY_RECORD@db@@";
pub const RECORD_UID: i64 = 0x0C;
pub const RECORD_NAME: i64 = 0x18;
pub const RECORD_SHORT_NAME: i64 = 0x20;
pub const RECORD_SYMBOL: i64 = 0x30;
pub const RECORD_RATE: i64 = 0x38;

pub const LISTED_CURRENCIES: usize = 66;
const BLOCK_READY: usize = 4;
const BLOCK_CHOSEN: usize = 5;
const BLOCK_RATES: usize = 8;
const ENTRY_SIZE: usize = 0x20;
pub const BLOCK_SIZE: usize = BLOCK_RATES + LISTED_CURRENCIES * ENTRY_SIZE;
const NOT_CHOSEN_YET: u8 = 0xFF;
const SIGNATURE_ENTRIES: [usize; 3] = [4, 7, 24];

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum WagePeriod {
    Week,
    Month,
    Year,
}

impl WagePeriod {
    pub fn from_preference(value: i64) -> Option<Self> {
        match value {
            1 => Some(Self::Week),
            2 => Some(Self::Month),
            3 => Some(Self::Year),
            _ => None,
        }
    }

    fn weeks_over(self) -> (f64, f64) {
        match self {
            Self::Week => (1.0, 1.0),
            Self::Month => (52.0, 12.0),
            Self::Year => (52.0, 1.0),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Currency {
    pub code: String,
    pub symbol: String,
    pub name: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Money {
    pub currency: Currency,
    pub rate: f64,
    pub wage_period: WagePeriod,
}

impl Money {
    pub fn shown(&self, pounds: f64) -> f64 {
        (pounds * self.rate).round()
    }

    pub fn shown_wage(&self, weekly_pounds: f64) -> f64 {
        let (weeks, over) = self.wage_period.weeks_over();
        ((weekly_pounds * weeks / over).trunc() * self.rate).round()
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct CurrencyRecord {
    pub uid: u32,
    pub rate: f32,
    pub name: Option<String>,
    pub short_name: Option<String>,
    pub symbol: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FoundBy {
    Content,
    BuildOffset,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct MoneyBlock {
    pub address: u64,
    pub found_by: FoundBy,
}

pub type Signature = [(usize, f64); 3];

struct Listed {
    uid: u32,
    code: &'static str,
    symbol: &'static str,
    name: &'static str,
}

const fn listed(uid: u32, code: &'static str, symbol: &'static str, name: &'static str) -> Listed {
    Listed {
        uid,
        code,
        symbol,
        name,
    }
}

#[rustfmt::skip]
const LISTED: [Listed; LISTED_CURRENCIES] = [
    listed(86, "GBP", "£", "United Kingdom Pound"),
    listed(4, "ARS", "$", "Argentinian Peso"),
    listed(5, "AUD", "$", "Australian Dollar"),
    listed(11, "BEF", "₣", "Belgian Franc"),
    listed(13, "BRL", "R$", "Brazilian Real"),
    listed(20, "HRK", "kn", "Croatian Kuna"),
    listed(23, "DKK", "kr.", "Danish Krone"),
    listed(28, "EUR", "€", "European Euro"),
    listed(30, "FIM", "mk", "Finnish Markka"),
    listed(31, "FRF", "₣", "French Franc"),
    listed(32, "DEM", "", "German Deutschmark"),
    listed(56, "NLG", "", "Dutch Guilder"),
    listed(33, "GRD", "₯", "Greek Drachma"),
    listed(41, "IEP", "£", "Irish Pound"),
    listed(43, "ITL", "₤", "Italian Lire"),
    listed(45, "JPY", "￥", "Japanese Yen"),
    listed(58, "NOK", "", "Norwegian Krone"),
    listed(63, "PLN", "", "Polish Zloty"),
    listed(64, "PTE", "", "Portuguese Escudo"),
    listed(67, "RUB", "руб", "Russian Ruble"),
    listed(74, "ESP", "₧", "Spanish Peseta"),
    listed(77, "SEK", "kr", "Swedish Krona"),
    listed(78, "CHF", "", "Swiss Franc"),
    listed(84, "TRY", "TL", "Turkish Lira"),
    listed(87, "USD", "$", "United States Dollar"),
    listed(73, "KRW", "₩", "South Korean Won"),
    listed(6, "ATS", "", "Austrian Schilling"),
    listed(95, "BYN", "Blr", "Belarus Ruble"),
    listed(16, "CLP", "$", "Chilean Peso"),
    listed(18, "COP", "$", "Colombian Peso"),
    listed(61, "PEN", "S/.", "Peruvian Nuevo Sol"),
    listed(94, "UYU", "$", "Uruguayan Peso"),
    listed(14, "BGN", "lv.", "Bulgarian Lev"),
    listed(17, "CNY", "￥", "Chinese Yuan"),
    listed(22, "CZK", "", "Czech Koruna"),
    listed(34, "HKD", "$", "Hong Kong Dollar"),
    listed(35, "HUF", "", "Hungarian Forint"),
    listed(38, "IDR", "Rp", "Indonesian Rupiah"),
    listed(37, "INR", "", "Indian Rupee"),
    listed(36, "ISK", "Kr.", "Icelandic Króna"),
    listed(42, "ILS", "₪", "Israeli New Shekel"),
    listed(51, "MYR", "RM", "Malaysian Ringgit"),
    listed(54, "MXN", "$", "Mexican Peso"),
    listed(66, "RON", "", "Romanian New Leu"),
    listed(72, "ZAR", "R", "South Africa Rand"),
    listed(69, "SGD", "S$", "Singaporean Dollar"),
    listed(70, "SKK", "", "Slovakian Koruna"),
    listed(71, "SIT", "", "Slovenian Tolar"),
    listed(80, "THB", "฿", "Thai Baht"),
    listed(91, "RSD", "din", "Serbian Dinar"),
    listed(2, "ALL", "Lek", "Albanian Lek"),
    listed(92, "BAM", "KM", "Bosnian Convertible Marka"),
    listed(93, "MKD", "Den", "Macedonian Denar"),
    listed(71_006_962, "UAH", "hrn", "Ukrainian Hrivna"),
    listed(15, "CAD", "$", "Canadian Dollar"),
    listed(62, "PHP", "₱", "Filipino Peso"),
    listed(57, "NZD", "$", "New Zealand Dollar"),
    listed(79, "", "", ""),
    listed(68, "SAR", "SR", "Saudi Arabian Riyal"),
    listed(85, "AED", "", "United Arab Emirates Dirham"),
    listed(19, "CRC", "₡", "Costa Rican Colón"),
    listed(96, "", "", ""),
    listed(48, "KWD", "KD", "Kuwaiti Dinar"),
    listed(65, "QAR", "QR", "Qatari Riyal"),
    listed(89, "VND", "₫", "Vietnamese Dong"),
    listed(26, "EGP", "£", "Egyptian Pound"),
];

pub fn listed_uid(index: u8) -> Option<u32> {
    LISTED.get(usize::from(index)).map(|l| l.uid)
}

fn rate_at(block: &[u8], index: usize) -> f64 {
    let at = BLOCK_RATES + index * ENTRY_SIZE;
    f64::from_le_bytes(block[at..at + 8].try_into().expect("8 bytes"))
}

pub fn block_is_whole(block: &[u8]) -> bool {
    block.len() >= BLOCK_SIZE
        && block[BLOCK_READY] == 1
        && (usize::from(block[BLOCK_CHOSEN]) < LISTED_CURRENCIES
            || block[BLOCK_CHOSEN] == NOT_CHOSEN_YET)
        && rate_at(block, 0) == 1.0
        && (0..LISTED_CURRENCIES).all(|i| {
            let rate = rate_at(block, i);
            rate.is_finite() && rate > 0.0
        })
}

pub fn signature(rate_of: impl Fn(u32) -> Option<f32>) -> Option<Signature> {
    let mut out = [(0, 0.0); 3];
    for (slot, index) in out.iter_mut().zip(SIGNATURE_ENTRIES) {
        *slot = (index, f64::from(rate_of(LISTED[index].uid)?));
    }
    Some(out)
}

pub fn block_matches(block: &[u8], signature: &Signature) -> bool {
    block_is_whole(block)
        && signature
            .iter()
            .all(|&(index, rate)| rate_at(block, index) == rate)
}

pub fn chosen(block: &[u8]) -> Option<(u8, f64)> {
    let index = *block.get(BLOCK_CHOSEN)?;
    (block_is_whole(block) && usize::from(index) < LISTED_CURRENCIES)
        .then(|| (index, rate_at(block, usize::from(index))))
}

pub fn find_block(
    mem: &dyn MemorySource,
    sections: &[Region],
    signature: &Signature,
) -> Option<u64> {
    let one = memmem::Finder::new(&1.0f64.to_le_bytes()).into_owned();
    chunks(mem, sections.to_vec(), DEFAULT_CHUNK, BLOCK_SIZE).find_map(|(base, buf)| {
        one.find_iter(&buf).find_map(|hit| {
            let start = hit.checked_sub(BLOCK_RATES)?;
            let address = base + start as u64;
            let block = buf.get(start..start + BLOCK_SIZE)?;
            (address.is_multiple_of(8) && block_matches(block, signature)).then_some(address)
        })
    })
}

fn text(s: &Option<String>) -> Option<String> {
    s.as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(str::to_string)
}

pub fn currency(index: u8, record: Option<&CurrencyRecord>) -> Option<Currency> {
    let listed = LISTED
        .get(usize::from(index))
        .filter(|l| !l.code.is_empty())?;
    let fixed = |s: &'static str| (!s.is_empty()).then(|| s.to_string());
    let symbol = record
        .and_then(|r| text(&r.symbol))
        .or_else(|| fixed(listed.symbol))
        .unwrap_or_else(|| listed.code.to_string());
    let name = record
        .and_then(|r| text(&r.short_name).or_else(|| text(&r.name)))
        .unwrap_or_else(|| listed.name.to_string());
    Some(Currency {
        code: listed.code.to_string(),
        symbol,
        name,
    })
}

pub fn default_preferences_dir() -> Option<PathBuf> {
    std::env::var_os("LOCALAPPDATA").map(|root| {
        PathBuf::from(root)
            .join("Sports Interactive")
            .join("Football Manager 27")
            .join("Preferences")
    })
}

pub fn preferred_wage_period(preferences: &Path) -> Option<WagePeriod> {
    let mut versions: Vec<(u32, PathBuf)> = std::fs::read_dir(preferences)
        .ok()?
        .filter_map(|entry| {
            let entry = entry.ok()?;
            let name = entry.file_name().into_string().ok()?;
            let version = name.strip_prefix("version ")?.parse().ok()?;
            Some((version, entry.path()))
        })
        .collect();
    versions.sort_unstable_by_key(|v| std::cmp::Reverse(v.0));
    versions.iter().find_map(|(_, dir)| {
        let xml = std::fs::read_to_string(dir.join("wage_string_type.xml")).ok()?;
        wage_period_in(&xml)
    })
}

fn wage_period_in(xml: &str) -> Option<WagePeriod> {
    let value = &xml[xml.find(" value=\"")? + 8..];
    let digits = &value[..value.find('"')?];
    WagePeriod::from_preference(digits.trim().parse().ok()?)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::memory::FakeMemory;

    const RECORDED: &[u8] = include_bytes!(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/testdata/currency-block-6AE8CF77-17969000.bin"
    ));
    const BRL: f32 = f32::from_bits(0x40DE_6E3B);
    const EUR: f32 = f32::from_bits(0x3F95_0144);
    const USD: f32 = f32::from_bits(0x3FAC_7EC8);

    fn database_rate(uid: u32) -> Option<f32> {
        match uid {
            13 => Some(BRL),
            28 => Some(EUR),
            87 => Some(USD),
            _ => None,
        }
    }

    fn recorded_signature() -> Signature {
        signature(database_rate).unwrap()
    }

    fn euros_monthly() -> Money {
        Money {
            currency: Currency {
                code: "EUR".into(),
                symbol: "€".into(),
                name: "Euro".into(),
            },
            rate: f64::from(EUR),
            wage_period: WagePeriod::Month,
        }
    }

    #[test]
    fn the_recorded_block_shows_euros_at_the_database_rate() {
        assert_eq!(RECORDED.len(), BLOCK_SIZE);
        assert!(block_matches(RECORDED, &recorded_signature()));
        assert_eq!(chosen(RECORDED), Some((7, 1.164_101_123_809_814_5)));
        assert_eq!(listed_uid(7), Some(28));
        assert_eq!(listed_uid(0), Some(86));
        assert_eq!(listed_uid(4), Some(13));
    }

    #[test]
    fn the_listed_order_starts_with_the_uids_the_game_keeps() {
        let first: Vec<u32> = (0..12).filter_map(listed_uid).collect();
        assert_eq!(first, [86, 4, 5, 11, 13, 20, 23, 28, 30, 31, 32, 56]);
        assert_eq!(listed_uid(65), Some(26));
        assert_eq!(listed_uid(66), None);
    }

    #[test]
    fn a_torn_or_unready_block_is_not_whole() {
        let mut block = RECORDED.to_vec();
        block[BLOCK_READY] = 0;
        assert!(!block_is_whole(&block));
        let mut block = RECORDED.to_vec();
        block[BLOCK_CHOSEN] = 66;
        assert!(!block_is_whole(&block));
        let mut block = RECORDED.to_vec();
        block[BLOCK_RATES + 7 * ENTRY_SIZE..][..8].copy_from_slice(&(-1.0f64).to_le_bytes());
        assert!(!block_is_whole(&block));
        assert!(!block_is_whole(&RECORDED[..BLOCK_SIZE - 1]));
    }

    #[test]
    fn a_block_before_the_first_choice_is_whole_but_has_no_currency() {
        let mut block = RECORDED.to_vec();
        block[BLOCK_CHOSEN] = NOT_CHOSEN_YET;
        assert!(block_is_whole(&block));
        assert_eq!(chosen(&block), None);
    }

    #[test]
    fn the_signature_needs_the_real_euro_and_dollar_records() {
        assert_eq!(
            recorded_signature(),
            [
                (4, 6.950_955_867_767_334),
                (7, 1.164_101_123_809_814_5),
                (24, 1.347_619_056_701_660_2)
            ]
        );
        assert_eq!(signature(|uid| (uid != 87).then_some(1.0)), None);
        let other = signature(|uid| database_rate(uid).map(|r| r * 1.01)).unwrap();
        assert!(!block_matches(RECORDED, &other));
    }

    #[test]
    fn find_block_finds_the_recorded_block_wherever_it_moved() {
        let sig = recorded_signature();
        for at in [0x18usize, 0x2000, 0x3FF8 - BLOCK_SIZE] {
            let mut data = vec![0u8; 0x4000];
            data[0x10..0x18].copy_from_slice(&1.0f64.to_le_bytes());
            data[at..at + BLOCK_SIZE].copy_from_slice(RECORDED);
            let mem = FakeMemory::new().with_region(0x7FF6_0000_0000, data, false);
            let sections: Vec<Region> = mem.regions(false).collect();
            assert_eq!(
                find_block(&mem, &sections, &sig),
                Some(0x7FF6_0000_0000 + at as u64),
                "block at +0x{at:X}"
            );
        }
    }

    #[test]
    fn find_block_ignores_a_misaligned_or_different_copy() {
        let sig = recorded_signature();
        let mut data = vec![0u8; 0x4000];
        data[0x104..0x104 + BLOCK_SIZE].copy_from_slice(RECORDED);
        let mut other = RECORDED.to_vec();
        other[BLOCK_RATES + 24 * ENTRY_SIZE..][..8].copy_from_slice(&1.5f64.to_le_bytes());
        data[0x1000..0x1000 + BLOCK_SIZE].copy_from_slice(&other);
        let mem = FakeMemory::new().with_region(0x1000_0000, data, false);
        let sections: Vec<Region> = mem.regions(false).collect();
        assert_eq!(find_block(&mem, &sections, &sig), None);
    }

    #[test]
    fn currency_takes_symbol_and_name_from_the_record_and_falls_back_to_the_list() {
        let euro = CurrencyRecord {
            uid: 28,
            rate: EUR,
            name: Some("European Euro".into()),
            short_name: Some("Euro".into()),
            symbol: Some("€".into()),
        };
        assert_eq!(
            currency(7, Some(&euro)),
            Some(Currency {
                code: "EUR".into(),
                symbol: "€".into(),
                name: "Euro".into()
            })
        );
        assert_eq!(
            currency(4, None),
            Some(Currency {
                code: "BRL".into(),
                symbol: "R$".into(),
                name: "Brazilian Real".into()
            })
        );
        let franc = CurrencyRecord {
            uid: 78,
            rate: 1.1,
            name: Some("Swiss Franc".into()),
            short_name: Some(" ".into()),
            symbol: None,
        };
        assert_eq!(
            currency(22, Some(&franc)),
            Some(Currency {
                code: "CHF".into(),
                symbol: "CHF".into(),
                name: "Swiss Franc".into()
            })
        );
        assert_eq!(currency(57, None), None);
        assert_eq!(currency(NOT_CHOSEN_YET, None), None);
    }

    #[test]
    fn shown_amounts_follow_the_game_formula() {
        let money = euros_monthly();
        assert_eq!(money.shown_wage(157_249.0), 793_232.0);
        assert_eq!(money.shown_wage(169_422.0), 854_639.0);
        assert_eq!(money.shown_wage(1_268.0), 6_396.0);
        assert_eq!(money.shown_wage(950.0), 4_791.0);
        assert_eq!(money.shown_wage(53.0), 267.0);
        assert_eq!(money.shown_wage(7_294.0), 36_794.0);
        assert_eq!(money.shown(1_123_660.0), 1_308_054.0);
        let weekly = Money {
            wage_period: WagePeriod::Week,
            ..euros_monthly()
        };
        assert_eq!(weekly.shown_wage(7_294.0), 8_491.0);
        let yearly = Money {
            wage_period: WagePeriod::Year,
            ..euros_monthly()
        };
        assert_eq!(yearly.shown_wage(3.0), 182.0);
    }

    #[test]
    fn money_reaches_the_app_in_snake_case_with_a_lowercase_period() {
        assert_eq!(
            serde_json::to_value(euros_monthly()).unwrap(),
            serde_json::json!({
                "currency": {"code": "EUR", "symbol": "€", "name": "Euro"},
                "rate": f64::from(EUR),
                "wage_period": "month"
            })
        );
    }

    #[test]
    fn the_wage_preference_file_gives_the_period() {
        let root = std::env::temp_dir().join(format!("fm-prefs-{}", std::process::id()));
        let write = |version: &str, value: &str| {
            let dir = root.join(version);
            std::fs::create_dir_all(&dir).unwrap();
            std::fs::write(
                dir.join("wage_string_type.xml"),
                format!("<record>\n\t<integer id=\"value\" value=\"{value}\"/>\n</record>\n"),
            )
            .unwrap();
        };
        assert_eq!(preferred_wage_period(&root), None);
        write("version 5", "3");
        assert_eq!(preferred_wage_period(&root), Some(WagePeriod::Year));
        write("version 6", "2");
        assert_eq!(preferred_wage_period(&root), Some(WagePeriod::Month));
        write("version 6", "9");
        assert_eq!(preferred_wage_period(&root), Some(WagePeriod::Year));
        std::fs::remove_dir_all(&root).unwrap();
        assert_eq!(
            wage_period_in("<integer id=\"value\" value=\"1\"/>"),
            Some(WagePeriod::Week)
        );
        assert_eq!(wage_period_in("<integer id=\"value\"/>"), None);
    }
}
