import { api } from '@/lib/api'
import type { LoginCredentials, LoginResponse, User } from '@/types/auth'

export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/login', credentials)
  return data
}

export async function logout(): Promise<void> {
  await api.post('/logout')
}

export async function fetchCurrentUser(): Promise<User> {
  const { data } = await api.get<User>('/user')
  return data
}
