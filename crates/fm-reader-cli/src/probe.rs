pub fn field_lines(bytes: &[u8], describe: impl Fn(u64) -> Option<String>) -> Vec<String> {
    let mut out = Vec::new();
    for (i, word) in bytes.chunks(8).enumerate() {
        let off = i * 8;
        if let Ok(word) = <[u8; 8]>::try_from(word) {
            let q = u64::from_le_bytes(word);
            if let Some(what) = (q != 0).then(|| describe(q)).flatten() {
                out.push(format!("+0x{off:03X} -> 0x{q:X} {what}"));
                continue;
            }
        }
        for (j, &half) in word.as_chunks::<4>().0.iter().enumerate() {
            let v = i32::from_le_bytes(half);
            if v != 0 {
                out.push(format!("+0x{:03X} i32 {v}", off + 4 * j));
            }
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pointers_are_described_and_other_words_split_into_i32_halves() {
        let mut bytes = vec![0u8; 0x24];
        bytes[0..8].copy_from_slice(&0x2000u64.to_le_bytes());
        bytes[8..12].copy_from_slice(&7i32.to_le_bytes());
        bytes[12..16].copy_from_slice(&(-1i32).to_le_bytes());
        bytes[0x1C..0x20].copy_from_slice(&1_123_660i32.to_le_bytes());
        bytes[0x20..0x24].copy_from_slice(&157_249i32.to_le_bytes());
        let describe = |q: u64| (q == 0x2000).then(|| ".?AVCLUB_FINANCE@db@@".to_string());

        assert_eq!(
            field_lines(&bytes, describe),
            [
                "+0x000 -> 0x2000 .?AVCLUB_FINANCE@db@@",
                "+0x008 i32 7",
                "+0x00C i32 -1",
                "+0x01C i32 1123660",
                "+0x020 i32 157249",
            ]
        );
    }
}
