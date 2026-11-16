export const shell = {
  progress: {
    scan: "Procurando jogadores…",
    read: "Lendo jogadores ({{pct}}%)",
    readUnknownTotal: "Lendo jogadores…",
    analyze: "Calculando…",
    default: "Lendo o jogo…",
  },
  dataGate: {
    title: "Sem dados do jogo",
    retry: "Tentar de novo",
  },
  pageFailed: {
    title: "Não foi possível abrir esta tela",
    description: "A tela não carregou. Tente de novo; se continuar, feche e abra o app.",
    retry: "Tentar de novo",
  },
  cartButton: {
    label_zero: "Carrinho",
    label_one: "Carrinho, {{count}} item",
    label_many: "Carrinho, {{count}} itens",
    label_other: "Carrinho, {{count}} itens",
  },
  sidebar: {
    label: "Barra lateral",
    brand: "Moneyball FM27",
    nav: "Navegação",
    expand: "Expandir barra lateral",
    collapse: "Recolher barra lateral",
  },
  budget: {
    title: "Verba da janela",
    define: "Definir no Carrinho",
  },
  plate: {
    unknownBuild: "Versão do jogo não reconhecida",
    unknownBuildDetail:
      "O leitor não conhece este build do FM27: os números podem estar errados até uma atualização do app.",
    notFound: "Jogo não encontrado",
    readFailed: "Falha ao ler o jogo",
    noData: "Sem dados",
    stale: "Dados atrasados",
    live: "Ao vivo",
    idle: "Aguardando o jogo",
  },
  status: {
    label: "Status do jogo",
    warning: "Aviso",
    reading: "Leitura do jogo",
    build: "Build {{build}}",
    readAt: "Lido às {{clock}}",
    moneyUnread: "Moeda do jogo não lida: valores em libras",
    reload: "Recarregar dados do jogo",
    staleSummary: "Dados de {{dataDate}}, jogo em {{gameDate}}:",
    staleReload: "atualizar",
  },
  lab: {
    dataset: {
      demo: "Demo",
      worst: "Pior caso",
      empty: "Vazio",
      one: "Um jogador",
    },
    position: "Posição",
    noPosition: "Sem posição",
  },
} as const;
