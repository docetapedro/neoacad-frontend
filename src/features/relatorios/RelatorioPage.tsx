import { useQuery } from '@tanstack/react-query'
import { AlertCircle } from 'lucide-react'
import { api, type ApiResponse } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PageHeader } from '@/components/shared/PageHeader'
import { cn } from '@/lib/utils'

type Tone = 'default' | 'success' | 'warning' | 'danger' | 'info'

type Kpi = {
  label: string
  value: string | number
  tone?: Tone
}

type ChartItem = {
  label: string | number
  value: number
  media?: number
}

type RelatorioPayload = {
  kpis?: Kpi[]
  charts?: Record<string, ChartItem[]>
  tabela?: Array<Record<string, unknown>>
  // Permite payloads extra (ex.: geral devolve anos_recentes)
  [key: string]: unknown
}

const TONE_CARD_CLASSES: Record<Tone, string> = {
  default: 'border-border',
  success: 'border-emerald-300/60 dark:border-emerald-700/40',
  warning: 'border-amber-300/60 dark:border-amber-700/40',
  danger: 'border-rose-300/60 dark:border-rose-700/40',
  info: 'border-sky-300/60 dark:border-sky-700/40',
}

const TONE_VALUE_CLASSES: Record<Tone, string> = {
  default: 'text-foreground',
  success: 'text-emerald-600 dark:text-emerald-400',
  warning: 'text-amber-600 dark:text-amber-400',
  danger: 'text-rose-600 dark:text-rose-400',
  info: 'text-sky-600 dark:text-sky-400',
}

const TONE_BAR_CLASSES: Record<Tone, string> = {
  default: 'bg-primary/70',
  success: 'bg-emerald-500/80',
  warning: 'bg-amber-500/80',
  danger: 'bg-rose-500/80',
  info: 'bg-sky-500/80',
}

/**
 * Pretty-print chart key: "matriculas_por_curso" → "Matrículas por curso"
 */
function prettyTitle(key: string): string {
  const map: Record<string, string> = {
    matriculas_por_curso: 'Matrículas por curso',
    matriculas_por_ano: 'Matrículas por ano académico',
    matriculas_por_estado: 'Matrículas por estado',
    matriculas_por_mes: 'Matrículas por mês',
    distribuicao_notas: 'Distribuição de notas',
    por_tipo: 'Por tipo de avaliação',
    aprovacao: 'Aprovados vs Reprovados',
    receita_por_mes: 'Receita por mês',
    receita_por_curso: 'Receita por curso',
    por_genero: 'Distribuição por género',
    por_estado_civil: 'Por estado civil',
    por_pais: 'Por país',
    por_perfil: 'Distribuição por perfil',
  }
  if (map[key]) return map[key]
  return key
    .split('_')
    .map((p, i) => (i === 0 ? p.charAt(0).toUpperCase() + p.slice(1) : p))
    .join(' ')
}

function formatValue(value: string | number): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Intl.NumberFormat('pt-PT').format(value)
  }
  return String(value)
}

async function fetchRelatorio(endpoint: string, params?: Record<string, unknown>): Promise<RelatorioPayload> {
  const { data } = await api.get<ApiResponse<RelatorioPayload>>(endpoint, { params })
  return (data.dados ?? {}) as RelatorioPayload
}

type Props = {
  endpoint: string
  title: string
  description?: string
  params?: Record<string, unknown>
}

export function RelatorioPage({ endpoint, title, description, params }: Props) {
  const query = useQuery({
    queryKey: ['relatorio', endpoint, params],
    queryFn: () => fetchRelatorio(endpoint, params),
    staleTime: 60 * 1000,
  })

  return (
    <div>
      <PageHeader title={title} description={description} />

      {query.isLoading ? (
        <RelatorioSkeleton />
      ) : query.isError ? (
        <ErrorState />
      ) : (
        <RelatorioContent payload={query.data ?? {}} />
      )}
    </div>
  )
}

function RelatorioContent({ payload }: { payload: RelatorioPayload }) {
  const kpis = payload.kpis ?? []
  const charts = payload.charts ?? {}
  const tabela = payload.tabela ?? []

  return (
    <div className="space-y-6">
      {kpis.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpis.map((kpi, i) => {
            const tone: Tone = (kpi.tone ?? 'default') as Tone
            return (
              <Card key={i} className={cn('border', TONE_CARD_CLASSES[tone])}>
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    {kpi.label}
                  </p>
                  <p
                    className={cn(
                      'text-2xl font-semibold mt-1 tabular-nums',
                      TONE_VALUE_CLASSES[tone],
                    )}
                  >
                    {formatValue(kpi.value)}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {Object.keys(charts).length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Object.entries(charts).map(([key, items]) => (
            <ChartCard key={key} title={prettyTitle(key)} items={items} />
          ))}
        </div>
      )}

      {tabela.length > 0 && <TabelaCard tabela={tabela} />}
    </div>
  )
}

function ChartCard({ title, items }: { title: string; items: ChartItem[] }) {
  if (!items || items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground py-6">
          Sem dados.
        </CardContent>
      </Card>
    )
  }

  const max = Math.max(...items.map((i) => Number(i.value) || 0)) || 1
  const total = items.reduce((acc, i) => acc + (Number(i.value) || 0), 0)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>{title}</span>
          <Badge variant="outline" className="font-normal">
            Total: {formatValue(total)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {items.map((item, i) => {
            const value = Number(item.value) || 0
            const pct = (value / max) * 100
            const pctTotal = total > 0 ? (value / total) * 100 : 0
            return (
              <div key={i} className="space-y-1">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="font-medium truncate pr-2" title={String(item.label)}>
                    {item.label}
                  </span>
                  <span className="text-muted-foreground tabular-nums shrink-0">
                    {formatValue(value)}
                    {total > 0 && (
                      <span className="ml-1 opacity-60">({pctTotal.toFixed(1)}%)</span>
                    )}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', TONE_BAR_CLASSES.default)}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {item.media !== undefined && (
                  <p className="text-xs text-muted-foreground">
                    Média: {Number(item.media).toFixed(2)}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function TabelaCard({ tabela }: { tabela: Array<Record<string, unknown>> }) {
  const colunas = Object.keys(tabela[0] ?? {})

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Detalhe</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {colunas.map((c) => (
                  <TableHead key={c} className="capitalize">
                    {c.replace(/_/g, ' ')}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tabela.map((row, i) => (
                <TableRow key={i}>
                  {colunas.map((c) => (
                    <TableCell key={c} className="text-sm">
                      {formatCell(row[c])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'boolean') return v ? 'Sim' : 'Não'
  if (typeof v === 'number') return formatValue(v)
  return String(v)
}

function RelatorioSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    </div>
  )
}

function ErrorState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle className="h-10 w-10 text-destructive mb-3" />
        <p className="text-sm font-medium">Não foi possível carregar o relatório</p>
        <p className="text-xs text-muted-foreground mt-1">Tente recarregar a página.</p>
      </CardContent>
    </Card>
  )
}
