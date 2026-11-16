import { playerRecord } from "@/engine/testing/records";
import { squadCaption, squadOf, teamOf, teamOptions, verdictOrder } from "./squadRows";

const MY = 77;

const players = [
  playerRecord({ name: "Titular", club: "Nós", club_uid: MY, team: "Senior Team" }),
  playerRecord({ name: "Outro clube", club: "Eles", club_uid: 5, team: "Senior Team" }),
  playerRecord({ name: "Base", club: "Nós", club_uid: MY, team: "U20" }),
  playerRecord({
    name: "Cedido",
    club: "Vasco",
    club_uid: 6,
    team: "Senior Team",
    owner: "Nós",
    owner_uid: MY,
    owner_team: "U20",
  }),
  playerRecord({
    name: "Chegou",
    club: "Nós",
    club_uid: MY,
    team: "Senior Team",
    owner: "Flamengo",
    owner_uid: 9,
    owner_team: "U21",
  }),
  playerRecord({ name: "Reserva", club: "Nós", club_uid: MY, team: "Reserves" }),
  playerRecord({ name: "Sem time", club: "Nós", club_uid: MY, team: null }),
  playerRecord({ name: "Sub-23", club: "Nós", club_uid: MY, team: "U23" }),
];

describe("the squad", () => {
  it("is everyone at the club or out on loan from it, in record order", () => {
    expect(squadOf(players, MY).map((i) => players[i].name)).toEqual([
      "Titular",
      "Base",
      "Cedido",
      "Chegou",
      "Reserva",
      "Sem time",
      "Sub-23",
    ]);
    expect(squadOf(players, null)).toEqual([]);
  });

  it("puts a player out on loan in the team that lists him at the club", () => {
    expect(teamOf(players[3], MY)).toBe("U20");
    expect(teamOf(players[4], MY)).toBe("Senior Team");
    expect(teamOf(players[6], MY)).toBeNull();
  });

  it("offers the teams first team down, youngest last, with their counts", () => {
    expect(teamOptions(players, squadOf(players, MY), MY)).toEqual([
      { team: "Senior Team", label: "Principal", count: 2 },
      { team: "Reserves", label: "Reservas", count: 1 },
      { team: "U23", label: "Sub-23", count: 1 },
      { team: "U20", label: "Sub-20", count: 2 },
      { team: null, label: "Outros", count: 1 },
    ]);
  });

  it("says where a loan sends a player or where he came from, else his team", () => {
    expect(squadCaption(players[0], MY)).toBe("Principal");
    expect(squadCaption(players[2], MY)).toBe("Sub-20");
    expect(squadCaption(players[3], MY)).toBe("Emprestado a Vasco");
    expect(squadCaption(players[4], MY)).toBe("Emprestado por Flamengo");
    expect(squadCaption(players[6], MY)).toBe("Outros");
    expect(squadCaption(playerRecord({ club: null, club_uid: 9, owner: "Nós", owner_uid: MY }), MY)).toBe(
      "Emprestado a Sem clube",
    );
  });

  it("orders by verdict, then the best Performance first, a missing one last, and no verdict after all", () => {
    const keys = [
      verdictOrder("keep", 60),
      verdictOrder("keep", 80),
      verdictOrder("keep", Number.NaN),
      verdictOrder("renew", 99),
      verdictOrder("notEnoughData", Number.NaN),
      verdictOrder(null, 90),
    ];
    const sorted = [...keys.keys()].sort(
      (a, b) => (Number.isNaN(keys[a]) ? 1 : 0) - (Number.isNaN(keys[b]) ? 1 : 0) || keys[a] - keys[b],
    );
    expect(sorted).toEqual([1, 0, 2, 3, 4, 5]);
    expect(verdictOrder(null, 90)).toBeNaN();
  });
});
