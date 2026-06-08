import { api, type ApiResponse, type Paginated } from '@/lib/api'

export type CrudParams = Record<string, unknown>

/**
 * Genérico para CRUDs padrão da API.
 *
 * Pressupõe que o endpoint:
 * - GET /{resource} devolve { dados: { items: T[], paginacao: {...} } }
 * - GET /{resource}/{id} devolve { dados: T }
 * - POST/PUT/DELETE seguem REST padrão
 */
export function createCrudClient<TRow, TInput = Partial<TRow>>(resource: string) {
  return {
    list: async (params: CrudParams = {}): Promise<Paginated<TRow>> => {
      const { data } = await api.get<ApiResponse<Paginated<TRow>>>(`/${resource}`, { params })
      return data.dados as Paginated<TRow>
    },
    get: async (id: number): Promise<TRow> => {
      const { data } = await api.get<ApiResponse<TRow>>(`/${resource}/${id}`)
      return data.dados as TRow
    },
    create: async (payload: TInput): Promise<void> => {
      await api.post(`/${resource}`, payload)
    },
    update: async (id: number, payload: Partial<TInput>): Promise<void> => {
      await api.put(`/${resource}/${id}`, payload)
    },
    remove: async (id: number): Promise<void> => {
      await api.delete(`/${resource}/${id}`)
    },
  }
}
