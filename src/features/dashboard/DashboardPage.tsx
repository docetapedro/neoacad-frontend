import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  AlertTriangle,
  Banknote,
  BookOpen,
  Building2,
  ClipboardCheck,
  ClipboardList,
  GraduationCap,
  Info,
  TrendingUp,
  UserCheck,
  UserPlus,
  type LucideIcon,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { api, type ApiResponse } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'

type Tone = 'default' | 'success' | 'warning' | 'danger' | 'info'

type Kpi = { label: string; value: string | number; tone?: Tone }
type ChartItem = { label: string | number; value: number }

type RelatorioGeral = {
  kpis: Kpi[]
  charts?: { matriculas_por_mes?: ChartItem[] }
}

type Alerta = {
  tipo: 'warning' | 'danger' | 'info'
  label: string
  valor: number
  detalhe: string
  link: string
}

type AlertasPayload = { total: number; alertas: Alerta[] }

async function fetchRelatorioGeral(): Promise<RelatorioGeral> {
  const { data } = await api.get<ApiResponse<RelatorioGeral>>('/relatorios/geral')
  return (data.dados ?? { kpis: [] }) as RelatorioGeral
}

async function fetchAlertas(): Promise<AlertasPayload> {
  const { data } = await api.get<ApiResponse<AlertasPayload>>('/dashboard/alertas')
  return (data.dados ?? { total: 0, alertas: [] }) as AlertasPayload
}

const KPI_META: Record<string, { icon: LucideIcon; href?: string }> = {
  'Estudantes': { icon: GraduationCap, href: '/estudantes' },
  'Matrículas activas': { icon: ClipboardCheck, href: '/matriculas' },
  'Cursos': { icon: BookOpen, href: '/cursos' },
  'Departamentos': { icon: Building2, href: '/departamentos' },
  'Candidatos pendentes': { icon: UserPlus, href: '/inscricoes' },
  'Avaliações lançadas': { icon: ClipboardList, href: '/avaliacoes' },
  'Pagamentos registados': { icon: Banknote, href: '/propinas' },
}

const TONE_CARD: Record<Tone, string> = {
  default: 'border-border',
  success: 'border-emerald-300/60 dark:border-emerald-700/40',
  warning: 'border-amber-300/60 dark:border-amber-700/40',
  danger: 'border-rose-300/60 dark:border-rose-700/40',
  info: 'border-sky-300/60 dark:border-sky-700/40',
}
const TONE_VALUE: Record<Tone, string> = {
  default: 'text-foreground',
  success: 'text-emerald-600 dark:text-emerald-400',
  warning: 'text-amber-600 dark:text-amber-400',
  danger: 'text-rose-600 dark:text-rose-400',
  info: 'text-sky-600 dark:text-sky-400',
}

const ALERTA_STYLES: Record<Alerta['tipo'], { card: string; icon: string; Icon: LucideIcon; badge: string }> = {
  warning: {
    card: 'border-amber-300/60 bg-amber-50/50 dark:border-amber-700/40 dark:bg-amber-950/20',
    icon: 'text-amber-600 dark:text-amber-400',
    badge: 'bg-amber-600 hover:bg-amber-600',
    Icon: AlertTriangle,
  },
  danger: {
    card: 'border-rose-300/60 bg-rose-50/50 dark:border-rose-700/40 dark:bg-rose-950/20',
    icon: 'text-rose-600 dark:text-rose-400',
    badge: 'bg-rose-600 hover:bg-rose-600',
    Icon: AlertCircle,
  },
  info: {
    card: 'border-sky-300/60 bg-sky-50/50 dark:border-sky-700/40 dark:bg-sky-950/20',
    icon: 'text-sky-600 dark:text-sky-400',
    badge: 'bg-sky-600 hover:bg-sky-600',
    Icon: Info,
  },
}

function formatValue(value: string | number): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Intl.NumberFormat('pt-PT').format(value)
  }
  return String(value)
}

function prettyMes(label: string | number): string {
  const s = String(label)
  // "2026-06" → "Jun 26"
  const m = s.match(/^(\d{4})-(\d{2})$/)
  if (!m) return s
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return `${meses[Number(m[2]) - 1] ?? m[2]}/${m[1].slice(2)}`
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const relatorioQuery = useQuery({
    queryKey: ['dashboard-geral'],
    queryFn: fetchRelatorioGeral,
    staleTime: 60 * 1000,
  })
  const alertasQuery = useQuery({
    queryKey: ['dashboard-alertas'],
    queryFn: fetchAlertas,
    staleTime: 60 * 1000,
  })

  // KPIs ocultados da dashboard (continuam disponíveis no relatório geral)
  const KPIS_OCULTOS = new Set(['Pagamentos registados', 'Avaliações lançadas', 'Departamentos'])
  const kpis = (relatorioQuery.data?.kpis ?? []).filter((k) => !KPIS_OCULTOS.has(k.label))
  const matriculasMes = relatorioQuery.data?.charts?.matriculas_por_mes ?? []
  const alertas = alertasQuery.data?.alertas ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Olá, {user?.name?.split(' ')[0] ?? 'Bem-vindo'}
        </h1>
        <p className="text-sm text-muted-foreground">
          Painel inicial da plataforma NeoAcad.
        </p>
      </div>

      {/* Banner de alertas */}
      {alertasQuery.isLoading ? (
        <Skeleton className="h-20 w-full" />
      ) : alertas.length === 0 ? null : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {alertas.map((a, i) => {
            const styles = ALERTA_STYLES[a.tipo]
            const Icon = styles.Icon
            return (
              <Link key={i} to={a.link} className="block">
                <Card className={cn('border transition-colors hover:brightness-95', styles.card)}>
                  <CardContent className="pt-4 pb-4 flex items-start gap-3">
                    <Icon className={cn('h-5 w-5 mt-0.5 shrink-0', styles.icon)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold">{a.label}</p>
                        <Badge className={cn('text-xs', styles.badge)}>{a.valor}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{a.detalhe}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {relatorioQuery.isLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)
          : kpis.map((kpi) => {
              const meta = KPI_META[kpi.label]
              const Icon = meta?.icon ?? GraduationCap
              const tone: Tone = (kpi.tone ?? 'default') as Tone
              const body = (
                <Card
                  className={cn(
                    'border transition-colors',
                    TONE_CARD[tone],
                    meta?.href && 'hover:bg-muted/40 cursor-pointer',
                  )}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {kpi.label}
                    </CardTitle>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className={cn('text-2xl font-semibold tabular-nums', TONE_VALUE[tone])}>
                      {formatValue(kpi.value)}
                    </div>
                  </CardContent>
                </Card>
              )

              return meta?.href ? (
                <Link key={kpi.label} to={meta.href} className="block">{body}</Link>
              ) : (
                <div key={kpi.label}>{body}</div>
              )
            })}
      </div>

      {/* Gráfico matrículas por mês */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Matrículas por mês — últimos 12 meses
          </CardTitle>
        </CardHeader>
        <CardContent>
          {relatorioQuery.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : matriculasMes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Sem matrículas registadas nos últimos 12 meses.
            </p>
          ) : (
            <MatriculasChart items={matriculasMes} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function MatriculasChart({ items }: { items: ChartItem[] }) {
  const max = Math.max(...items.map((i) => Number(i.value) || 0)) || 1
  const total = items.reduce((acc, i) => acc + (Number(i.value) || 0), 0)
  return (
    <div>
      <div className="flex items-end gap-2 h-48 mb-2 border-b pb-2">
        {items.map((item, i) => {
          const value = Number(item.value) || 0
          const heightPct = (value / max) * 100
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 min-w-0">
              <span className="text-xs font-mono tabular-nums text-foreground">
                {value > 0 ? value : ''}
              </span>
              <div
                className="w-full rounded-t-sm bg-primary/70 hover:bg-primary transition-colors min-h-[2px]"
                style={{ height: `${heightPct}%` }}
                title={`${item.label}: ${value}`}
              />
            </div>
          )
        })}
      </div>
      <div className="flex gap-2 text-xs text-muted-foreground">
        {items.map((item, i) => (
          <div key={i} className="flex-1 text-center truncate" title={String(item.label)}>
            {prettyMes(item.label)}
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-3 text-right">
        Total no período: <span className="font-mono font-semibold text-foreground">{total}</span>
      </p>
    </div>
  )
}
