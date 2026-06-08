export type UserRow = {
  id: number
  name: string
  username: string
  email: string
  superadministrador: boolean
  administrador: boolean
  docente: boolean
  activo: boolean
  suspended_at: string | null
  suspended_until: string | null
  created_at: string
  updated_at: string
}

export type UserFormInput = {
  name: string
  username: string
  email: string
  password?: string
  telefone?: string
  // Backend espera strings '0'/'1' nestes campos
  superadministrador?: '0' | '1'
  administrador?: '0' | '1'
  docente?: '0' | '1'
  activo?: '0' | '1'
}
