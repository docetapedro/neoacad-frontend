export type Candidato = {
  id: number
  numero: string
  nome_completo: string
  data_nascimento: string
  genero: 'M' | 'F'
  nacionalidade: string | null
  naturalidade: string | null
  tipo_documento: string
  numero_documento: string
  data_emissao: string | null
  data_validade: string | null
  telefone_principal: string
  telefone_alternativo: string | null
  email: string | null
  endereco: string | null
  provincia: string | null
  municipio: string | null
  nome_encarregado: string | null
  parentesco: string | null
  telefone_encarregado: string | null
  escola_origem: string | null
  ultima_classe: string | null
  ano_conclusao: number | null
  media_final: number | string | null
  curso_id: number
  turno_id: number
  ano_lectivo_id: number
  estado: 'pendente' | 'aprovado' | 'rejeitado' | string
  observacoes: string | null
  estudante_id?: number | null
  converted_at?: string | null
  curso?: { id: number; nome: string; sigla: string } | null
  turno?: { id: number; nome: string } | null
  ano_academico?: { id: number; ano: number } | null
}
