export const graphs = {
  toolbar: {
    axes: "Eixos",
    swap: "Trocar eixos",
  },
  axis: {
    name: "Eixo {{name}}",
    search: "Buscar stat do eixo {{name}}",
    percentile: "percentil",
    inverted: "menor é melhor, eixo invertido",
    mean: "média {{value}}",
  },
  chart: "Gráfico de dispersão",
  plotted_zero: "jogadores com {{pool}} no gráfico",
  plotted_one: "jogador com {{pool}} no gráfico",
  plotted_many: "jogadores com {{pool}} no gráfico",
  plotted_other: "jogadores com {{pool}} no gráfico",
  lacking: "({{n}} sem {{x}} ou {{y}})",
  levels: {
    label: "Nível nos dois eixos",
    legend: "Níveis no gráfico",
    tooFew: "Menos de {{min}} jogadores no gráfico: poucos para separar em níveis.",
    samePoint: "Todos os jogadores no mesmo ponto: nada para separar em níveis.",
    tooFewShort: "menos de {{min}} jogadores no gráfico",
    samePointShort: "todos os jogadores no mesmo ponto",
  },
  tooltip: {
    pct: "pct {{value}}",
    both: "Nos dois eixos",
  },
  empty: {
    title: "Nenhum jogador no gráfico",
    noneInView: "Ninguém com {{pool}} passa pelos filtros. Afrouxe um filtro.",
    noPercentile:
      "Os {{n}} jogadores filtrados com {{pool}} não têm percentil de {{x}} e {{y}}: amostra pequena ou poucos na posição. Use Valor ou troque um eixo.",
    noValue: "Os {{n}} jogadores filtrados com {{pool}} não têm {{x}} e {{y}}: amostra pequena. Troque um eixo.",
  },
  summary: {
    players_zero: "{{count, count}} jogadores",
    players_one: "{{count, count}} jogador",
    players_many: "{{count, count}} jogadores",
    players_other: "{{count, count}} jogadores",
    scatter: "Dispersão de {{players}}: {{x}} no eixo X, {{y}} no eixo Y.",
    means: "{{xMean}} em {{x}}, {{yMean}} em {{y}}.",
    colours: "A cor de cada ponto é o nível dele nos dois eixos juntos, contado na legenda.",
    labeled: "Os mais acima dos dois estão na lista Pontos rotulados.",
  },
  quadrant: {
    long: {
      both: "Melhor que a média nos dois",
      only: "Melhor que a média só em {{abbr}}",
      neither: "Pior que a média nos dois",
    },
    short: {
      both: "Melhor nos dois",
      only: "Melhor em {{abbr}}",
      neither: "Pior nos dois",
    },
  },
  howToRead: {
    title: "Como ler este gráfico",
    right: "Mais à direita",
    up: "Mais acima",
    more: "{{where}}, mais {{abbr}}",
    less: "{{where}}, menos {{abbr}}, que aqui é melhor",
    corners:
      "No canto de cima à direita, quem é melhor que a média nos dois; no de baixo à esquerda, quem é pior nos dois. As linhas cruzadas são as médias.",
    colours:
      "A cor é o nível no conjunto dos dois eixos, entre os jogadores do gráfico: Elite são os 10% melhores, Ruim os 20% piores.",
  },
  labeled: {
    title: "Pontos rotulados",
    count: "Quantos rotular",
    note: "Os melhores nos dois eixos juntos (pela soma dos z‑scores), com o nível de cada um.",
    levelTitle: "Percentil nos dois eixos juntos, entre os jogadores do gráfico",
    level: "Nível",
    name: "Nome",
  },
} as const;
