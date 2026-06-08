import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  GraduationCap,
  HelpCircle,
  Loader2,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Trash2,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { PautaDialog } from '@/features/avaliacoes/PautaDialog'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import { api, type ApiResponse, type Paginated } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

type Estudante = {
  inscricao_id: number
  estudante_id: number | null
  num_processo: string | null
  nome: string | null
  email: string | null
  repetente: boolean
  aprovado: boolean | null
  media_final: number | string | null
}

type Estatisticas = {
  total: number
  aprovados: number
  reprovados: number
  repetentes: number
  por_avaliar: number
}

type Docente = {
  id: number
  name: string | null
  email: string | null
  username: string | null
  activo_na_turma?: boolean
}

type Turma = {
  id: number
  sigla: string | null
  nome: string | null
  descricao: string | null
  formula_media_final: string | null
  turno?: { id: number; sigla: string | null; nome: string } | null
  ano_academico?: { id: number; ano: number } | null
  curso?: { id: number; sigla: string | null; nome: string } | null
  disciplina?: { id: number; sigla: string | null; nome: string } | null
  inscricoes_count?: number
  estatisticas?: Estatisticas
  estudantes?: Estudante[]
  docentes?: Docente[]
}

async function fetchTurma(id: number): Promise<Turma> {
  const { data } = await api.get<ApiResponse<Turma>>(`/turmas/${id}`)
  return data.dados as Turma
}

export function TurmaDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const turmaId = Number(id)
  const [pautaOpen, setPautaOpen] = useState(false)
  const [imprimindo, setImprimindo] = useState(false)

  const imprimirPauta = async () => {
    setImprimindo(true)
    try {
      const response = await api.get(`/turma/${turmaId}/printpauta`, { responseType: 'blob' })
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (e) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? // @ts-expect-error — payload variável
            (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      toast.error(typeof msg === 'string' ? msg : 'Não foi possível gerar a pauta PDF')
    } finally {
      setImprimindo(false)
    }
  }

  const query = useQuery({
    queryKey: ['turma', turmaId],
    queryFn: () => fetchTurma(turmaId),
    enabled: !!turmaId,
  })

  if (query.isLoading) return <DetailsSkeleton />
  if (!query.data) {
    return (
      <div>
        <Button variant="ghost" onClick={() => navigate('/turmas')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Turma não encontrada
          </CardContent>
        </Card>
      </div>
    )
  }

  const turma = query.data
  const stats = turma.estatisticas

  return (
    <div>
      <Button variant="ghost" onClick={() => navigate('/turmas')} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar
      </Button>

      <PageHeader
        title={turma.nome ?? `Turma #${turma.id}`}
        description={
          turma.sigla
            ? `Sigla: ${turma.sigla}`
            : 'Detalhes da turma e estudantes inscritos.'
        }
        actions={
          <div className="flex items-center gap-2">
            {turma.sigla && (
              <Badge variant="outline" className="font-mono text-base px-3 py-1">
                {turma.sigla}
              </Badge>
            )}
            <Button
              variant="outline"
              onClick={imprimirPauta}
              disabled={imprimindo || (turma.estudantes?.length ?? 0) === 0}
              title={(turma.estudantes?.length ?? 0) === 0 ? 'Turma sem estudantes inscritos' : 'Gerar PDF da pauta'}
            >
              {imprimindo ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Printer className="mr-2 h-4 w-4" />
              )}
              Imprimir pauta
            </Button>
            <Button onClick={() => setPautaOpen(true)} disabled={(turma.estudantes?.length ?? 0) === 0}>
              <ClipboardList className="mr-2 h-4 w-4" />
              Lançar notas
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Identificação
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <InfoLine icon={GraduationCap} label="Curso">
              {turma.curso ? (
                <span className="flex items-center gap-2">
                  {turma.curso.sigla && (
                    <Badge variant="outline" className="font-mono text-xs">
                      {turma.curso.sigla}
                    </Badge>
                  )}
                  <span>{turma.curso.nome}</span>
                </span>
              ) : (
                '—'
              )}
            </InfoLine>
            <InfoLine icon={BookOpen} label="Disciplina">
              {turma.disciplina?.nome ?? '—'}
            </InfoLine>
            <InfoLine icon={Clock} label="Turno">
              {turma.turno?.nome ?? '—'}
            </InfoLine>
            <InfoLine icon={Calendar} label="Ano académico">
              <span className="font-mono">{turma.ano_academico?.ano ?? '—'}</span>
            </InfoLine>
            {turma.formula_media_final && (
              <InfoLine icon={HelpCircle} label="Fórmula da média final">
                <code className="text-xs bg-muted px-2 py-0.5 rounded">
                  {turma.formula_media_final}
                </code>
              </InfoLine>
            )}
            {turma.descricao && (
              <div className="sm:col-span-2">
                <p className="text-xs text-muted-foreground mb-1">Descrição</p>
                <p>{turma.descricao}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Estatísticas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <StatRow
              icon={Users}
              label="Total de inscritos"
              value={stats?.total ?? 0}
            />
            <StatRow
              icon={CheckCircle2}
              label="Aprovados"
              value={stats?.aprovados ?? 0}
              tone="success"
            />
            <StatRow
              icon={XCircle}
              label="Reprovados"
              value={stats?.reprovados ?? 0}
              tone="danger"
            />
            <StatRow
              icon={RotateCcw}
              label="Repetentes"
              value={stats?.repetentes ?? 0}
              tone="warning"
            />
            <StatRow
              icon={HelpCircle}
              label="Por avaliar"
              value={stats?.por_avaliar ?? 0}
              tone="info"
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4" />
            Estudantes inscritos
            <Badge variant="outline" className="ml-2">
              {turma.estudantes?.length ?? 0}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(turma.estudantes?.length ?? 0) === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-10">
              Sem estudantes inscritos nesta turma.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Nº Processo</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="w-24 text-center">Média</TableHead>
                    <TableHead className="w-32">Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {turma.estudantes!.map((e) => (
                    <TableRow key={e.inscricao_id}>
                      <TableCell className="font-mono text-xs">
                        {e.num_processo ?? '—'}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{e.nome ?? '—'}</span>
                        {e.repetente && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Repetente
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {e.email ?? '—'}
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {e.media_final !== null && e.media_final !== undefined
                          ? Number(e.media_final).toFixed(2)
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <SituacaoBadge aprovado={e.aprovado} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6">
        <DocentesSection turmaId={turma.id} docentes={turma.docentes ?? []} />
      </div>

      <PautaDialog
        open={pautaOpen}
        onOpenChange={setPautaOpen}
        initialTurmaId={turma.id}
        lockTurma
      />
    </div>
  )
}

// ============================================================
// Docentes da turma
// ============================================================

function DocentesSection({
  turmaId,
  docentes,
}: {
  turmaId: number
  docentes: Docente[]
}) {
  const queryClient = useQueryClient()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState<Docente | null>(null)

  // Só users com permissão "Editar Turma" (ou admins) podem associar/remover
  // docentes; um "apenas docente" não vê estes controlos.
  const podeGerirDocentes = useAuthStore((s) => s.hasPermission('Editar Turma'))

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['turma', turmaId] })

  const removeMutation = useMutation({
    mutationFn: (docenteId: number) =>
      api.delete(`/turmas/${turmaId}/docentes/${docenteId}`),
    onSuccess: () => {
      toast.success('Docente removido da turma')
      invalidate()
      setConfirmRemove(null)
    },
    onError: (e: AxiosError<{ message?: string }>) =>
      toast.error(
        typeof e.response?.data?.message === 'string'
          ? e.response.data.message
          : 'Não foi possível remover',
      ),
  })

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Docentes
              <Badge variant="outline" className="ml-2">{docentes.length}</Badge>
            </CardTitle>
            {podeGerirDocentes && (
              <Button size="sm" variant="outline" onClick={() => setPickerOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Associar docente
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {docentes.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              Sem docentes associados a esta turma.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="w-12 text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {docentes.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.name ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{d.email ?? '—'}</TableCell>
                      <TableCell className="text-right">
                        {podeGerirDocentes ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setConfirmRemove(d)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {pickerOpen && (
        <DocentePickerDialog
          turmaId={turmaId}
          jaAssociados={new Set(docentes.map((d) => d.id))}
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          onAdded={() => {
            invalidate()
            setPickerOpen(false)
          }}
        />
      )}

      {confirmRemove && (
        <ConfirmDialog
          open={!!confirmRemove}
          onOpenChange={(o) => !o && setConfirmRemove(null)}
          title="Remover docente da turma"
          description={`Remover "${confirmRemove.name ?? 'docente'}" desta turma?`}
          confirmLabel="Remover"
          variant="destructive"
          isLoading={removeMutation.isPending}
          onConfirm={() => removeMutation.mutate(confirmRemove.id)}
        />
      )}
    </>
  )
}

type DocenteRow = { id: number; name: string; email: string | null; username: string | null }

async function searchDocentes(searchTerm: string): Promise<DocenteRow[]> {
  const { data } = await api.get<ApiResponse<Paginated<DocenteRow>>>('/users', {
    params: { searchTerm, docente: 1, quantidade: 50 },
  })
  return data.dados?.items ?? []
}

function DocentePickerDialog({
  turmaId,
  jaAssociados,
  open,
  onOpenChange,
  onAdded,
}: {
  turmaId: number
  jaAssociados: Set<number>
  open: boolean
  onOpenChange: (v: boolean) => void
  onAdded: () => void
}) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const query = useQuery({
    queryKey: ['docentes-picker', search],
    queryFn: () => searchDocentes(search),
    enabled: open,
  })

  const mutation = useMutation({
    mutationFn: () =>
      api.post(`/turmas/${turmaId}/docentes`, { docente_ids: Array.from(selected) }),
    onSuccess: () => {
      toast.success(`${selected.size} docente(s) associado(s) à turma`)
      setSelected(new Set())
      onAdded()
    },
    onError: (e: AxiosError<{ message?: unknown; errors?: Record<string, string[]> }>) => {
      const data = e.response?.data
      if (data?.errors) {
        const first = Object.values(data.errors)[0]
        if (Array.isArray(first) && first[0]) {
          toast.error(first[0])
          return
        }
      }
      toast.error(typeof data?.message === 'string' ? data.message : 'Erro ao associar')
    },
  })

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Associar docentes à turma</DialogTitle>
          <DialogDescription>
            Pesquise utilizadores marcados como docente. {selected.size} seleccionado{selected.size === 1 ? '' : 's'}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar docente..."
              className="pl-9"
              autoFocus
            />
          </div>
          <div className="max-h-80 overflow-y-auto rounded-md border">
            {query.isLoading ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : (query.data?.length ?? 0) === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-10">Sem resultados.</div>
            ) : (
              query.data!.map((d) => {
                const isAssociado = jaAssociados.has(d.id)
                return (
                  <label
                    key={d.id}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 border-b last:border-b-0',
                      isAssociado ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted cursor-pointer',
                    )}
                  >
                    <Checkbox
                      checked={selected.has(d.id)}
                      disabled={isAssociado}
                      onCheckedChange={() => !isAssociado && toggle(d.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{d.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{d.email ?? d.username}</div>
                    </div>
                    {isAssociado && <Badge variant="outline" className="text-xs">já associado</Badge>}
                  </label>
                )
              })
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || selected.size === 0}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Associar {selected.size > 0 ? `(${selected.size})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function InfoLine({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>
      <div className="text-sm">{children}</div>
    </div>
  )
}

const TONE_VALUE: Record<string, string> = {
  default: 'text-foreground',
  success: 'text-emerald-600 dark:text-emerald-400',
  warning: 'text-amber-600 dark:text-amber-400',
  danger: 'text-rose-600 dark:text-rose-400',
  info: 'text-sky-600 dark:text-sky-400',
}

function StatRow({
  icon: Icon,
  label,
  value,
  tone = 'default',
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info'
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      <span className={cn('font-semibold tabular-nums', TONE_VALUE[tone])}>{value}</span>
    </div>
  )
}

function SituacaoBadge({ aprovado }: { aprovado: boolean | null }) {
  if (aprovado === null) return <Badge variant="outline">Por avaliar</Badge>
  if (aprovado)
    return (
      <Badge className="bg-emerald-600 hover:bg-emerald-600">
        <CheckCircle2 className="mr-1 h-3 w-3" />
        Aprovado
      </Badge>
    )
  return (
    <Badge variant="destructive">
      <XCircle className="mr-1 h-3 w-3" />
      Reprovado
    </Badge>
  )
}

function DetailsSkeleton() {
  return (
    <div>
      <Skeleton className="h-9 w-24 mb-4" />
      <Skeleton className="h-10 w-72 mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Skeleton className="h-56 lg:col-span-2" />
        <Skeleton className="h-56" />
      </div>
      <Skeleton className="h-72 w-full" />
    </div>
  )
}
