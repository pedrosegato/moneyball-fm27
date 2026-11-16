import { describe, expect, it } from "vitest";
import { POS_NAMES } from "../positions";
import { STAT_KEYS } from "../stats/catalog";
import {
  isRoleId,
  ROLE_PROFILES,
  ROLES,
  type RolePhase,
  type RoleProfile,
  roleById,
  roleGroups,
  roleIndex,
} from "./catalog";

describe("role catalogue", () => {
  it("lists the 40 in-possession and 39 out-of-possession roles of FM27", () => {
    expect(ROLES.filter((r) => r.phase === "ip")).toHaveLength(40);
    expect(ROLES.filter((r) => r.phase === "oop")).toHaveLength(39);
    expect(new Set(ROLES.map((r) => r.id)).size).toBe(79);
    expect(ROLES.every((r) => r.id === `${r.phase}:${r.gameId}`)).toBe(true);
  });
  it("leaves out the 10 obsolete in-possession ids", () => {
    for (const id of [20, 28, 30, 33, 36, 37, 39, 42, 47, 50]) expect(roleById(`ip:${id}`)).toBeUndefined();
  });
  it("names roles as the pt-PT game does", () => {
    expect(roleById("ip:24")).toMatchObject({ name: "Central de Construção", shortName: "CC", abbr: "BCB" });
    expect(roleById("ip:53")).toMatchObject({ name: "Guarda-Redes Pragmático", shortName: "GRP", abbr: "NGK" });
    expect(roleById("oop:11")?.name).toBe("Lateral de Conteção");
  });
  it("uses reader positions and catalog stats only", () => {
    expect(ROLES.flatMap((r) => r.positions).every((p) => POS_NAMES.includes(p))).toBe(true);
    expect(ROLES.flatMap((r) => r.pdf).every((k) => STAT_KEYS.includes(k))).toBe(true);
  });
  it("maps each role to its Allan profile", () => {
    const count = (p: RoleProfile) => ROLES.filter((r) => r.profile === p).length;
    expect(ROLE_PROFILES.map(count)).toEqual([6, 12, 12, 8, 8, 9, 24]);
  });
  it("has PDF stats for 34 + 14 roles and base only for 6 + 25", () => {
    const withPdf = (phase: RolePhase) => ROLES.filter((r) => r.phase === phase && r.pdf.length).length;
    expect([withPdf("ip"), withPdf("oop")]).toEqual([34, 14]);
  });
  it("keeps 3 PDF stats for Central de Construção: long passes are not read", () => {
    expect(roleById("ip:24")?.pdf).toEqual(["Pas%", "PrPass/90", "TckWon/90"]);
  });
  it("ranks Médio Ofensivo com bola against MC and MEI, Ala against LAT, Extremo against PON", () => {
    expect(roleGroups(roleById("ip:9") as never)).toEqual(["MC", "MEI"]);
    expect(roleGroups(roleById("ip:3") as never)).toEqual(["LAT"]);
    expect(roleGroups(roleById("ip:7") as never)).toEqual(["PON"]);
  });
  it("checks role ids", () => {
    expect([isRoleId("oop:45"), isRoleId("oop:46"), isRoleId("ip:20"), isRoleId(3)]).toEqual([
      true,
      false,
      false,
      false,
    ]);
    expect(ROLES[roleIndex("oop:0")].name).toBe("Guarda-Redes");
  });
});
