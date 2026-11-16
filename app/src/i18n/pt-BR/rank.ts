export const rank = {
  rating: {
    abbr: "Av Rat",
    label: "Nota média do jogo (Av Rat)",
    description: "a nota média que o jogo dá ao jogador nas partidas, de 1 a 10; quanto maior, melhor.",
  },
  score: {
    abbr: "{{abbr}} pct",
    label: "Percentil de {{label}}, na posição dele",
    description:
      "o percentil de {{abbr}} contra os jogadores da posição dele com {{pool}}, de 0 a 100: {{description}}",
  },
  allPositions: "Todas as posições",
  groupLabel: "Posição do Rank: {{group}}",
  empty: {
    stat: "Ninguém com {{what}} e os minutos do pool passa pelos filtros.",
    statInGroup: "Ninguém com {{what}} e os minutos do pool passa pelos filtros entre os {{group}}.",
    rating: "nota",
  },
  toolbar: {
    sortBy: "Ordenar por",
    search: "Buscar stat para ordenar",
    weight: "Peso da liga",
    off: "Sem peso",
    on: "Com peso da liga",
    who: "Quem tem {{pool}}",
    whoPercentile: "Quem tem {{pool}}; percentis na posição dele",
  },
  columns: {
    position: {
      abbr: "#",
      label: "Posição no Rank, na ordem mostrada",
      description: "a posição do jogador no Rank; quanto menor, melhor.",
    },
    weight: {
      abbr: "Peso",
      label: "Peso da liga no Rank",
      description: "o multiplicador da liga do jogador no Rank com peso: acima de ×1 a nota sobe, abaixo dela cai.",
    },
    weighted: {
      abbr: "Ponderado",
      label: "{{abbr}} × o peso da liga",
      description: "a nota do Rank ({{abbr}}) multiplicada pelo peso da liga; quanto maior, melhor.",
    },
    move: {
      abbr: "Mudança",
      label: "Posições que o peso da liga fez o jogador subir ou descer",
      description:
        "quantas posições o jogador sobe (seta para cima) ou desce no Rank quando a nota leva em conta o peso da liga.",
      same: "Mesma posição com e sem peso",
      up: "subiu",
      down: "desceu",
    },
  },
  leagues: {
    title: "Pesos das ligas",
    description:
      "Com peso, a nota ou o percentil vale vezes o peso da liga. O padrão vem do ranking de ligas da planilha (Premier League ×1,15, o fim do ranking ×1,00). Para tirar ligas do Rank, filtre a coluna Liga.",
    search: "Buscar liga",
    placeholder: "Buscar liga ou país",
    restoreAll: "Restaurar pesos padrão",
    list: "Ligas do save",
    none: "Nenhuma liga com esse nome.",
    restore: "Restaurar o peso de {{name}}",
    defaultWeight: "Padrão {{weight}}",
    weightOf: "Peso de {{name}}",
    unranked: "fora do ranking",
  },
} as const;
