export type CursoRow = {
  id: number
  departamento_id: number | null
  nome: string
  sigla: string
  descricao: string | null
  num_etapas: number
  formula_media_final: string | null
  departamento?: { id: number; nome: string | null } | null
  created_at: string
  updated_at: string
}

export type CursoFormInput = {
  nome: string
  sigla: string
  departamento: number
  num_etapas: number
  descricao?: string
  formula_media_final?: string
}

export type DepartamentoOption = { id: number; nome: string }
