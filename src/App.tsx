import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { queryClient } from '@/lib/query-client'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/features/auth/LoginPage'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import { DocenteRouteGuard } from '@/features/auth/DocenteRouteGuard'

// Páginas autenticadas — lazy load para reduzir bundle inicial.
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const UsersPage = lazy(() => import('@/features/users/UsersPage').then((m) => ({ default: m.UsersPage })))
const EstudantesPage = lazy(() => import('@/features/estudantes/EstudantesPage').then((m) => ({ default: m.EstudantesPage })))
const EstudanteDetailsPage = lazy(() => import('@/features/estudantes/EstudanteDetailsPage').then((m) => ({ default: m.EstudanteDetailsPage })))
const CursosPage = lazy(() => import('@/features/cursos/CursosPage').then((m) => ({ default: m.CursosPage })))
const DepartamentosPage = lazy(() => import('@/features/departamentos').then((m) => ({ default: m.DepartamentosPage })))
const TurnosPage = lazy(() => import('@/features/turnos').then((m) => ({ default: m.TurnosPage })))
const DisciplinasPage = lazy(() => import('@/features/disciplinas').then((m) => ({ default: m.DisciplinasPage })))
const AnosAcademicosPage = lazy(() => import('@/features/anos-academicos').then((m) => ({ default: m.AnosAcademicosPage })))
const TiposAvaliacoesPage = lazy(() => import('@/features/tipos-avaliacoes').then((m) => ({ default: m.TiposAvaliacoesPage })))
const ConfigMultasPage = lazy(() => import('@/features/config-multas').then((m) => ({ default: m.ConfigMultasPage })))
const ConfigPropinasPage = lazy(() => import('@/features/config-propinas').then((m) => ({ default: m.ConfigPropinasPage })))
const DocentesPage = lazy(() => import('@/features/docentes').then((m) => ({ default: m.DocentesPage })))
const TurmasPage = lazy(() => import('@/features/turmas').then((m) => ({ default: m.TurmasPage })))
const TurmaDetailsPage = lazy(() => import('@/features/turmas').then((m) => ({ default: m.TurmaDetailsPage })))
const MatriculasPage = lazy(() => import('@/features/matriculas').then((m) => ({ default: m.MatriculasPage })))
const MatriculaDetailsPage = lazy(() => import('@/features/matriculas/MatriculaDetailsPage').then((m) => ({ default: m.MatriculaDetailsPage })))
const GrelhasCurricularesPage = lazy(() => import('@/features/grelhas-curriculares').then((m) => ({ default: m.GrelhasCurricularesPage })))
const GrelhaDetailsPage = lazy(() => import('@/features/grelhas-curriculares/GrelhaDetailsPage').then((m) => ({ default: m.GrelhaDetailsPage })))
const HorariosPage = lazy(() => import('@/features/horarios').then((m) => ({ default: m.HorariosPage })))
const AvaliacoesPage = lazy(() => import('@/features/avaliacoes').then((m) => ({ default: m.AvaliacoesPage })))
const PropinasPage = lazy(() => import('@/features/propinas').then((m) => ({ default: m.PropinasPage })))
const ParametrosPage = lazy(() => import('@/features/parametros').then((m) => ({ default: m.ParametrosPage })))
const PermissoesPage = lazy(() => import('@/features/permissoes').then((m) => ({ default: m.PermissoesPage })))
const PerfilDetailsPage = lazy(() => import('@/features/permissoes').then((m) => ({ default: m.PerfilDetailsPage })))
const AssiduidadePage = lazy(() => import('@/features/assiduidade').then((m) => ({ default: m.AssiduidadePage })))
const PlanosEnsinoPage = lazy(() => import('@/features/planos-ensino').then((m) => ({ default: m.PlanosEnsinoPage })))
const EmolumentosPage = lazy(() => import('@/features/emolumentos').then((m) => ({ default: m.EmolumentosPage })))
const ConfigEmolumentosPage = lazy(() => import('@/features/config-emolumentos').then((m) => ({ default: m.ConfigEmolumentosPage })))
const CalendarioPage = lazy(() => import('@/features/calendario').then((m) => ({ default: m.CalendarioPage })))
const CandidatosPage = lazy(() => import('@/features/candidatos').then((m) => ({ default: m.CandidatosPage })))
const HistoricoEscolarPage = lazy(() => import('@/features/historico-escolar').then((m) => ({ default: m.HistoricoEscolarPage })))
const RelatoriosAcademicosPage = lazy(() => import('@/features/relatorios').then((m) => ({ default: m.RelatoriosAcademicosPage })))
const RelatoriosPedagogicosPage = lazy(() => import('@/features/relatorios').then((m) => ({ default: m.RelatoriosPedagogicosPage })))
const RelatoriosFinanceirosPage = lazy(() => import('@/features/relatorios').then((m) => ({ default: m.RelatoriosFinanceirosPage })))
const RelatoriosEstudantesPage = lazy(() => import('@/features/relatorios').then((m) => ({ default: m.RelatoriosEstudantesPage })))
const RelatoriosRhPage = lazy(() => import('@/features/relatorios').then((m) => ({ default: m.RelatoriosRhPage })))
const RelatoriosGeralPage = lazy(() => import('@/features/relatorios').then((m) => ({ default: m.RelatoriosGeralPage })))
const AuditLogsPage = lazy(() => import('@/features/audit-logs').then((m) => ({ default: m.AuditLogsPage })))

function RouteFallback() {
  return (
    <div className="flex items-center justify-center py-20 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin mr-2" />
      A carregar...
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <BrowserRouter>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />

                <Route element={<ProtectedRoute />}>
                  <Route element={<DocenteRouteGuard />}>
                  <Route element={<AppShell />}>
                    <Route path="/" element={<DashboardPage />} />

                    {/* Gestão Académica */}
                    <Route path="/anos-academicos" element={<AnosAcademicosPage />} />
                    <Route path="/departamentos" element={<DepartamentosPage />} />
                    <Route path="/cursos" element={<CursosPage />} />
                    <Route path="/turnos" element={<TurnosPage />} />
                    <Route path="/disciplinas" element={<DisciplinasPage />} />
                    <Route path="/grelhas-curriculares" element={<GrelhasCurricularesPage />} />
                    <Route path="/grelhas-curriculares/:id" element={<GrelhaDetailsPage />} />
                    <Route path="/estudantes" element={<EstudantesPage />} />
                    <Route path="/estudantes/:id" element={<EstudanteDetailsPage />} />
                    <Route path="/matriculas" element={<MatriculasPage />} />
                    <Route path="/matriculas/:id" element={<MatriculaDetailsPage />} />
                    <Route path="/inscricoes" element={<CandidatosPage />} />
                    <Route path="/historico-escolar" element={<HistoricoEscolarPage />} />
                    <Route path="/turmas" element={<TurmasPage />} />
                    <Route path="/turmas/:id" element={<TurmaDetailsPage />} />
                    <Route path="/docentes" element={<DocentesPage />} />

                    {/* Gestão Pedagógica */}
                    <Route path="/planos-ensino" element={<PlanosEnsinoPage />} />
                    <Route path="/tipos-avaliacoes" element={<TiposAvaliacoesPage />} />
                    <Route path="/avaliacoes" element={<AvaliacoesPage />} />
                    <Route path="/horarios" element={<HorariosPage />} />
                    <Route path="/calendario" element={<CalendarioPage />} />

                    {/* Gestão Financeira */}
                    <Route path="/config-multas" element={<ConfigMultasPage />} />
                    <Route path="/config-propinas" element={<ConfigPropinasPage />} />
                    <Route path="/config-emolumentos" element={<ConfigEmolumentosPage />} />
                    <Route path="/propinas" element={<PropinasPage />} />
                    <Route path="/emolumentos" element={<EmolumentosPage />} />

                    {/* Gestão Administrativa */}
                    <Route path="/administrativa/docentes" element={<DocentesPage />} />

                    {/* Relatórios */}
                    <Route path="/relatorios/academicos" element={<RelatoriosAcademicosPage />} />
                    <Route path="/relatorios/pedagogicos" element={<RelatoriosPedagogicosPage />} />
                    <Route path="/relatorios/financeiros" element={<RelatoriosFinanceirosPage />} />
                    <Route path="/relatorios/estudantes" element={<RelatoriosEstudantesPage />} />
                    <Route path="/relatorios/rh" element={<RelatoriosRhPage />} />
                    <Route path="/relatorios/geral" element={<RelatoriosGeralPage />} />

                    {/* Configurações */}
                    <Route path="/parametros" element={<ParametrosPage />} />
                    <Route path="/permissoes" element={<PermissoesPage />} />
                    <Route path="/auditoria" element={<AuditLogsPage />} />
                    <Route path="/perfis/:id" element={<PerfilDetailsPage />} />
                    <Route path="/assiduidade" element={<AssiduidadePage />} />
                    <Route path="/users" element={<UsersPage />} />
                  </Route>
                  </Route>
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
          <Toaster richColors position="top-right" />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
