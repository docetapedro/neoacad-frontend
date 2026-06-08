import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { CheckCircle2, ClipboardList, Info, Loader2, Search } from 'lucide-react'
import { toast } from 'sonner'
import { api, type ApiResponse, type Paginated } from '@/lib/api'
import { useTiposAvaliacoesLookup } from '@/lib/lookups'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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

type TurmaListItem = {
  id: number
  sigla: string | null
  nome: string | null
  curso?: { id: number; sigla: string | null; nome: string } | null
  disciplina?: { id: number; nome: string } | null
  turno?: { id: number; nome: string } | null
  ano_academico?: { ano: number } | null
}

type PautaEstudante = {
  inscricao_turma_id: number
  estudante_id: number | null
  num_processo: string | null
  nome: string | null
  avaliacao_id: number | null
  nota: number | string | null
  data_lancamento: string | null
  ja_lancada: boolean
}

type PautaPayload = {
  turma: TurmaListItem
  estudantes: PautaEstudante[]
}

async function fetchTurmas(searchTerm: string): Promise<TurmaListItem[]> {
  const { data } = await api.get<ApiResponse<Paginated<TurmaListItem>>>('/turmas', {
    params: { searchTerm, quantidade: 20 },
  })
  return data.dados?.items ?? []
}

async function fetchPauta(turmaId: number, tipoId: number): Promise<PautaPayload> {
  const { data } = await api.get<ApiResponse<PautaPayload>>(`/turmas/${turmaId}/pauta`, {
    params: { tipo_avaliacao_id: tipoId },
  })
  return data.dados as PautaPayload
}

async function gravarPauta(payload: {
  tipo_avaliacao_id: number
  data_lancamento?: string
  notas: Array<{ inscricao_turma_id: number; nota: number | null }>
}): Promise<{ criadas: number; actualizadas: number; ignoradas: number; erros: unknown[] }> {
  const { data } = await api.post<
    ApiResponse<{ criadas: number; actualizadas: number; ignoradas: number; erros: unknown[] }>
  >('/avaliacoes/lancamento-bloco', payload)
  return data.dados as { criadas: number; actualizadas: number; ignoradas: number; erros: unknown[] }
}

function parseNota(raw: number | string | null): string {
  if (raw === null || raw === undefined || raw === '') return ''
  const num = typeof raw === 'number' ? raw : Number(String(raw).replace(',', '.'))
  return Number.isFinite(num) ? num.toString() : ''
}

export function PautaDialog({
  open,
  onOpenChange,
  initialTurmaId,
  lockTurma = false,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initialTurmaId?: number
  /** Se true, esconde o seletor de turma (já entrou-se com uma turma específica). */
  lockTurma?: boolean
}) {
  const queryClient = useQueryClient()
  const [turmaSearch, setTurmaSearch] = useState('')
  const [turmaId, setTurmaId] = useState<number | null>(initialTurmaId ?? null)
  const [tipoId, setTipoId] = useState<number | null>(null)
  const [notas, setNotas] = useState<Record<number, string>>({})

  const turmasQuery = useQuery({
    queryKey: ['turmas-lookup', turmaSearch],
    queryFn: () => fetchTurmas(turmaSearch),
    enabled: open && !lockTurma,
    staleTime: 30 * 1000,
  })

  const tiposQuery = useTiposAvaliacoesLookup(undefined, open)

  const pautaQuery = useQuery({
    queryKey: ['pauta', turmaId, tipoId],
    queryFn: () => fetchPauta(turmaId!, tipoId!),
    enabled: open && !!turmaId && !!tipoId,
  })

  // Pré-popular as notas quando a pauta carrega
  useEffect(() => {
    if (pautaQuery.data) {
      const initial: Record<number, string> = {}
      for (const e of pautaQuery.data.estudantes) {
        initial[e.inscricao_turma_id] = parseNota(e.nota)
      }
      setNotas(initial)
    }
  }, [pautaQuery.data])

  // Reset quando o dialog abre/fecha. Mantém o turmaId quando vem fixo de fora.
  useEffect(() => {
    if (!open) {
      setTurmaId(initialTurmaId ?? null)
      setTipoId(null)
      setNotas({})
      setTurmaSearch('')
    } else if (lockTurma && initialTurmaId) {
      setTurmaId(initialTurmaId)
    }
  }, [open, initialTurmaId, lockTurma])

  const mutation = useMutation({
    mutationFn: () =>
      gravarPauta({
        tipo_avaliacao_id: tipoId!,
        notas: Object.entries(notas).map(([id, nota]) => ({
          inscricao_turma_id: Number(id),
          nota: nota === '' ? null : Number(String(nota).replace(',', '.')),
        })),
      }),
    onSuccess: (resumo) => {
      const msg = `Pauta gravada: ${resumo.criadas} nova(s), ${resumo.actualizadas} actualizada(s), ${resumo.ignoradas} ignorada(s).`
      toast.success(msg)
      queryClient.invalidateQueries({ queryKey: ['avaliacoes'] })
      queryClient.invalidateQueries({ queryKey: ['pauta', turmaId, tipoId] })
      if (resumo.erros && resumo.erros.length > 0) {
        toast.error(`${resumo.erros.length} linha(s) com erro — ver detalhes na consola`)
        console.warn('Pauta — erros:', resumo.erros)
      }
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
      toast.error(typeof data?.message === 'string' ? data.message : 'Erro ao gravar pauta')
    },
  })

  // Contadores informativos
  const preenchidas = useMemo(
    () => Object.values(notas).filter((n) => n !== '').length,
    [notas],
  )
  const totalEstudantes = pautaQuery.data?.estudantes.length ?? 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Lançamento em bloco — Pauta digital
          </DialogTitle>
          <DialogDescription>
            Escolha a turma e o tipo de avaliação. As notas existentes são pré-preenchidas;
            ao gravar, são criadas as novas e actualizadas as existentes.
          </DialogDescription>
        </DialogHeader>

        <div className={lockTurma ? '' : 'grid grid-cols-1 md:grid-cols-2 gap-3'}>
          {!lockTurma && (
            <div>
              <Label className="text-sm">Turma</Label>
              <div className="relative mt-1 mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={turmaSearch}
                  onChange={(e) => setTurmaSearch(e.target.value)}
                  placeholder="Filtrar turmas..."
                  className="pl-9"
                />
              </div>
              <Select
                value={turmaId?.toString() ?? ''}
                onValueChange={(v) => setTurmaId(v ? Number(v) : null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar turma..." />
                </SelectTrigger>
                <SelectContent>
                  {turmasQuery.data?.map((t) => (
                    <SelectItem key={t.id} value={t.id.toString()}>
                      {t.sigla ? `[${t.sigla}] ` : ''}
                      {t.nome ?? `Turma #${t.id}`}
                      {t.curso?.sigla && ` — ${t.curso.sigla}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label className="text-sm">Tipo de avaliação</Label>
            <Select
              value={tipoId?.toString() ?? ''}
              onValueChange={(v) => setTipoId(v ? Number(v) : null)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Seleccionar tipo..." />
              </SelectTrigger>
              <SelectContent>
                {(tiposQuery.data ?? [])
                  .filter((t) => (t.natureza ?? 'LAN').toUpperCase() === 'LAN')
                  .map((t) => (
                    <SelectItem key={t.id} value={t.id.toString()}>
                      {t.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
              <Info className="h-3 w-3 mt-0.5 shrink-0" />
              Apenas tipos <strong>lançados</strong> aparecem. Os <strong>calculados</strong> são gerados automaticamente a partir da fórmula após gravar.
            </p>
          </div>
        </div>

        {!turmaId || !tipoId ? (
          <div className="rounded-md border bg-muted/30 py-10 text-center text-sm text-muted-foreground">
            Escolha turma e tipo de avaliação para começar.
          </div>
        ) : pautaQuery.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : pautaQuery.data && pautaQuery.data.estudantes.length === 0 ? (
          <div className="rounded-md border bg-muted/30 py-10 text-center text-sm text-muted-foreground">
            Esta turma não tem estudantes inscritos.
          </div>
        ) : pautaQuery.data ? (
          <>
            <div className="flex items-center justify-between text-sm">
              <p className="text-muted-foreground">
                Turma: <span className="font-medium text-foreground">{pautaQuery.data.turma.nome}</span>
                {pautaQuery.data.turma.disciplina && (
                  <>
                    {' '}— Disciplina:{' '}
                    <span className="font-medium text-foreground">
                      {pautaQuery.data.turma.disciplina.nome}
                    </span>
                  </>
                )}
              </p>
              <Badge variant="outline">
                {preenchidas} / {totalEstudantes} preenchidas
              </Badge>
            </div>

            <div className="rounded-md border max-h-[50vh] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-32">Nº Processo</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead className="w-32">Nota (0–20)</TableHead>
                    <TableHead className="w-36">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pautaQuery.data.estudantes.map((e) => {
                    const valor = notas[e.inscricao_turma_id] ?? ''
                    const numeric = valor === '' ? null : Number(String(valor).replace(',', '.'))
                    const invalido =
                      numeric !== null &&
                      (Number.isNaN(numeric) || numeric < 0 || numeric > 20)
                    return (
                      <TableRow key={e.inscricao_turma_id}>
                        <TableCell className="font-mono text-xs">
                          {e.num_processo ?? '—'}
                        </TableCell>
                        <TableCell className="font-medium">{e.nome ?? '—'}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min={0}
                            max={20}
                            value={valor}
                            placeholder="—"
                            onChange={(ev) =>
                              setNotas((prev) => ({
                                ...prev,
                                [e.inscricao_turma_id]: ev.target.value,
                              }))
                            }
                            className={
                              invalido ? 'border-destructive focus-visible:ring-destructive' : ''
                            }
                          />
                        </TableCell>
                        <TableCell>
                          {e.ja_lancada ? (
                            <Badge variant="outline" className="gap-1">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              Já lançada
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              Por avaliar
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        ) : null}

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
            disabled={
              !turmaId ||
              !tipoId ||
              preenchidas === 0 ||
              mutation.isPending ||
              !pautaQuery.data
            }
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Gravar {preenchidas} nota{preenchidas === 1 ? '' : 's'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
