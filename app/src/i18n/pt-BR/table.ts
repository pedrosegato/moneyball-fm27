export const table = {
  column: {
    name: {
      abbr: "Nome",
      label: "Nome",
      description: "o nome do jogador, com o clube logo abaixo.",
    },
    position: {
      abbr: "Pos",
      label: "Posições naturais",
      description: "as posições em que o jogador atua com nota 18 ou mais no jogo.",
    },
    age: {
      abbr: "Idade",
      label: "Idade",
      description: "a idade do jogador na data dos dados.",
    },
    minutes: {
      abbr: "Min",
      label: "Minutos no escopo",
      description: "minutos jogados nas competições lidas.",
    },
    rating: {
      abbr: "Nota",
      label: "Nota média",
      description:
        "a média das notas do jogador nos jogos da temporada, a mesma que o FM mostra; quanto maior, melhor.",
    },
    club: {
      abbr: "Clube",
      label: "Clube",
      description: "o clube em que o jogador está agora.",
    },
    division: {
      abbr: "Liga",
      label: "Liga",
      description: "a liga do clube do jogador.",
    },
    leagueStrength: {
      abbr: "Força da liga",
      label: "Força da liga: CA média dos titulares ({{starters}})",
      description:
        "o nível da liga do jogador, pela habilidade média dos titulares dela; quanto maior, mais forte a liga.",
    },
    nation: {
      abbr: "País",
      label: "País",
      description: "o país do jogador.",
    },
    foot: {
      abbr: "Pé",
      label: "Pé preferido",
      description: "o pé que o jogador usa melhor.",
    },
    height: {
      abbr: "Alt.",
      label: "Altura (cm)",
      description: "a altura do jogador, em centímetros.",
    },
    value: {
      abbr: "Valor",
      label: "Valor de mercado",
      description: "o valor de mercado que o jogo mostra hoje.",
    },
    wage: {
      abbr: "Salário",
      label: "Salário {{per}}",
      description: "o salário atual do jogador, {{per}}, como o FM mostra.",
    },
    contract_end: {
      abbr: "Contrato",
      label: "Fim do contrato",
      description: "a data em que o contrato atual termina.",
    },
    fair: {
      abbr: "Valor justo",
      label: "Valor justo pelo desempenho, idade e liga",
      description:
        "quanto o jogador valeria pelo desempenho, pela idade e pela liga, no modelo do app; acima do valor de mercado, ele está barato.",
    },
    valueRatio: {
      abbr: "Razão",
      label: "Razão: valor justo ÷ valor de mercado",
      description:
        "o valor justo dividido pelo valor de mercado; acima de ×1 o jogador custa menos do que rende, e quanto maior, mais barato.",
    },
    monthsLeft: {
      abbr: "Restante",
      label: "Contrato restante, em meses a partir da data dos dados",
      description: "quantos meses faltam para o contrato acabar.",
    },
    ability: {
      abbr: "Hab.",
      label: "Habilidade: melhor nota de função pelos atributos (1–20)",
      description:
        "a melhor nota de função calculada pelos atributos, de 1 a 20, com a cor pelo percentil entre os jogadores do mesmo grupo; quanto maior, melhor.",
    },
    vsAge: {
      abbr: "Hab./idade",
      label: "Habilidade em % da típica para a idade",
      description:
        "a habilidade em % da típica para a idade; acima de 100% o jogador está à frente dos outros da idade dele, e quanto mais, melhor.",
    },
    ca: {
      abbr: "CA",
      label: "Habilidade atual (CA)",
      description: "a habilidade atual que o jogo dá ao jogador, de 1 a 200; quanto mais, melhor.",
    },
    pa: {
      abbr: "PA",
      label: "Potencial (PA)",
      description: "a habilidade máxima que o jogo deixa o jogador alcançar, de 1 a 200; quanto mais, melhor.",
    },
    perf: {
      abbr: "Perf.",
      label: "Performance",
      description:
        "nota das stats da função, de 0 a 100, contra os jogadores que jogam as posições dela, com o peso da liga escolhido no Scout. Sem função escolhida, é a melhor função do jogador na posição principal. Abaixo de 1.800 minutos a nota fica mais perto de 50. Quanto mais, melhor.",
    },
    perfRole: {
      abbr: "Função",
      label: "Função da Performance",
      description:
        "a função em que o jogador tem a nota da coluna Performance: a escolhida no seletor Função ou, em Melhor função, a melhor dele na posição principal.",
    },
    statsVsAbility: {
      abbr: "Stats vs ability",
      label: "Performance menos o percentil de habilidade",
      description:
        "a Performance menos o percentil da habilidade: acima de 0 o jogador rende mais do que os atributos sugerem; quanto maior, melhor.",
    },
  },
  performance: "Performance",
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
  composite: {
    sum: "a soma, com pesos, de {{stats}} a cada 90 minutos; quanto mais, melhor.",
    mean: "a média, com pesos, dos percentis de {{stats}}; quanto mais, melhor.",
    andMore: "{{listed}} e mais {{rest}}",
  },
  actionAbbr: {
    "actions-def": "Def./90",
    "actions-att": "Atq./90",
    "actions-cre": "Cri./90",
    "actions-gk": "GK/90",
    "actions-excitement": "Emp./90",
  },
  groupNoun: {
    GK: "goleiros",
    ZAG: "zagueiros",
    LAT: "laterais",
    VOL: "volantes",
    MC: "meio-campistas",
    MEI: "meias",
    PON: "pontas",
    ATA: "atacantes",
  },
  minutesAtLeast: "{{minutes, count}}+ min",
  roleCaption: "{{name}} ({{phase}})",
  roleExport: "Função",
  against: "contra os {{group}} com {{pool}}",
  monthsLeft: {
    ended: "Encerrado",
    thisMonth: "Este mês",
  },
  csv: {
    percentile: "{{header}} (percentil)",
    money: "{{header}} ({{currency}})",
    wage: "{{header}} ({{currency}}{{period}})",
  },
  cell: {
    select: "Selecionar {{name}}",
    selectAll: "Selecionar todos os visíveis",
    missing: "{{label}}: {{reason}}",
  },
  view: {
    region: "Tabela de jogadores",
    grid: "Jogadores",
    who: "Quem aparece",
    how: "Como aparece",
    csv: "CSV",
    player: "jogador",
    players: "jogadores",
    of: "de {{total, count}}",
  },
  empty: {
    title: "Nenhum jogador",
    filtered: "Nenhum jogador passa pelos filtros. Afrouxe ou limpe algum.",
    search: "Ninguém com “{{query}}” no nome ou no clube nesta lista.",
  },
  hide: {
    byGroup: "Mostrada pelo grupo {{group}}",
    fixed: "Fixa nesta visão",
  },
  search: {
    label: "Buscar nesta lista",
    clear: "Limpar busca",
  },
  columns: {
    player: "Jogador",
    general: "Geral",
    groups: "Grupos de colunas",
    trigger: "Colunas",
    restore: "Restaurar o preset {{preset}}",
    editComposites: "Editar stats compostas…",
  },
  statPicker: {
    trigger: "{{name}}: {{value}}",
    full: "{{abbr}} ({{label}})",
  },
  rolePicker: {
    prefix: "Função",
    best: "Melhor função",
    trigger: "Função da coluna Performance: {{value}}",
    search: "Buscar função",
    empty: "Nenhuma função com esse nome",
  },
  selection: {
    label: "Seleção",
    clear: "Limpar seleção",
    selected_zero: "selecionados",
    selected_one: "selecionado",
    selected_many: "selecionados",
    selected_other: "selecionados",
    outside: "{{count, count}} fora da lista",
  },
  action: {
    buy: { label: "Adicionar ao carrinho", verb: "Comprar" },
    sell: { label: "Vender", verb: "Vender" },
    counted: "{{label}} ({{count, count}})",
    inCart_one: "Já no carrinho: tira o jogador",
    inCart_many: "Já no carrinho: tira os {{count, count}}",
    inCart_other: "Já no carrinho: tira os {{count, count}}",
    move: "{{verb}} {{players}} pelo valor de mercado, {{total}} no total",
    cartFull: "O carrinho guarda até {{max, count}} itens: cabe só mais {{room, count}}.",
    cartFullNone: "O carrinho guarda até {{max, count}} itens: não cabe mais nenhum.",
    inShortlist: "Já na Shortlist: tira de lá",
    toShortlist: "Guardar {{players}} na Shortlist",
    toFolder: "Guardar na pasta",
    heldOf: "{{held, count}} de {{total, count}}",
    folderFull: "cheia",
    folderLimit: "A pasta guarda até {{max, count}} jogadores.",
    compareHint_one: "Comparar este jogador lado a lado",
    compareHint_many: "Comparar estes {{count, count}} lado a lado",
    compareHint_other: "Comparar estes {{count, count}} lado a lado",
    compareLimit: "Comparar aceita até {{max}} jogadores: deixe {{max}} ou menos selecionados.",
    profileHint: "Abrir o painel do jogador",
    profileLimit: "Abre um perfil por vez: deixe só um selecionado.",
  },
} as const;
