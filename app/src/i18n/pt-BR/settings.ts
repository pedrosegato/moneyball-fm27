export const settings = {
  restoreDefault: "Restaurar padrão",
  sections: {
    label: "Seções de Configurações",
    geral: "Geral",
    compostas: "Stats compostas",
  },
  appearance: {
    title: "Aparência",
    theme: "Tema",
    themeHint: "O escuro acompanha o FM à noite; o claro é para o dia.",
    dark: "Escuro",
    light: "Claro",
  },
  currency: {
    title: "Moeda",
    label: "Moeda do jogo",
    hintRead: "Valores e salários aparecem como no FM, na cotação do jogo: {{rate}}.",
    hintUnread: "O app não conseguiu ler a moeda escolhida no FM.",
    value: "{{name}} ({{symbol}}), salários {{wage}}",
    unread: "Não lida: valores em libras, salários por semana",
  },
  game: {
    title: "Jogo",
    scopeLabel: "Jogos lidos",
    scopeHint:
      "Os minutos e as stats de cada jogador contam só os jogos oficiais, ou todos os jogos. Trocar lê o jogo de novo.",
    scope: {
      competitive: "Só oficiais",
      league: "Só a liga",
      cups: "Só copas",
      continental: "Só continentais",
    },
    pollLabel: "Checar a data do jogo a cada",
    pollHint:
      "Quanto menor, mais cedo o app nota que o jogo avançou. De {{min}} a {{max}} s; a checagem é uma leitura leve.",
    pollName: "Intervalo de checagem do jogo, em segundos",
    pollSuffix: "s",
  },
  league: {
    title: "Análise",
    label: "Peso da liga",
    hint: "Quanto a Performance desconta a diferença de força entre a liga do jogador e a sua. 0 desliga; 1 é o desconto estimado pelos dados.",
    off: "Desligado",
    multiplier: "{{value}}×",
  },
  restoreAll: {
    title: "Padrões",
    label: "Restaurar todos os padrões",
    hint: "Tema, checagem do jogo, critérios das páginas, pesos das ligas e das stats compostas.",
    open: "Restaurar todos os padrões…",
    dialogTitle: "Restaurar todos os padrões?",
    dialogBody:
      "Voltam ao padrão o tema, a checagem do jogo, os critérios do Moneyball, do Sell/Keep e das contratações do Elenco, os pesos das ligas e os pesos da Performance e das Ações/90. Suas compostas, a shortlist, o carrinho, as colunas e os filtros ficam como estão.",
  },
  compositesLink: {
    title: "Stats compostas",
    label: "Pesos e compostas próprias",
    hint: "Performance por posição, Ações/90 e até 6 compostas suas.",
    edit: "Editar stats compostas",
  },
  composites: {
    nav: {
      label: "Compostas",
      actions: "Ações/90",
      custom: "Suas compostas",
      create: "Nova composta",
      full: "Exclua uma para criar outra.",
      edited: "Pesos editados",
      editedSr: "(editado)",
    },
    name: {
      label: "Nome",
      aria: "Nome da composta",
      placeholder: "Ex.: Criador, Box-to-box",
    },
    weights: {
      aria: "Stats e pesos",
      empty: "Nenhuma stat ainda. Adicione de 3 a 12.",
      weight: "Peso (0–10)",
      share: "Parte da nota",
      remove: "Tirar",
      weightOf: "Peso de {{abbr}}",
      removeOf: "Tirar {{abbr}}",
      zeroWeight: "Peso 0: a stat fica de fora",
      minStats_one: "Uma composta precisa de pelo menos {{count}} stat",
      minStats_many: "Uma composta precisa de pelo menos {{count}} stats",
      minStats_other: "Uma composta precisa de pelo menos {{count}} stats",
    },
    kind: {
      actions: "Soma ponderada dos valores por 90, como as Actions/90 do FMDataLab. Só entram contagens por 90.",
      custom:
        "Média ponderada dos percentis das stats, cada jogador contra os da posição dele, como as Custom Computed do FMDataLab. Vira coluna em Compostas e eixo nos Gráficos.",
    },
    note: {
      coverage:
        "Um jogador só recebe nota com pelo menos 60% do peso em stats que ele tem; peso 0 deixa a stat de fora. Stats de goleiro só comparam goleiros.",
    },
    form: {
      newTitle: "Nova composta",
      statCount_zero: "{{count, count}} stats",
      statCount_one: "{{count, count}} stat",
      statCount_many: "{{count, count}} stats",
      statCount_other: "{{count, count}} stats",
      statRange: " de {{min}} a {{max}}",
      create: "Criar composta",
      delete: "Excluir composta",
      problemNew: "Falta: {{problem}}",
      problemKept: "{{problem}} A última versão válida continua valendo.",
    },
    deleteDialog: {
      title: "Excluir a composta {{label}}?",
      body: "A coluna dela sai das tabelas e dos Gráficos, junto com os filtros que a usam.",
    },
    adder: {
      add: "Adicionar stat",
      searchAria: "Buscar stat para adicionar",
    },
    preview: {
      label: "Prévia",
      top: "Top {{n}}",
      recalculating: "Recalculando",
      waiting: "A prévia aparece quando os jogadores do save forem lidos.",
      displayCaption: "Quem tem {{pool}}, todas as posições: cada um nos percentis da posição dele.",
      displayEmpty: "Ninguém com {{pool}} tem stats suficientes para uma nota.",
    },
  },
} as const;
