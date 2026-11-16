import type { PlayerRecord } from "@/data/types";
import { heightOf, marketValue } from "@/engine/club";
import { naturalPositions } from "@/engine/positions";
import { formatCount, formatDate, formatFixed, multiplierText } from "@/lib/format";
import { POUNDS } from "@/lib/money";
import { tableText } from "../lib/tableText";
import { chip, fromPlayers, number, text } from "./factories";
import { COLUMN_GROUP, NAME_COLUMN, PLAYER_COLUMN } from "./ids";
import { columnCopy, footName, monthsText, noClub, ownGroupAgainst, starterMinutes } from "./labels";
import { moneyColumn, wageColumn } from "./money";
import type { TableColumn, TableSource, TextColumn } from "./types";

export const NAME_WIDTH = 200;

const { identity, contract, attributes } = COLUMN_GROUP;

const contractDay = (iso: string | null) => (iso ? Number(iso.replaceAll("-", "")) : NaN);

function nameColumn(players: readonly PlayerRecord[]): TextColumn {
  const name = (i: number) => players[i].name;
  const column = text({ ...columnCopy(NAME_COLUMN), width: NAME_WIDTH, n: players.length, text: name }, identity);
  return {
    ...column,
    caption: (i) => players[i].club ?? noClub(),
    exports: [
      { header: column.abbr, get: name },
      { header: tableText("column.club.abbr"), get: (i) => players[i].club },
    ],
  };
}

export function identityColumns(
  { players, analysis, money = POUNDS }: TableSource,
  minutes: Float64Array,
): TableColumn[] {
  const n = players.length;
  const { pool } = analysis;
  const positions = (i: number) => {
    const natural = naturalPositions(players[i].pos);
    return natural.length ? natural.join(", ") : players[i].position || null;
  };
  const contractEnd = (i: number) => {
    const iso = players[i].contract_end;
    return iso ? formatDate(iso) : null;
  };
  const rating = columnCopy(PLAYER_COLUMN.rating);
  return [
    nameColumn(players),
    text({ ...columnCopy(PLAYER_COLUMN.position), width: 80, n, text: positions, sortKey: analysis.group }, identity),
    number(
      {
        ...columnCopy(PLAYER_COLUMN.age),
        width: 64,
        value: fromPlayers(players, (r) => r.age),
        format: formatCount,
        descFirst: false,
      },
      identity,
    ),
    number({ ...columnCopy(PLAYER_COLUMN.minutes), width: 60, value: minutes, format: formatCount }, identity),
    chip(
      {
        id: rating.id,
        abbr: rating.abbr,
        def: { label: rating.label, unit: "rating", description: rating.description },
        group: identity,
        value: analysis.rating,
        pct: analysis.ratingPct,
        scale: "rating",
        against: ownGroupAgainst(analysis),
      },
      pool,
    ),
    text({ ...columnCopy(PLAYER_COLUMN.club), width: 168, n, text: (i) => players[i].club }, identity),
    text({ ...columnCopy(PLAYER_COLUMN.division), width: 168, n, text: (i) => players[i].division }, identity),
    number(
      {
        id: PLAYER_COLUMN.leagueStrength,
        abbr: tableText("column.leagueStrength.abbr"),
        label: tableText("column.leagueStrength.label", { starters: starterMinutes() }),
        description: tableText("column.leagueStrength.description"),
        width: 112,
        value: analysis.leagueStrength,
        format: formatCount,
      },
      identity,
    ),
    text({ ...columnCopy(PLAYER_COLUMN.nation), width: 120, n, text: (i) => players[i].nation }, identity),
    text({ ...columnCopy(PLAYER_COLUMN.foot), width: 80, n, text: (i) => footName(players[i].foot) }, identity),
    number(
      { ...columnCopy(PLAYER_COLUMN.height), width: 56, value: fromPlayers(players, heightOf), format: formatCount },
      identity,
    ),
    moneyColumn({ ...columnCopy(PLAYER_COLUMN.value), width: 76, value: fromPlayers(players, marketValue) }, money),
    wageColumn(
      fromPlayers(players, (r) => r.wage),
      money,
    ),
    text(
      {
        ...columnCopy(PLAYER_COLUMN.contractEnd),
        width: 92,
        n,
        text: contractEnd,
        sortKey: fromPlayers(players, (r) => contractDay(r.contract_end)),
      },
      contract,
    ),
    moneyColumn({ ...columnCopy(PLAYER_COLUMN.fair), width: 88, value: analysis.fair }, money, pool),
    number(
      {
        ...columnCopy(PLAYER_COLUMN.valueRatio),
        width: 76,
        value: analysis.valueRatio,
        format: (v) => multiplierText(formatFixed(v, 1)),
      },
      contract,
      pool,
    ),
    number(
      {
        ...columnCopy(PLAYER_COLUMN.monthsLeft),
        width: 84,
        value: analysis.monthsLeft,
        format: monthsText,
        descFirst: false,
      },
      contract,
    ),
    number(
      {
        ...columnCopy(PLAYER_COLUMN.ability),
        width: 64,
        value: analysis.ability,
        format: (v) => formatFixed(v, 1),
        tier: { scale: "score", basis: analysis.abilityPct, missing: "group" },
      },
      attributes,
    ),
    number(
      { ...columnCopy(PLAYER_COLUMN.vsAge), width: 84, value: analysis.vsAge, format: (v) => `${formatFixed(v, 0)}%` },
      attributes,
    ),
    number(
      { ...columnCopy(PLAYER_COLUMN.ca), width: 52, value: fromPlayers(players, (r) => r.ca), format: formatCount },
      attributes,
    ),
    number(
      { ...columnCopy(PLAYER_COLUMN.pa), width: 52, value: fromPlayers(players, (r) => r.pa), format: formatCount },
      attributes,
    ),
  ];
}
