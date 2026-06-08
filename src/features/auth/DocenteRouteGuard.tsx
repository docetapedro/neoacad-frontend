import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth-store'

/**
 * Allow-list de prefixos que um user "apenas docente" pode visitar. Match é por
 * prefixo: '/turmas' abre também '/turmas/:id'. Inclui o detalhe da turma, a
 * pauta e correcções pontuais em /avaliacoes.
 */
const ROTAS_DOCENTE = [
  '/',
  '/turmas',
  '/avaliacoes',
]

function pathPermitido(pathname: string): boolean {
  if (pathname === '/') return true
  return ROTAS_DOCENTE.some(
    (p) => p !== '/' && (pathname === p || pathname.startsWith(`${p}/`)),
  )
}

export function DocenteRouteGuard() {
  const isApenasDocente = useAuthStore((s) => s.isApenasDocente())
  const location = useLocation()

  if (isApenasDocente && !pathPermitido(location.pathname)) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
