import { RelatorioPage } from './RelatorioPage'

export function RelatoriosAcademicosPage() {
  return (
    <RelatorioPage
      endpoint="/relatorios/academicos"
      title="Relatórios Académicos"
      description="Indicadores e gráficos sobre estudantes, matrículas, cursos e anos académicos."
    />
  )
}

export function RelatoriosPedagogicosPage() {
  return (
    <RelatorioPage
      endpoint="/relatorios/pedagogicos"
      title="Relatórios Pedagógicos"
      description="Distribuição de notas, taxas de aprovação e desempenho por tipo de avaliação."
    />
  )
}

export function RelatoriosFinanceirosPage() {
  return (
    <RelatorioPage
      endpoint="/relatorios/financeiros"
      title="Relatórios Financeiros"
      description="Receitas, descontos, dívida acumulada e evolução mensal."
    />
  )
}

export function RelatoriosEstudantesPage() {
  return (
    <RelatorioPage
      endpoint="/relatorios/estudantes"
      title="Relatórios de Estudantes"
      description="Perfil demográfico — género, estado civil, país de origem."
    />
  )
}

export function RelatoriosRhPage() {
  return (
    <RelatorioPage
      endpoint="/relatorios/rh"
      title="Relatórios de Recursos Humanos"
      description="Distribuição de utilizadores por perfil de acesso e lista de docentes."
    />
  )
}

export function RelatoriosGeralPage() {
  return (
    <RelatorioPage
      endpoint="/relatorios/geral"
      title="Relatórios Gerais"
      description="Visão geral consolidada — estudantes, matrículas, cursos, candidatos e pagamentos."
    />
  )
}
