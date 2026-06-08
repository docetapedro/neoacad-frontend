import { Fragment, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { Check, ChevronDown, ChevronRight, Layers, Pencil, Plus, ShieldAlert, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { api, type ApiResponse } from '@/lib/api'
import { useAnosAcademicosLookup, useCursosLookup } from '@/lib/lookups'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
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
import { cn } from '@/lib/utils'

function extractErrorMessage(e: unknown, fallback: string): string {
  if (e instanceof AxiosError) {
    const data = e.response?.data as { message?: unknown; errors?: Record<string, string[]> } | undefined
    if (data?.errors) {
      const first = Object.values(data.errors)[0]
      if (Array.isArray(first) && first[0]) return first[0]
    }
    if (typeof data?.message === 'string' && data.message) return data.message
  }
  return fallback
}

type Associacao = {
  id: number
  curso_id: number
  turno_id: number
  ano_academico_id: number
  activo: boolean
  capacidade_maxima: number | null
  matriculas_count: number
  vagas_restantes: number | null
  curso: { id: number; sigla: string | null; nome: string } | null
  ano_academico: { id: number; ano: number } | null
}

type TurnoComAssociacoes = {
  id: number
  sigla: string
  nome: string
  associacoes_count: number
  activas_count: number
  associacoes: Associacao[]
}

async function fetchTurnosComAssociacoes(): Promise<TurnoComAssociacoes[]> {
  const { data } = await api.get<ApiResponse<TurnoComAssociacoes[]>>('/turnos-com-associacoes')
  return data.dados ?? []
}

async function createAssociacao(payload: {
  curso_id: number
  turno_id: number
  ano_academico_id: number
  activo?: boolean
  capacidade_maxima?: number | null
}): Promise<void> {
  await api.post('/curso-turno-ano-academicos', payload)
}

async function toggleAssociacao(id: number): Promise<void> {
  await api.patch(`/curso-turno-ano-academicos/${id}/toggle`)
}

async function updateCapacidade(id: number, capacidade: number | null): Promise<void> {
  await api.put(`/curso-turno-ano-academicos/${id}`, { capacidade_maxima: capacidade })
}

async function deleteAssociacao(id: number): Promise<void> {
  await api.delete(`/curso-turno-ano-academicos/${id}`)
}

export function TurnosPage() {
  const queryClient = useQueryClient()
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set([1, 2, 3]))
  const [addingFor, setAddingFor] = useState<TurnoComAssociacoes | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Associacao | null>(null)

  const query = useQuery({
    queryKey: ['turnos-com-associacoes'],
    queryFn: fetchTurnosComAssociacoes,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['turnos-com-associacoes'] })

  const toggleMutation = useMutation({
    mutationFn: toggleAssociacao,
    onSuccess: invalidate,
    onError: (e) => toast.error(extractErrorMessage(e, 'Não foi possível alterar o estado')),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAssociacao,
    onSuccess: () => {
      toast.success('Associação eliminada')
      invalidate()
      setConfirmDelete(null)
    },
    onError: (e) => toast.error(extractErrorMessage(e, 'Não foi possível eliminar')),
  })

  const toggle = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const turnos = query.data ?? []

  return (
    <div>
      <PageHeader
        title="Turnos"
        description="Os 3 turnos da instituição são fixos. Use esta página para gerir que cursos×anos académicos estão associados a cada turno."
      />

      <Card className="p-4">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12" />
                <TableHead className="w-24">Sigla</TableHead>
                <TableHead>Turno</TableHead>
                <TableHead className="text-center">Associações</TableHead>
                <TableHead className="text-center">Activas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : turnos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                    Sem turnos configurados
                  </TableCell>
                </TableRow>
              ) : (
                turnos.map((turno) => {
                  const isOpen = expanded.has(turno.id)
                  return (
                    <Fragment key={turno.id}>
                      <TableRow className={cn(isOpen && 'border-b-0 bg-muted/30')}>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => toggle(turno.id)}
                            title={isOpen ? 'Recolher' : 'Ver associações'}
                          >
                            {isOpen ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">{turno.sigla}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{turno.nome}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{turno.associacoes_count}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {turno.activas_count > 0 ? (
                            <Badge className="bg-emerald-600 hover:bg-emerald-600">
                              {turno.activas_count}
                            </Badge>
                          ) : (
                            <Badge variant="outline">0</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                      {isOpen && (
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={5} className="p-0">
                            <div className="p-4 border-t space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-semibold flex items-center gap-2">
                                  <Layers className="h-4 w-4 text-muted-foreground" />
                                  Cursos × Anos académicos no turno {turno.nome}
                                </h4>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setAddingFor(turno)}
                                >
                                  <Plus className="mr-2 h-4 w-4" />
                                  Adicionar associação
                                </Button>
                              </div>

                              {turno.associacoes.length === 0 ? (
                                <div className="rounded-md border bg-background py-8 text-center text-sm text-muted-foreground">
                                  Sem associações para este turno.
                                </div>
                              ) : (
                                <div className="rounded-md border bg-background">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Curso</TableHead>
                                        <TableHead className="w-32">Ano académico</TableHead>
                                        <TableHead className="w-48 text-center">Capacidade</TableHead>
                                        <TableHead className="w-28 text-center">Activo</TableHead>
                                        <TableHead className="w-16 text-right">Acções</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {turno.associacoes.map((a) => {
                                        const isToggling =
                                          toggleMutation.isPending &&
                                          toggleMutation.variables === a.id
                                        return (
                                          <TableRow key={a.id}>
                                            <TableCell>
                                              <div className="flex items-center gap-2">
                                                {a.curso?.sigla && (
                                                  <Badge
                                                    variant="outline"
                                                    className="font-mono text-xs"
                                                  >
                                                    {a.curso.sigla}
                                                  </Badge>
                                                )}
                                                <span>{a.curso?.nome ?? '—'}</span>
                                              </div>
                                            </TableCell>
                                            <TableCell className="font-mono">
                                              {a.ano_academico?.ano ?? '—'}
                                            </TableCell>
                                            <TableCell>
                                              <CapacidadeCell associacao={a} onSaved={invalidate} />
                                            </TableCell>
                                            <TableCell className="text-center">
                                              <Switch
                                                checked={a.activo}
                                                disabled={isToggling}
                                                onCheckedChange={() => toggleMutation.mutate(a.id)}
                                              />
                                            </TableCell>
                                            <TableCell className="text-right">
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-destructive hover:text-destructive"
                                                onClick={() => setConfirmDelete(a)}
                                              >
                                                <Trash2 className="h-3.5 w-3.5" />
                                              </Button>
                                            </TableCell>
                                          </TableRow>
                                        )
                                      })}
                                    </TableBody>
                                  </Table>
                                </div>
                              )}
                            </div>
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
      </Card>

      <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
        <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
        <p>
          Os turnos (Manhã, Tarde, Noite) são fixos do sistema e não podem ser criados, editados nem
          eliminados. Pode apenas gerir as combinações curso×ano académico associadas a cada turno.
        </p>
      </div>

      {addingFor && (
        <AdicionarAssociacaoDialog
          turno={addingFor}
          open={!!addingFor}
          onOpenChange={(open) => !open && setAddingFor(null)}
          onCreated={() => {
            invalidate()
            setAddingFor(null)
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          open={!!confirmDelete}
          onOpenChange={(open) => !open && setConfirmDelete(null)}
          title="Eliminar associação"
          description={`Remover ${confirmDelete.curso?.nome ?? 'curso'} × ${confirmDelete.ano_academico?.ano ?? '—'} do turno?`}
          confirmLabel="Eliminar"
          variant="destructive"
          isLoading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(confirmDelete.id)}
        />
      )}
    </div>
  )
}

function AdicionarAssociacaoDialog({
  turno,
  open,
  onOpenChange,
  onCreated,
}: {
  turno: TurnoComAssociacoes
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreated: () => void
}) {
  const [cursoId, setCursoId] = useState<number | null>(null)
  const [anoAcademicoId, setAnoAcademicoId] = useState<number | null>(null)
  const [activo, setActivo] = useState(true)
  const [capacidade, setCapacidade] = useState<string>('')

  const cursosQuery = useCursosLookup()
  const anosQuery = useAnosAcademicosLookup()

  // IDs já associados a este turno (filtramos os pares já existentes)
  const associadasParaTurno = new Set(
    turno.associacoes.map((a) => `${a.curso_id}-${a.ano_academico_id}`),
  )

  const mutation = useMutation({
    mutationFn: () => {
      const capNum = capacidade.trim() === '' ? null : Number(capacidade)
      return createAssociacao({
        curso_id: cursoId!,
        turno_id: turno.id,
        ano_academico_id: anoAcademicoId!,
        activo,
        capacidade_maxima: capNum !== null && Number.isFinite(capNum) && capNum > 0 ? capNum : null,
      })
    },
    onSuccess: () => {
      toast.success('Associação criada')
      onCreated()
    },
    onError: (e) => toast.error(extractErrorMessage(e, 'Não foi possível criar')),
  })

  const podeSubmeter =
    cursoId !== null &&
    anoAcademicoId !== null &&
    !associadasParaTurno.has(`${cursoId}-${anoAcademicoId}`)

  const conflito =
    cursoId !== null &&
    anoAcademicoId !== null &&
    associadasParaTurno.has(`${cursoId}-${anoAcademicoId}`)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar curso × ano académico ao turno {turno.nome}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Curso</label>
            <Select
              value={cursoId?.toString() ?? ''}
              onValueChange={(v) => setCursoId(v ? Number(v) : null)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Seleccionar curso..." />
              </SelectTrigger>
              <SelectContent>
                {cursosQuery.data?.map((c) => (
                  <SelectItem key={c.id} value={c.id.toString()}>
                    {c.sigla ? `${c.sigla} — ` : ''}
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Ano académico</label>
            <Select
              value={anoAcademicoId?.toString() ?? ''}
              onValueChange={(v) => setAnoAcademicoId(v ? Number(v) : null)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Seleccionar ano..." />
              </SelectTrigger>
              <SelectContent>
                {anosQuery.data?.map((a) => (
                  <SelectItem key={a.id} value={a.id.toString()}>
                    {a.ano} {a.activo ? '(activo)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={activo} onCheckedChange={setActivo} />
            <label className="text-sm">Activo</label>
          </div>

          {/* Capacidade no diálogo de criação */}
          <div>
            <label className="text-sm font-medium">Capacidade máxima</label>
            <Input
              type="number"
              min={1}
              value={capacidade}
              onChange={(e) => setCapacidade(e.target.value)}
              placeholder="Deixe vazio para sem limite"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Limita o número de matrículas neste curso × turno × ano. Vazio = sem limite.
            </p>
          </div>

          {conflito && (
            <p className="text-sm text-destructive">
              Esta combinação curso × ano académico já existe neste turno.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!podeSubmeter || mutation.isPending}
          >
            {mutation.isPending ? 'A criar...' : 'Adicionar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Célula inline de edição da capacidade. Mostra `matriculas/capacidade` ou
 * "Sem limite", botão lápis abre input; ao guardar faz PUT da capacidade.
 */
function CapacidadeCell({
  associacao,
  onSaved,
}: {
  associacao: Associacao
  onSaved: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [valor, setValor] = useState<string>(
    associacao.capacidade_maxima !== null ? String(associacao.capacidade_maxima) : '',
  )

  const mutation = useMutation({
    mutationFn: () => {
      const cap = valor.trim() === '' ? null : Number(valor)
      return updateCapacidade(
        associacao.id,
        cap !== null && Number.isFinite(cap) && cap >= 0 ? cap : null,
      )
    },
    onSuccess: () => {
      toast.success('Capacidade actualizada')
      setEditing(false)
      onSaved()
    },
    onError: (e) => toast.error(extractErrorMessage(e, 'Não foi possível actualizar capacidade')),
  })

  if (!editing) {
    const ocupacao = associacao.matriculas_count
    const cap = associacao.capacidade_maxima
    const cheio = cap !== null && ocupacao >= cap
    const quase = cap !== null && !cheio && ocupacao / cap >= 0.8
    return (
      <div className="flex items-center justify-center gap-2">
        {cap !== null ? (
          <Badge
            className={cn(
              cheio && 'bg-rose-600 hover:bg-rose-600',
              quase && 'bg-amber-600 hover:bg-amber-600',
              !cheio && !quase && 'bg-emerald-600 hover:bg-emerald-600',
            )}
          >
            {ocupacao} / {cap}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">
            {ocupacao > 0 ? `${ocupacao} matrículas` : 'Sem limite'}
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setEditing(true)}
          title="Editar capacidade"
        >
          <Pencil className="h-3 w-3" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center gap-1">
      <Input
        type="number"
        min={0}
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        placeholder="∞"
        className="h-7 w-20 text-center"
        autoFocus
      />
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-emerald-600 hover:text-emerald-600"
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        title="Guardar"
      >
        <Check className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-muted-foreground"
        onClick={() => {
          setValor(associacao.capacidade_maxima !== null ? String(associacao.capacidade_maxima) : '')
          setEditing(false)
        }}
        disabled={mutation.isPending}
        title="Cancelar"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
