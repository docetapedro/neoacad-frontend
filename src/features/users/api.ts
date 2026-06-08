import { api, type ApiResponse, type Paginated } from '@/lib/api'
import type { ListQueryParams } from '@/types/common'
import type { UserFormInput, UserRow } from './types'

export async function listUsers(params: ListQueryParams = {}): Promise<Paginated<UserRow>> {
  const { data } = await api.get<ApiResponse<Paginated<UserRow>>>('/users', { params })
  return data.dados as Paginated<UserRow>
}

export async function getUser(id: number): Promise<UserRow> {
  const { data } = await api.get<ApiResponse<UserRow>>(`/users/${id}`)
  return data.dados as UserRow
}

export async function createUser(payload: UserFormInput): Promise<void> {
  await api.post('/users', payload)
}

export async function updateUser(id: number, payload: UserFormInput): Promise<void> {
  await api.put(`/users/${id}`, payload)
}

export async function deleteUser(id: number): Promise<void> {
  await api.delete(`/users/${id}`)
}

export async function suspendUser(id: number, dias?: number): Promise<void> {
  await api.patch(`/users/${id}/suspender`, dias ? { dias } : {})
}

export async function restoreUser(id: number): Promise<void> {
  await api.patch(`/users/${id}/restaurar`)
}
