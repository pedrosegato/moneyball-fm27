use chrono::{Days, NaiveDate};

pub fn unpack_date(raw: u32) -> Option<NaiveDate> {
    let (doy, year) = (raw & 0xFFFF, raw >> 16);
    if !((1..=366).contains(&doy) && 1850 < year && year < 2200) {
        return None;
    }
    NaiveDate::from_ymd_opt(year as i32, 1, 1)?.checked_add_days(Days::new(u64::from(doy - 1)))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ymd(y: i32, m: u32, d: u32) -> Option<NaiveDate> {
        NaiveDate::from_ymd_opt(y, m, d)
    }

    #[test]
    fn unpack_date_matches_python() {
        assert_eq!(unpack_date(132776239), ymd(2026, 10, 30));
        assert_eq!(unpack_date(129696037), ymd(1979, 10, 20));
        assert_eq!(unpack_date(132579694), ymd(2024, 1, 1));
        assert_eq!(unpack_date(132645230), ymd(2024, 12, 31));
        assert_eq!(unpack_date(124518402), ymd(1900, 1, 2));
        assert_eq!(unpack_date(132775936), None);
        assert_eq!(unpack_date(0), None);
    }
}
