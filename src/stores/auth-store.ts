import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types/auth'

const ROLES_PRIVILEGIADAS = [
  'administrador',
  'superadministrador',
  'coordernador', // sic — typo do RoleSeeder backend
  'coordenador',
  'secretaria',
  'diretor academico',
  'diretor_academico',
]

type AuthState = {
  user: User | null
  token: string | null
  setSession: (user: User, token: string) => void
  setUser: (user: User) => void
  clear: () => void
  hasPermission: (permission: string) => boolean
  hasRole: (role: string) => boolean
  /** Verdadeiro se o user tem apenas o role 'docente' (sem outros roles privilegiados nem flag admin). */
  isApenasDocente: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      setSession: (user, token) => set({ user, token }),
      setUser: (user) => set({ user }),
      clear: () => set({ user: null, token: null }),
      hasPermission: (permission) => {
        const user = get().user
        if (!user) return false
        if (user.superadministrador || user.administrador) return true
        if (user.permissions?.includes('*')) return true
        return user.permissions?.includes(permission) ?? false
      },
      hasRole: (role) => {
        const user = get().user
        if (!user?.roles) return false
        return user.roles.map((r) => r.toLowerCase()).includes(role.toLowerCase())
      },
      isApenasDocente: () => {
        const user = get().user
        if (!user) return false
        if (user.administrador || user.superadministrador) return false
        const roles = (user.roles ?? []).map((r) => r.toLowerCase())
        const temPrivilegiada = roles.some((r) => ROLES_PRIVILEGIADAS.includes(r))
        if (temPrivilegiada) return false
        return roles.includes('docente') || !!user.docente
      },
    }),
    {
      name: 'neoacad-auth',
      partialize: (state) => ({ user: state.user, token: state.token }),
    },
  ),
)
