export const store = {
  notice: {
    storage: "Não foi possível abrir as configurações salvas; usando padrões",
    unreadable: "Não foi possível ler parte das configurações salvas; mudanças nelas não serão salvas nesta sessão.",
    restore: "Não foi possível ler as configurações salvas; usando padrões, sem salvar mudanças nesta sessão.",
  },
  error: {
    startReading: "Não foi possível começar a ler o jogo: {{message}}",
    readPlayers: "Não foi possível ler os jogadores: {{message}}",
    noPlayers: "o jogo não devolveu nenhum jogador; ele pode estar no menu principal ou carregando um save",
    engine: "Falha no motor de análise: {{message}}",
    statusTimeout: "O leitor do jogo não respondeu",
  },
  composite: {
    nameMissing: "Dê um nome à composta.",
    nameTooLong: "Use um nome de até {{max}} caracteres.",
    nameTaken: "Já existe uma composta com esse nome.",
    tooFewStats: "Escolha pelo menos {{min}} stats.",
    tooManyStats: "Use no máximo {{max}} stats.",
    noWeight: "Dê peso acima de 0 a pelo menos uma stat.",
    mixedKeepers: "Stats só de goleiro não se misturam com stats só de jogador de linha.",
  },
  shortlist: {
    defaultFolder: "Shortlist",
  },
} as const;
