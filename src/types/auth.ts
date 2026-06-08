export type User = {
  id: number
  name: string
  email: string
  email_verified_at: string | null
  username: string
  administrador: boolean
  superadministrador: boolean
  docente?: boolean
  tema: string | null
  telefone: string | null
  activo: boolean
  suspended_at: string | null
  suspended_until: string | null
  permissions: string[]
  roles?: string[]
}

export type LoginResponse = {
  statusCode: number
  message: string
  token: string
  user: User
}

export type LoginCredentials = {
  login: string
  password: string
}
