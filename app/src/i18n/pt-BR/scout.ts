export const scout = {
  showAll: "Mostrar todos, não só os subvalorizados",
  emptyMoneyball: "Nenhum jogador subvalorizado passa pelos critérios e pelos filtros. Afrouxe algum.",
  leagueWeighting: {
    label: "Peso da liga na Performance",
    none: {
      name: "Sem peso",
      hint: "A liga não muda a Performance.",
    },
    measured: {
      name: "Peso medido",
      hint: "Usa a Força da liga. A liga mais forte do save vale 100%.",
    },
  },
  moneyball: {
    title: "Critérios do Moneyball",
    ratio: "Razão ≥",
    ratioName: "Razão mínima (valor justo ÷ valor de mercado)",
    perf: "Perf. ≥",
    perfName: "Performance mínima (0 a 100)",
    fair: "Valor justo ≥",
    fairName: "Valor justo mínimo (milhões de {{currency}})",
    millions: "M",
  },
} as const;
