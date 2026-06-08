import { api, type ApiResponse, type Paginated } from '@/lib/api'
import type { ListQueryParams } from '@/types/common'
import type { EstudanteFormInput, EstudanteRow } from './types'

export async function listEstudantes(
  params: ListQueryParams = {},
): Promise<Paginated<EstudanteRow>> {
  const { data } = await api.get<ApiResponse<Paginated<EstudanteRow>>>('/estudantes', { params })
  return data.dados as Paginated<EstudanteRow>
}

export async function getEstudante(id: number): Promise<EstudanteRow> {
  const { data } = await api.get<ApiResponse<EstudanteRow>>(`/estudantes/${id}`)
  return data.dados as EstudanteRow
}

export async function createEstudante(payload: EstudanteFormInput): Promise<void> {
  await api.post('/estudantes', payload)
}

export async function updateEstudante(
  id: number,
  payload: Partial<EstudanteFormInput>,
): Promise<void> {
  await api.put(`/estudantes/${id}`, payload)
}

export async function deleteEstudante(id: number): Promise<void> {
  await api.delete(`/estudantes/${id}`)
}

export type PaisOption = { id: number; nome: string; sigla?: string }

export async function listPaises(): Promise<PaisOption[]> {
  const { data } = await api.get<PaisOption[]>('/paises')
  return data
}
