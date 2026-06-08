import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import {
  ArrowLeft,
  BookOpen,
  GraduationCap,
  Loader2,
  Plus,
  Printer,
  Search,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { PageHeader } from '@/components/shared/PageHeader'
import { api, type ApiResponse } from '@/lib/api'
import { useClassesByCursoLookup, useDisciplinasLookup } from '@/lib/lookups'
import { cn } from '@/lib/utils'

type DisciplinaGrelha = {
  id: number
  grelha_curricular_id: number
  disciplina_id: number
  classe_id: number
  carga_cpt_t: number
  carga_cpt_tp: number
  carga_cpt_l: number
  carga_total: number
  disciplina?: { id: number; nome: string; sigla: string } | null
  classe?: { id: number; designacao: string; tipo: string | null; ordem: number | null } | null
}

type Grelha = {
  id: number
  curso_id: number | null
  nome: string
  descricao: string | null
  fechado: boolean
  activo: boolean
  curso?: { id: number; nome: string; sigla: string; num_etapas: number | null } | null
  disciplinas?: DisciplinaGrelha[]
  total_disciplinas?: number
}

async function fetchGrelha(id: number): Promise<Grelha> {
  const { data } = await api.get<ApiResponse<Grelha>>(`/grelhas-curriculares/${id}`)
  return data.dados as Grelha
}

async function fetchDisciplinas(grelhaId: number): Promise<DisciplinaGrelha[]> {
  const { data } = await api.get<ApiResponse<DisciplinaGrelha[]>>(
    `/grelhas-curriculares/${grelhaId}/disciplinas`,
  )
  return (data.dados ?? []) as DisciplinaGrelha[]
}

type BulkItem = {
  disciplina_id: number
  carga_cpt_t: number
  carga_cpt_tp: number
  carga_cpt_l: number
}

async function addDisciplinasBulk(
  grelhaId: number,
  payload: { classe: number; items: BulkItem[] },
): Promise<{ criadas: number; ignoradas: number }> {
  const { data } = await api.post<
    ApiResponse<{ criadas: number; ignoradas: number; erros: unknown[]; ja_existiam: number[] }>
  >(`/grelhas-curriculares/${grelhaId}/disciplinas/bulk`, payload)
  return data.dados as { criadas: number; ignoradas: number }
}

async function removeDisciplina(grelhaId: number, id: number): Promise<void> {
  await api.delete(`/grelhas-curriculares/${grelhaId}/disciplinas/${id}`)
}

export function GrelhaDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const grelhaId = Number(id)
  const [addOpen, setAddOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<DisciplinaGrelha | null>(null)
  const [imprimindo, setImprimindo] = useState(false)
  const [tabActiva, setTabActiva] = useState<number | null>(null)

  const grelhaQuery = useQuery({
    queryKey: ['grelha', grelhaId],
    queryFn: () => fetchGrelha(grelhaId),
    enabled: !!grelhaId,
  })

  const disciplinasQuery = useQuery({
    queryKey: ['grelha', grelhaId, 'disciplinas'],
    queryFn: () => fetchDisciplinas(grelhaId),
    enabled: !!grelhaId,
  })

  const disciplinas = disciplinasQuery.data ?? grelhaQuery.data?.disciplinas ?? []
  const grupos = useMemo(() => groupByClasse(disciplinas), [disciplinas])

  useEffect(() => {
    if (tabActiva === null && grupos.length > 0) {
      setTabActiva(grupos[0].classeId)
    }
    if (tabActiva !== null && grupos.length > 0 && !grupos.some((g) => g.classeId === tabActiva)) {
      setTabActiva(grupos[0].classeId)
    }
  }, [grupos, tabActiva])

  const deleteMutation = useMutation({
    mutationFn: (dg: DisciplinaGrelha) => removeDisciplina(grelhaId, dg.id),
    onSuccess: () => {
      toast.success('Disciplina removida da grelha')
      queryClient.invalidateQueries({ queryKey: ['grelha', grelhaId] })
      setConfirmDelete(null)
    },
    onError: (e: AxiosError<{ message?: string }>) =>
      toast.error(
        typeof e.response?.data?.message === 'string'
          ? e.response.data.message
          : 'Não foi possível remover',
      ),
  })

  const imprimirPdf = async () => {
    setImprimindo(true)
    try {
      const response = await api.get(`/grelhacurricular/${grelhaId}/print`, { responseType: 'blob' })
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
      toast.error(typeof msg === 'string' ? msg : 'Não foi possível gerar o PDF')
    } finally {
      setImprimindo(false)
    }
  }

  if (grelhaQuery.isLoading) return <Skeleton className="h-96 w-full" />
  if (!grelhaQuery.data) {
    return (
      <div>
        <Button variant="ghost" onClick={() => navigate('/grelhas-curriculares')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Grelha curricular não encontrada
          </CardContent>
        </Card>
      </div>
    )
  }

  const g = grelhaQuery.data
  const fechado = g.fechado
  const grupoActivo = grupos.find((gr) => gr.classeId === tabActiva) ?? grupos[0]

  return (
    <div>
      <Button
        variant="ghost"
        onClick={() => navigate('/grelhas-curriculares')}
        className="mb-2 -ml-2"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar à listagem
      </Button>

      <PageHeader
        title={g.nome}
        description={g.curso?.nome ?? 'Sem curso associado'}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={imprimirPdf}
              disabled={imprimindo || disciplinas.length === 0}
              title={disciplinas.length === 0 ? 'Sem disciplinas para imprimir' : 'Gerar PDF'}
            >
              {imprimindo ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Printer className="mr-2 h-4 w-4" />
              )}
              Imprimir
            </Button>
            <Button
              onClick={() => setAddOpen(true)}
              disabled={fechado || !g.curso_id}
              title={fechado ? 'Grelha fechada — bloqueada' : ''}
            >
              <Plus className="mr-2 h-4 w-4" />
              Adicionar disciplinas
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
        <SummaryCard icon={GraduationCap} label="Curso" value={g.curso?.nome ?? '—'} extra={g.curso?.sigla} />
        <SummaryCard icon={BookOpen} label="Disciplinas" value={String(disciplinas.length)} />
        <SummaryCard icon={BookOpen} label="Etapas do curso" value={String(g.curso?.num_etapas ?? '—')} />
        <Card>
          <CardContent className="pt-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Estado</p>
              {fechado ? (
                <Badge variant="secondary">Fechada</Badge>
              ) : g.activo ? (
                <Badge className="bg-emerald-600 hover:bg-emerald-600">Activa</Badge>
              ) : (
                <Badge variant="outline">Inactiva</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {disciplinasQuery.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : disciplinas.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>Nenhuma disciplina nesta grelha.</p>
            {!fechado && (
              <Button className="mt-4" onClick={() => setAddOpen(true)} disabled={!g.curso_id}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar as primeiras disciplinas
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="border-b overflow-x-auto">
              <div className="flex">
                {grupos.map((gr) => {
                  const isActive = gr.classeId === (grupoActivo?.classeId ?? -1)
                  return (
                    <button
                      key={gr.classeId}
                      onClick={() => setTabActiva(gr.classeId)}
                      className={cn(
                        'px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                        isActive
                          ? 'border-primary text-primary'
                          : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40',
                      )}
                    >
                      <span className="flex items-center gap-2">
                        {gr.classeLabel}
                        <Badge variant="outline" className="text-xs font-normal">
                          {gr.items.length}
                        </Badge>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              {grupoActivo && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Sigla</TableHead>
                      <TableHead>Disciplina</TableHead>
                      <TableHead className="text-center w-16">T</TableHead>
                      <TableHead className="text-center w-16">TP</TableHead>
                      <TableHead className="text-center w-16">L</TableHead>
                      <TableHead className="text-center w-20">Total</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grupoActivo.items.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {d.disciplina?.sigla ?? '—'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{d.disciplina?.nome ?? '—'}</TableCell>
                        <TableCell className="text-center font-mono">{d.carga_cpt_t}</TableCell>
                        <TableCell className="text-center font-mono">{d.carga_cpt_tp}</TableCell>
                        <TableCell className="text-center font-mono">{d.carga_cpt_l}</TableCell>
                        <TableCell className="text-center font-mono font-semibold">
                          {d.carga_total}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setConfirmDelete(d)}
                            disabled={fechado}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <AddDisciplinasBulkDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        grelhaId={grelhaId}
        cursoId={g.curso_id}
        jaPresentes={disciplinas}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="Remover disciplina"
        description={`Tem a certeza que pretende remover "${
          confirmDelete?.disciplina?.nome ?? ''
        }" da grelha?`}
        confirmLabel="Remover"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => confirmDelete && deleteMutation.mutate(confirmDelete)}
      />
    </div>
  )
}

type LinhaCargas = { t: number; tp: number; l: number }

function AddDisciplinasBulkDialog({
  open,
  onOpenChange,
  grelhaId,
  cursoId,
  jaPresentes,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  grelhaId: number
  cursoId: number | null
  jaPresentes: DisciplinaGrelha[]
}) {
  const queryClient = useQueryClient()
  const disciplinasQuery = useDisciplinasLookup(open)
  const classesQuery = useClassesByCursoLookup(open ? cursoId : null)

  const [classeId, setClasseId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  // Mapa de disciplina_id → cargas individuais. Presença no mapa = seleccionada.
  const [cargas, setCargas] = useState<Map<number, LinhaCargas>>(new Map())

  useEffect(() => {
    if (!open) {
      setClasseId(null)
      setSearch('')
      setCargas(new Map())
    }
  }, [open])

  const presentesNestaClasse = useMemo(() => {
    if (!classeId) return new Set<number>()
    return new Set(jaPresentes.filter((d) => d.classe_id === classeId).map((d) => d.disciplina_id))
  }, [jaPresentes, classeId])

  const filtradas = useMemo(() => {
    const all = disciplinasQuery.data ?? []
    const s = search.trim().toLowerCase()
    if (!s) return all
    return all.filter(
      (d) => d.nome.toLowerCase().includes(s) || (d.sigla ?? '').toLowerCase().includes(s),
    )
  }, [disciplinasQuery.data, search])

  const selecionada = (id: number) => cargas.has(id)

  const toggleSelecao = (id: number) => {
    setCargas((prev) => {
      const next = new Map(prev)
      if (next.has(id)) next.delete(id)
      else next.set(id, { t: 0, tp: 0, l: 0 })
      return next
    })
  }

  const updateCarga = (id: number, campo: keyof LinhaCargas, valor: number) => {
    setCargas((prev) => {
      const next = new Map(prev)
      const atual = next.get(id) ?? { t: 0, tp: 0, l: 0 }
      next.set(id, { ...atual, [campo]: Math.max(0, valor || 0) })
      return next
    })
  }

  const selecionarTodasVisiveis = () => {
    setCargas((prev) => {
      const next = new Map(prev)
      filtradas.forEach((d) => {
        if (!presentesNestaClasse.has(d.id) && !next.has(d.id)) {
          next.set(d.id, { t: 0, tp: 0, l: 0 })
        }
      })
      return next
    })
  }
  const limparSelecao = () => setCargas(new Map())

  const mutation = useMutation({
    mutationFn: () => {
      const items: BulkItem[] = Array.from(cargas.entries()).map(([disciplina_id, c]) => ({
        disciplina_id,
        carga_cpt_t: c.t,
        carga_cpt_tp: c.tp,
        carga_cpt_l: c.l,
      }))
      return addDisciplinasBulk(grelhaId, { classe: classeId!, items })
    },
    onSuccess: (r) => {
      const msg =
        r.ignoradas > 0
          ? `${r.criadas} adicionada(s) — ${r.ignoradas} já existiam e foram ignoradas.`
          : `${r.criadas} disciplina(s) adicionada(s) à grelha.`
      toast.success(msg)
      queryClient.invalidateQueries({ queryKey: ['grelha', grelhaId] })
      onOpenChange(false)
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
      toast.error(typeof data?.message === 'string' ? data.message : 'Erro ao adicionar')
    },
  })

  const podeSubmeter = !!classeId && cargas.size > 0

  // Total agregado para mostrar no rodapé
  const totalAgregado = Array.from(cargas.values()).reduce(
    (acc, c) => acc + c.t + c.tp + c.l,
    0,
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar disciplinas à grelha</DialogTitle>
          <DialogDescription>
            Escolha a classe/etapa, marque as disciplinas e defina as cargas horárias específicas de cada uma.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-sm">Classe / Etapa</Label>
            <Select
              value={classeId?.toString() ?? ''}
              onValueChange={(v) => {
                setClasseId(Number(v))
                setCargas(new Map())
              }}
              disabled={!cursoId}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={!cursoId ? 'Sem curso' : 'Seleccionar classe'} />
              </SelectTrigger>
              <SelectContent>
                {classesQuery.data?.map((c) => (
                  <SelectItem key={c.id} value={c.id.toString()}>
                    {c.designacao}
                    {c.tipo === 'A' ? 'º Ano' : c.tipo === 'S' ? 'º Semestre' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm">Disciplinas e cargas horárias</Label>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={selecionarTodasVisiveis}
                  disabled={!classeId}
                  className="text-muted-foreground hover:text-foreground hover:underline disabled:opacity-40"
                >
                  Marcar todas visíveis
                </button>
                <span className="text-muted-foreground">·</span>
                <button
                  type="button"
                  onClick={limparSelecao}
                  className="text-muted-foreground hover:text-foreground hover:underline"
                >
                  Limpar
                </button>
              </div>
            </div>

            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filtrar disciplinas..."
                className="pl-9"
              />
            </div>

            <div className="max-h-[400px] overflow-y-auto rounded-md border">
              {disciplinasQuery.isLoading ? (
                <div className="p-3 space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : filtradas.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-8">
                  Sem disciplinas que correspondam ao filtro.
                </div>
              ) : (
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead className="w-20">Sigla</TableHead>
                      <TableHead>Disciplina</TableHead>
                      <TableHead className="w-20 text-center">T</TableHead>
                      <TableHead className="w-20 text-center">TP</TableHead>
                      <TableHead className="w-20 text-center">L</TableHead>
                      <TableHead className="w-16 text-center">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtradas.map((d) => {
                      const presente = presentesNestaClasse.has(d.id)
                      const sel = selecionada(d.id)
                      const c = cargas.get(d.id) ?? { t: 0, tp: 0, l: 0 }
                      const totalLinha = c.t + c.tp + c.l
                      return (
                        <TableRow
                          key={d.id}
                          className={cn(
                            presente && 'opacity-50 bg-muted/30',
                            sel && !presente && 'bg-primary/5',
                          )}
                        >
                          <TableCell>
                            <Checkbox
                              checked={sel}
                              disabled={presente}
                              onCheckedChange={() => !presente && toggleSelecao(d.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-xs">
                              {d.sigla}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {d.nome}
                            {presente && (
                              <Badge variant="outline" className="ml-2 text-xs">já na grelha</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              value={sel ? c.t : ''}
                              disabled={!sel || presente}
                              placeholder="—"
                              onChange={(e) => updateCarga(d.id, 't', Number(e.target.value))}
                              className="h-8 text-center font-mono text-sm"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              value={sel ? c.tp : ''}
                              disabled={!sel || presente}
                              placeholder="—"
                              onChange={(e) => updateCarga(d.id, 'tp', Number(e.target.value))}
                              className="h-8 text-center font-mono text-sm"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              value={sel ? c.l : ''}
                              disabled={!sel || presente}
                              placeholder="—"
                              onChange={(e) => updateCarga(d.id, 'l', Number(e.target.value))}
                              className="h-8 text-center font-mono text-sm"
                            />
                          </TableCell>
                          <TableCell className="text-center font-mono text-sm font-semibold">
                            {sel ? totalLinha : '—'}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </div>

            {classeId && cargas.size > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                {cargas.size} disciplina{cargas.size === 1 ? '' : 's'} seleccionada{cargas.size === 1 ? '' : 's'} —
                carga total agregada: <span className="font-mono font-semibold text-foreground">{totalAgregado}</span>
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={!podeSubmeter || mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Adicionar {cargas.size > 0 ? `(${cargas.size})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  extra,
}: {
  icon: React.ElementType
  label: string
  value: string
  extra?: string
}) {
  return (
    <Card>
      <CardContent className="pt-6 flex items-center gap-3">
        <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="space-y-1 min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-semibold truncate">{value}</p>
          {extra && <p className="text-xs text-muted-foreground">{extra}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

type Grupo = {
  classeId: number
  classeLabel: string
  ordem: number
  items: DisciplinaGrelha[]
}

function groupByClasse(items: DisciplinaGrelha[]): Grupo[] {
  const map = new Map<number, Grupo>()
  for (const d of items) {
    const id = d.classe?.id ?? d.classe_id
    if (!map.has(id)) {
      const sufixo = d.classe?.tipo === 'A' ? 'º Ano' : d.classe?.tipo === 'S' ? 'º Semestre' : ''
      map.set(id, {
        classeId: id,
        classeLabel: `${d.classe?.designacao ?? '—'}${sufixo}`,
        ordem: d.classe?.ordem ?? 0,
        items: [],
      })
    }
    map.get(id)!.items.push(d)
  }
  return Array.from(map.values()).sort((a, b) => a.ordem - b.ordem)
}
