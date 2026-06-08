import { api, type ApiResponse, type Paginated } from '@/lib/api'
import type { ListQueryParams } from '@/types/common'
import type { CursoFormInput, CursoRow, DepartamentoOption } from './types'

export async function listCursos(params: ListQueryParams = {}): Promise<Paginated<CursoRow>> {
  const { data } = await api.get<ApiResponse<Paginated<CursoRow>>>('/cursos', { params })
  return data.dados as Paginated<CursoRow>
}

export async function createCurso(payload: CursoFormInput): Promise<void> {
  await api.post('/cursos', payload)
}

export async function updateCurso(
  id: number,
  payload: Partial<CursoFormInput>,
): Promise<void> {
  await api.put(`/cursos/${id}`, payload)
}

export async function deleteCurso(id: number): Promise<void> {
  await api.delete(`/cursos/${id}`)
}

export async function listDepartamentos(): Promise<DepartamentoOption[]> {
  const { data } = await api.get<ApiResponse<Paginated<DepartamentoOption>>>('/departamentos', {
    params: { quantidade: 200 },
  })
  return data.dados?.items ?? []
}
