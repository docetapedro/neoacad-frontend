export type EstudanteRow = {
  id: number
  num_processo: string
  genero: 'M' | 'F' | null
  estado_civil: string | null
  data_nascimento: string | null
  num_bi: string | null
  nif: string | null
  email_faturacao: string | null
  telefone_faturacao: string | null
  telefone_responsavel: string | null
  nome_pai: string | null
  nome_mae: string | null
  contactos: string | null
  militar: boolean
  endereco: string | null
  observacao: string | null
  total_divida: number | string | null
  pais?: { id: number; nome: string | null } | null
  user?: {
    id: number
    name: string
    email: string
    username: string
  } | null
  created_at: string
  updated_at: string
}

export type EstudanteFormInput = {
  nome: string
  email: string
  pais: number
  genero: 'M' | 'F'
  estado_civil: string
  data_nascimento: string
  num_bi: string
  nif: string
  email_faturacao: string
  telefone: string
  telefone_faturacao: string
  telefone_responsavel: string
  nome_pai: string
  nome_mae: string
  endereco?: string
  militar?: boolean
  observacao?: string
}
