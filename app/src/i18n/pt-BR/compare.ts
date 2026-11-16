export const compare = {
  empty: {
    title: "Ninguém para comparar",
    description:
      "Abra um jogador no Scout ou nos Gráficos e use Comparar no rodapé do painel do jogador. Cabem até {{max}}.",
    action: "Ir para o Scout",
  },
  players: "Jogadores comparados",
  card: {
    open: "Abrir {{name}}",
    removeNamed: "Remover {{name}}",
  },
  missing: {
    title: "Jogador indisponível",
    description: "Ele não está mais no save: foi aposentado ou saiu do escopo lido.",
    remove: "Remover jogador indisponível",
  },
  room: {
    one: "Cabe mais um",
    two: "Cabe mais dois",
    hint: "Abra um jogador e use Comparar no rodapé do painel.",
  },
  stats: {
    title: "Stats",
    group: "Stats de {{group}}",
    groupLabel: "Stats da posição: {{group}}",
    howToRead: "Barra mais comprida é melhor: o percentil de cada um contra os da posição dele.",
    leader: "Melhor valor da linha (empates marcam todos)",
    leaderTip: "o destaque compara o valor; a cor compara cada um com os da posição dele",
  },
  table: {
    label: "Stats lado a lado",
    lowerIsBetter: "(menor é melhor)",
    leader: "líder da linha",
  },
  against: {
    each: "{{name}} contra os {{group}}",
    mixed: "Cada um contra os da posição dele com {{pool}}: {{each}}",
  },
} as const;
