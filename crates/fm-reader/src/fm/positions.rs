use super::profile::{ACCOMPLISHED, POS_NAMES};

pub fn position_string(r: &[u8]) -> String {
    let mut ok: Vec<&str> = POS_NAMES
        .iter()
        .zip(r)
        .filter(|&(_, &v)| v >= ACCOMPLISHED)
        .map(|(&n, _)| n)
        .collect();
    if ok.is_empty() && !r.is_empty() {
        let best = (0..r.len()).fold(0, |b, i| if r[i] > r[b] { i } else { b });
        ok.extend(POS_NAMES.get(best));
    }
    let has = |p: &str| ok.contains(&p);
    let sides = |pre: &str| -> String {
        "RLC"
            .chars()
            .filter(|s| has(&format!("{pre}{s}")))
            .collect()
    };
    let mut parts = Vec::new();
    if has("GK") {
        parts.push("GK".to_string());
    }
    for (grp, pre) in [("D", "D"), ("WB", "WB")] {
        let s = sides(pre);
        if !s.is_empty() {
            parts.push(format!("{grp} ({s})"));
        }
    }
    if has("DM") {
        parts.push("DM".to_string());
    }
    for grp in ["M", "AM"] {
        let s = sides(grp);
        if !s.is_empty() {
            parts.push(format!("{grp} ({s})"));
        }
    }
    if has("ST") {
        parts.push("ST (C)".to_string());
    }
    parts.join(", ")
}

#[cfg(test)]
mod tests {
    use super::*;

    const DEFENDER: [u8; 15] = [1, 5, 10, 18, 20, 15, 8, 16, 9, 3, 4, 3, 2, 12, 14];

    #[test]
    fn position_string_orders_groups() {
        assert_eq!(position_string(&DEFENDER), "D (RC), DM, M (C)");
    }

    #[test]
    fn position_string_covers_every_group_in_fm_order() {
        let all = [20u8; 15];
        assert_eq!(
            position_string(&all),
            "GK, D (RLC), WB (RL), DM, M (RLC), AM (RLC), ST (C)"
        );
    }

    #[test]
    fn position_string_without_accomplished_takes_first_best() {
        let mut r = [1u8; 15];
        r[8] = 12;
        r[12] = 12;
        assert_eq!(position_string(&r), "M (R)");
    }

    #[test]
    fn sweeper_alone_has_no_group() {
        let mut r = [1u8; 15];
        r[1] = 20;
        assert_eq!(position_string(&r), "");
    }
}
