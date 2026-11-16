use std::collections::HashMap;

use crate::fm::PlayerRecord;

pub const KNOWN_BUILDS: [&str; 4] = [
    "6A229F1E-1D8D3000",
    "6ADFB11C-19E69000",
    "6AE563A1-175DA000",
    "6AE8CF77-17969000",
];

const MIN_SHARE: f64 = 0.02;
const MIN_ROWS: usize = 20;
const GK_MIN_RATING: u8 = 15;
const MIN_FULL_DIST: f64 = 8.5;

#[derive(Default)]
struct Row {
    percentages: Vec<f64>,
    shots: Option<f64>,
    sot: Option<f64>,
    rating: Option<f64>,
    mins: f64,
    apps: f64,
    age: Option<f64>,
    dist90: Option<f64>,
    npxg90: Option<f64>,
    xa90: Option<f64>,
    shot90: Option<f64>,
    pres90: Option<f64>,
    poss_lost90: Option<f64>,
    unnamed: bool,
}

fn pct(a: i32, b: i32) -> Option<f64> {
    (b != 0).then(|| f64::from(a) / f64::from(b) * 100.0)
}

fn blank_unknown(row: &mut Row, pcts: &mut [Option<f64>], keep_pct: &[usize]) {
    row.dist90 = None;
    row.pres90 = None;
    row.poss_lost90 = None;
    for (i, p) in pcts.iter_mut().enumerate() {
        if !keep_pct.contains(&i) {
            *p = None;
        }
    }
}

fn derive(r: &PlayerRecord) -> Option<Row> {
    let e = r.season.as_ref().filter(|e| e.minutes != 0)?;
    let s = &r.record;
    let m = f64::from(e.minutes);
    let p90 = |v: f64| Some(v * 90.0 / m);
    let is_gk =
        r.pos.first().is_some_and(|&p| p >= GK_MIN_RATING) && r.pos.iter().max() == r.pos.first();
    let apps = e.starts + e.subs;
    let mut row = Row {
        shots: Some(f64::from(s.shots)),
        sot: Some(f64::from(s.sot)),
        rating: (e.rated != 0).then(|| f64::from(e.rating_sum) / (10.0 * f64::from(e.rated))),
        mins: m,
        apps: f64::from(apps),
        age: r.age.map(f64::from),
        dist90: p90(f64::from(s.distance10) / 10.0),
        npxg90: p90(f64::from(s.npxg100) / 100.0),
        xa90: p90(f64::from(s.xa100) / 100.0),
        shot90: p90(f64::from(s.shots)),
        pres90: p90(f64::from(s.pres_att)),
        poss_lost90: p90(f64::from(s.poss_lost)),
        unnamed: matches!(r.name.as_str(), "" | "?"),
        percentages: Vec::new(),
    };
    let mut pcts = [
        pct(s.pas_cmp, s.pas_att),
        pct(s.crs_cmp, s.crs_att),
        pct(s.op_crs_cmp, s.op_crs_att),
        pct(s.tck_won, s.tck_att),
        pct(s.hdr_won, s.hdr_att),
    ];

    let thin = !is_gk && f64::from(s.distance10) / 10.0 * 90.0 / m < MIN_FULL_DIST;
    if r.partial_detail && s.pas_att != 0 && (thin || (s.distance10 == 0 && s.sprints == 0)) {
        blank_unknown(&mut row, &mut pcts, &[0, 3]);
    }

    let has_detail = [
        s.pas_att,
        s.distance10,
        s.sprints,
        s.op_crs_cmp,
        s.poss_lost,
        s.xg100,
    ]
    .iter()
    .any(|&v| v != 0);
    if !has_detail {
        blank_unknown(&mut row, &mut pcts, &[]);
        row.shots = None;
        row.sot = None;
        row.npxg90 = None;
        row.xa90 = None;
        row.shot90 = None;
        if is_gk {
            row.percentages = vec![pct(s.tck_won, s.tck_att)]
                .into_iter()
                .flatten()
                .collect();
        }
        return Some(row);
    }

    row.percentages = pcts.iter().flatten().copied().collect();
    if is_gk {
        let (saves, conc, xgp) = match &r.keeper {
            Some(k) => (k.saves, k.conceded, f64::from(k.xgp100) / 100.0),
            None => (s.op_crs_cmp, e.conceded, f64::from(s.xgp100) / 100.0),
        };
        let faced = saves + conc;
        let mut gk_pcts: Vec<f64> = [pct(saves, faced), pct(s.tck_won, s.tck_att)]
            .into_iter()
            .flatten()
            .collect();
        if faced != 0 {
            gk_pcts.push((1.0 - (xgp + f64::from(conc)) / f64::from(faced)) * 100.0);
        }
        let unknown_shots = saves == 0 && e.minutes >= 270;
        let mut kept: Vec<f64> = [pcts[0], pcts[1]].into_iter().flatten().collect();
        if unknown_shots {
            gk_pcts = [pct(s.tck_won, s.tck_att)].into_iter().flatten().collect();
        }
        kept.extend(gk_pcts);
        row.percentages = kept;
    }
    Some(row)
}

fn violations(r: &Row) -> Vec<String> {
    let mut bad = Vec::new();
    if r.percentages.iter().any(|v| !(0.0..=100.0001).contains(v)) {
        bad.push("percentage outside 0-100".to_string());
    }
    if let (Some(shots), Some(sot)) = (r.shots, r.sot) {
        if sot > shots {
            bad.push("more shots on target than shots".into());
        }
    }
    if r.rating.is_some_and(|v| !(1.0..=10.0).contains(&v)) {
        bad.push("average rating outside 1-10".into());
    }
    if r.mins > 8000.0 {
        bad.push("over 8000 minutes in a season".into());
    }
    if r.apps != 0.0 && r.mins > r.apps * 130.0 {
        bad.push("more than 130 minutes per appearance".into());
    }
    if r.age.is_some_and(|v| !(14.0..=60.0).contains(&v)) {
        bad.push("age outside 14-60".into());
    }
    if r.dist90.is_some_and(|v| !(0.0..=25.0).contains(&v)) {
        bad.push("distance per 90 outside 0-25 km".into());
    }
    let capped = [
        ("NP-xG/90", r.npxg90, 3),
        ("xA/90", r.xa90, 3),
        ("Shot/90", r.shot90, 20),
        ("Pres A/90", r.pres90, 80),
        ("Poss Lost/90", r.poss_lost90, 120),
    ];
    for (name, v, hi) in capped {
        if v.is_some_and(|v| !(0.0..=f64::from(hi)).contains(&v)) {
            bad.push(format!("{name} outside 0-{hi}"));
        }
    }
    if r.unnamed {
        bad.push("player with no readable name".into());
    }
    bad
}

fn check_rows(players: &[PlayerRecord]) -> Vec<String> {
    let full: Vec<Row> = players.iter().filter_map(derive).collect();
    if full.len() < MIN_ROWS {
        return Vec::new();
    }
    let mut counts: HashMap<String, usize> = HashMap::new();
    for row in &full {
        let mut names = violations(row);
        names.sort();
        names.dedup();
        for n in names {
            *counts.entry(n).or_default() += 1;
        }
    }
    let mut ranked: Vec<_> = counts.into_iter().collect();
    ranked.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.cmp(&b.0)));
    ranked
        .into_iter()
        .filter(|(_, n)| *n as f64 / full.len() as f64 >= MIN_SHARE)
        .map(|(name, n)| format!("{n} of {} players show {name}.", full.len()))
        .collect()
}

pub fn check(players: &[PlayerRecord], build_id: &str) -> Vec<String> {
    let mut warnings = Vec::new();
    if !KNOWN_BUILDS.contains(&build_id) {
        warnings.push(format!(
            "This game build ({build_id}) is not one the reader was checked on ({}). The game may have been patched: treat the numbers with caution until the offsets are re-checked.",
            KNOWN_BUILDS.join(", ")
        ));
    }
    let bad = check_rows(players);
    if !bad.is_empty() {
        warnings.extend(bad);
        warnings.push(
            "Impossible values like these usually mean a game patch moved some fields.".into(),
        );
    }
    warnings
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::fm::Season;

    fn player(minutes: i32, rating_sum: i32, rated: i32) -> PlayerRecord {
        let json = serde_json::json!({
            "uid": 1, "name": "A", "pos": [1, 2], "position": "D", "age": 25, "dob": null, "nat": null,
            "nation": null, "club": null, "club_uid": null, "owner": null, "owner_uid": null,
            "division": null, "team": null, "owner_team": null, "wage": null, "contract_end": null,
            "value": 0, "height": 180, "foot": "R", "ca": 1, "pa": 1, "attrs": [], "personality": [],
            "season": null, "record": serde_json::to_value(crate::fm::Record::default()).unwrap(),
            "keeper": null, "partial_detail": false
        });
        let mut p: PlayerRecord = serde_json::from_value(json).unwrap();
        p.season = Some(Season {
            minutes,
            starts: 10,
            rating_sum,
            rated,
            ..Default::default()
        });
        p.record.pas_att = 10;
        p.record.pas_cmp = 8;
        p.record.distance10 = 1000;
        p
    }

    #[test]
    fn unknown_build_warns() {
        assert_eq!(check(&[], "X").len(), 1);
        assert!(check(&[], KNOWN_BUILDS[3]).is_empty());
    }

    #[test]
    fn healthy_rows_are_quiet_and_impossible_ratings_warn() {
        let good: Vec<_> = (0..30).map(|_| player(900, 700, 10)).collect();
        assert!(check(&good, KNOWN_BUILDS[3]).is_empty());
        let bad: Vec<_> = (0..30).map(|_| player(900, 1500, 10)).collect();
        let w = check(&bad, KNOWN_BUILDS[3]);
        assert!(
            w[0].contains("30 of 30 players show average rating outside 1-10"),
            "{w:?}"
        );
    }
}
