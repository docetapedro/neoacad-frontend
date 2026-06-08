import { Fragment, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  ChevronDown,
  ChevronRight,
  Filter,
  User,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/shared/DatePicker'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DataTablePagination } from '@/components/shared/DataTablePagination'
import { PageHeader } from '@/components/shared/PageHeader'
import { api, type ApiResponse, type Paginated } from '@/lib/api'
import { cn } from '@/lib/utils'

type AuditLog = {
  id: number
  log_name: string | null
  event: string | null
  description: string | null
  subject_type: string | null
  subject_id: number | null
  causer_type: string | null
  causer_id: number | null
  causer: { id: number; name: string | null; email: string | null } | null
  properties: Record<string, unknown> | null
  batch_uuid: string | null
  created_at: string | null
  updated_at: string | null
}

type Filters = {
  event: string
  log_name: string
  causer_id: string
  subject_type: string
  data_inicio: string
  data_fim: string
}

const EMPTY_FILTERS: Filters = {
  event: '',
  log_name: '',
  causer_id: '',
  subject_type: '',
  data_inicio: '',
  data_fim: '',
}

const EVENT_LABELS: Record<string, { label: string; tone: string }> = {
  created: { label: 'Criado', tone: 'bg-emerald-600 hover:bg-emerald-600' },
  updated: { label: 'Actualizado', tone: 'bg-sky-600 hover:bg-sky-600' },
  deleted: { label: 'Eliminado', tone: 'bg-rose-600 hover:bg-rose-600' },
  restored: { label: 'Restaurado', tone: 'bg-violet-600 hover:bg-violet-600' },
  lancamento_pauta: { label: 'Pauta lançada', tone: 'bg-amber-600 hover:bg-amber-600' },
  login: { label: 'Login', tone: 'bg-slate-700 hover:bg-slate-700' },
  logout: { label: 'Logout', tone: 'bg-slate-500 hover:bg-slate-500' },
}

function shortModel(fqcn: string | null): string {
  if (!fqcn) return '—'
  const parts = fqcn.split('\\')
  return parts[parts.length - 1] ?? fqcn
}

async function fetchAuditLogs(params: Record<string, unknown>): Promise<Paginated<AuditLog>> {
  const cleaned = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null),
  )
  const { data } = await api.get<ApiResponse<Paginated<AuditLog>>>('/audit-logs', {
    params: cleaned,
  })
  return data.dados as Paginated<AuditLog>
}

export function AuditLogsPage() {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)

  const query = useQuery({
    queryKey: ['audit-logs', { page, ...filters }],
    queryFn: () => fetchAuditLogs({ page, ...filters }),
    placeholderData: (prev) => prev,
  })

  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const toggle = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const items = query.data?.items ?? []
  const pag = query.data?.paginacao
  const hasFilter = Object.values(filters).some((v) => v !== '')

  const update = <K extends keyof Filters>(k: K, v: Filters[K]) => {
    setFilters((prev) => ({ ...prev, [k]: v }))
    setPage(1)
  }

  return (
    <div>
      <PageHeader
        title="Auditoria de Acessos"
        description="Histórico de criação, alteração e eliminação de registos por utilizador. Os dados vêm do activity log e são apenas leitura."
      />

      <Card className="p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Filtros</h3>
          {hasFilter && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-7"
              onClick={() => setFilters(EMPTY_FILTERS)}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Limpar
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <Label className="text-xs">Evento</Label>
            <Select value={filters.event} onValueChange={(v) => update('event', v === '__all' ? '' : v)}>
              <SelectTrigger className="mt-1 h-9">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Todos</SelectItem>
                <SelectItem value="created">Criado</SelectItem>
                <SelectItem value="updated">Actualizado</SelectItem>
                <SelectItem value="deleted">Eliminado</SelectItem>
                <SelectItem value="restored">Restaurado</SelectItem>
                <SelectItem value="lancamento_pauta">Pauta lançada</SelectItem>
                <SelectItem value="login">Login</SelectItem>
                <SelectItem value="logout">Logout</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Log name</Label>
            <Input
              value={filters.log_name}
              onChange={(e) => update('log_name', e.target.value)}
              placeholder="default, auth..."
              className="mt-1 h-9"
            />
          </div>
          <div>
            <Label className="text-xs">Utilizador (ID)</Label>
            <Input
              type="number"
              min={1}
              value={filters.causer_id}
              onChange={(e) => update('causer_id', e.target.value)}
              placeholder="ex. 10004"
              className="mt-1 h-9"
            />
          </div>
          <div>
            <Label className="text-xs">Tipo de objecto</Label>
            <Input
              value={filters.subject_type}
              onChange={(e) => update('subject_type', e.target.value)}
              placeholder="App\\Models\\Turma"
              className="mt-1 h-9 font-mono text-xs"
            />
          </div>
          <div>
            <Label className="text-xs">Data início</Label>
            <DatePicker
              value={filters.data_inicio}
              onChange={(v) => update('data_inicio', v)}
              className="mt-1 h-9"
              placeholder="Início"
            />
          </div>
          <div>
            <Label className="text-xs">Data fim</Label>
            <DatePicker
              value={filters.data_fim}
              onChange={(v) => update('data_fim', v)}
              className="mt-1 h-9"
              placeholder="Fim"
            />
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12" />
                <TableHead>Quando</TableHead>
                <TableHead>Evento</TableHead>
                <TableHead>Objecto</TableHead>
                <TableHead>Utilizador</TableHead>
                <TableHead>Descrição</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                    Sem registos para os filtros seleccionados.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((row) => {
                  const isOpen = expanded.has(row.id)
                  const event = row.event ?? 'updated'
                  const meta = EVENT_LABELS[event]
                  return (
                    <Fragment key={row.id}>
                      <TableRow className={cn(isOpen && 'border-b-0 bg-muted/30')}>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => toggle(row.id)}
                            title={isOpen ? 'Recolher' : 'Ver detalhe'}
                          >
                            {isOpen ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="font-mono text-xs whitespace-nowrap">
                          {row.created_at ?? '—'}
                        </TableCell>
                        <TableCell>
                          {meta ? (
                            <Badge className={meta.tone}>{meta.label}</Badge>
                          ) : (
                            <Badge variant="outline">{event}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{shortModel(row.subject_type)}</span>
                          {row.subject_id ? (
                            <span className="text-muted-foreground font-mono">
                              {' '}#{row.subject_id}
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          {row.causer ? (
                            <span className="flex items-center gap-1.5 text-sm">
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                              {row.causer.name ?? row.causer.email ?? `#${row.causer.id}`}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">Sistema</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground line-clamp-1">
                          {row.description ?? '—'}
                        </TableCell>
                      </TableRow>
                      {isOpen && (
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={6} className="p-0">
                            <DetalheLog log={row} />
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {pag && (
          <DataTablePagination
            total={pag.total}
            pageSize={pag.por_pagina}
            currentPage={pag.pagina_actual}
            lastPage={pag.ultima_pagina}
            onPageChange={setPage}
          />
        )}
      </Card>
    </div>
  )
}

function DetalheLog({ log }: { log: AuditLog }) {
  const props = (log.properties ?? {}) as {
    attributes?: Record<string, unknown>
    old?: Record<string, unknown>
    notas?: Array<{
      inscricao_turma_id: number
      avaliacao_id: number
      accao: string
      nota_antiga: unknown
      nota_nova: unknown
    }>
  }
  const novos = props.attributes ?? null
  const antigos = props.old ?? null
  const notas = props.notas ?? null
  const outros = Object.fromEntries(
    Object.entries(log.properties ?? {}).filter(
      ([k]) => k !== 'attributes' && k !== 'old' && k !== 'notas',
    ),
  )

  return (
    <div className="p-4 border-t space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <Meta label="ID" value={String(log.id)} mono />
        <Meta label="Log name" value={log.log_name ?? '—'} />
        <Meta label="Subject" value={`${shortModel(log.subject_type)}#${log.subject_id ?? '—'}`} mono />
        <Meta label="Batch UUID" value={log.batch_uuid ?? '—'} mono />
      </div>

      {notas && notas.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            Notas lançadas ({notas.length})
          </h4>
          <div className="rounded-md border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Inscrição-turma</TableHead>
                  <TableHead>Avaliação</TableHead>
                  <TableHead>Acção</TableHead>
                  <TableHead>Nota anterior</TableHead>
                  <TableHead>Nota nova</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notas.map((n, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs">#{n.inscricao_turma_id}</TableCell>
                    <TableCell className="font-mono text-xs">#{n.avaliacao_id}</TableCell>
                    <TableCell>
                      {n.accao === 'criada' ? (
                        <Badge className="bg-emerald-600 hover:bg-emerald-600">Criada</Badge>
                      ) : (
                        <Badge className="bg-sky-600 hover:bg-sky-600">Actualizada</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-rose-600 dark:text-rose-400">
                      {formatValor(n.nota_antiga)}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-emerald-600 dark:text-emerald-400">
                      {formatValor(n.nota_nova)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {(antigos || novos) && (
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            Alterações
          </h4>
          <div className="rounded-md border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/3">Campo</TableHead>
                  <TableHead>Antes</TableHead>
                  <TableHead>Depois</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {camposAlterados(antigos, novos).map((campo) => (
                  <TableRow key={campo}>
                    <TableCell className="font-mono text-xs">{campo}</TableCell>
                    <TableCell className="font-mono text-xs text-rose-600 dark:text-rose-400 whitespace-pre-wrap break-all">
                      {formatValor(antigos?.[campo])}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-emerald-600 dark:text-emerald-400 whitespace-pre-wrap break-all">
                      {formatValor(novos?.[campo])}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {Object.keys(outros).length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2">Outras propriedades</h4>
          <pre className="rounded-md border bg-background p-3 text-xs overflow-x-auto">
            {JSON.stringify(outros, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}:</span>{' '}
      <span className={cn(mono && 'font-mono')}>{value}</span>
    </div>
  )
}

function camposAlterados(
  antigos: Record<string, unknown> | null,
  novos: Record<string, unknown> | null,
): string[] {
  const set = new Set<string>()
  if (antigos) Object.keys(antigos).forEach((k) => set.add(k))
  if (novos) Object.keys(novos).forEach((k) => set.add(k))
  return Array.from(set).sort()
}

function formatValor(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  try {
    return JSON.stringify(v, null, 2)
  } catch {
    return String(v)
  }
}

