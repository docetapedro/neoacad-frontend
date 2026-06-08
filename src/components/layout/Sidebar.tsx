import { useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  BarChart3,
  BookOpen,
  ChevronDown,
  CreditCard,
  GraduationCap,
  Home,
  Layers,
  Settings,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

type Leaf = { to: string; label: string }
type Group = { id: string; label: string; icon: LucideIcon; children: Leaf[] }
type Single = { to: string; label: string; icon: LucideIcon }
type Entry = Group | Single

const NAV: Entry[] = [
  { to: '/', label: 'Home', icon: Home },

  // Fluxo de entrada do estudante: candidatura → matrícula → histórico
  {
    id: 'admissoes',
    label: 'Admissões',
    icon: UserPlus,
    children: [
      { to: '/inscricoes', label: 'Inscrições (Candidatos)' },
      { to: '/matriculas', label: 'Matrículas' },
      { to: '/historico-escolar', label: 'Histórico Escolar' },
    ],
  },

  // Quem usa o sistema: estudantes, docentes, utilizadores administrativos
  {
    id: 'pessoas',
    label: 'Pessoas',
    icon: Users,
    children: [
      { to: '/estudantes', label: 'Estudantes' },
      { to: '/docentes', label: 'Docentes' },
      { to: '/users', label: 'Utilizadores do sistema' },
    ],
  },

  // Estrutura/catálogo académico — configuração estrutural (raramente muda)
  {
    id: 'catalogo',
    label: 'Catálogo Académico',
    icon: Layers,
    children: [
      { to: '/anos-academicos', label: 'Anos Académicos' },
      { to: '/departamentos', label: 'Departamentos' },
      { to: '/cursos', label: 'Cursos' },
      { to: '/turnos', label: 'Turnos' },
      { to: '/disciplinas', label: 'Disciplinas' },
      { to: '/grelhas-curriculares', label: 'Grelhas Curriculares' },
    ],
  },

  // Operação pedagógica do dia-a-dia (turmas, notas, horários, assiduidade)
  {
    id: 'pedagogica',
    label: 'Gestão Pedagógica',
    icon: BookOpen,
    children: [
      { to: '/turmas', label: 'Turmas' },
      { to: '/planos-ensino', label: 'Planos de Ensino' },
      { to: '/tipos-avaliacoes', label: 'Tipos de Avaliações' },
      { to: '/avaliacoes', label: 'Avaliações / Notas' },
      { to: '/horarios', label: 'Horários' },
      { to: '/calendario', label: 'Calendário Escolar' },
      { to: '/assiduidade', label: 'Assiduidade' },
    ],
  },

  // Configuração financeira primeiro, depois operação
  {
    id: 'financeira',
    label: 'Gestão Financeira',
    icon: CreditCard,
    children: [
      { to: '/config-propinas', label: 'Config. de Propinas' },
      { to: '/config-emolumentos', label: 'Config. de Emolumentos' },
      { to: '/config-multas', label: 'Config. de Multas' },
      { to: '/propinas', label: 'Propinas' },
      { to: '/emolumentos', label: 'Emolumentos' },
    ],
  },

  {
    id: 'relatorios',
    label: 'Relatórios',
    icon: BarChart3,
    children: [
      { to: '/relatorios/geral', label: 'Geral' },
      { to: '/relatorios/academicos', label: 'Académicos' },
      { to: '/relatorios/pedagogicos', label: 'Pedagógicos' },
      { to: '/relatorios/financeiros', label: 'Financeiros' },
      { to: '/relatorios/estudantes', label: 'Estudantes' },
      { to: '/relatorios/rh', label: 'Recursos Humanos' },
    ],
  },

  // Apenas configuração técnica / segurança
  {
    id: 'sistema',
    label: 'Sistema',
    icon: Settings,
    children: [
      { to: '/parametros', label: 'Parâmetros da Instituição' },
      { to: '/permissoes', label: 'Perfis e Permissões' },
      { to: '/auditoria', label: 'Auditoria de Acessos' },
    ],
  },
]

/**
 * Caminhos permitidos a um user que tenha APENAS o role 'docente' (sem outros
 * roles privilegiados). Mantém-se compacto: home + as suas turmas + avaliações
 * (entrada para correcções pontuais) + perfil.
 */
const PATHS_PERMITIDOS_DOCENTE = new Set([
  '/',
  '/turmas',
  '/avaliacoes',
])

function filtrarMenuParaDocente(nav: Entry[]): Entry[] {
  return nav
    .map((entry) => {
      if ('to' in entry) {
        return PATHS_PERMITIDOS_DOCENTE.has(entry.to) ? entry : null
      }
      const children = entry.children.filter((c) => PATHS_PERMITIDOS_DOCENTE.has(c.to))
      if (children.length === 0) return null
      return { ...entry, children }
    })
    .filter((e): e is Entry => e !== null)
}

export function Sidebar() {
  const location = useLocation()
  const isApenasDocente = useAuthStore((s) => s.isApenasDocente())

  const navItems = useMemo(
    () => (isApenasDocente ? filtrarMenuParaDocente(NAV) : NAV),
    [isApenasDocente],
  )

  const activeGroup = useMemo(() => {
    for (const item of navItems) {
      if ('children' in item) {
        if (item.children.some((c) => location.pathname.startsWith(c.to))) {
          return item.id
        }
      }
    }
    return null
  }, [location.pathname, navItems])

  const [open, setOpen] = useState<Record<string, boolean>>({})

  const isOpen = (id: string) => open[id] ?? id === activeGroup

  return (
    <aside className="hidden md:flex flex-col w-64 border-r bg-sidebar text-sidebar-foreground">
      <div className="h-16 flex items-center gap-3 px-5 border-b shrink-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold leading-tight">NeoAcad</span>
          <span className="text-xs text-muted-foreground">Gestão académica</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems.map((entry) => {
          if ('to' in entry) {
            return (
              <NavLink
                key={entry.to}
                to={entry.to}
                end
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  )
                }
              >
                <entry.icon className="h-4 w-4 shrink-0" />
                <span>{entry.label}</span>
              </NavLink>
            )
          }

          return (
            <Collapsible
              key={entry.id}
              open={isOpen(entry.id)}
              onOpenChange={(v) => setOpen((prev) => ({ ...prev, [entry.id]: v }))}
            >
              <CollapsibleTrigger
                className={cn(
                  'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                )}
              >
                <span className="flex items-center gap-3">
                  <entry.icon className="h-4 w-4 shrink-0" />
                  <span>{entry.label}</span>
                </span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 transition-transform duration-200',
                    isOpen(entry.id) && 'rotate-180',
                  )}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1 ml-4 border-l border-sidebar-border space-y-0.5 pl-3">
                {entry.children.map((leaf) => (
                  <NavLink
                    key={leaf.to}
                    to={leaf.to}
                    className={({ isActive }) =>
                      cn(
                        'block rounded-md px-3 py-1.5 text-sm transition-colors',
                        isActive
                          ? 'bg-sidebar-primary/10 text-sidebar-primary font-medium'
                          : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                      )
                    }
                  >
                    {leaf.label}
                  </NavLink>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )
        })}
      </nav>
    </aside>
  )
}
