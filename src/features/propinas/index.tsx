import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import {
  AlertCircle,
  Banknote,
  CalendarClock,
  CheckCircle2,
  Coins,
  CreditCard,
  FileText,
  Loader2,
  Printer,
  Smartphone,
  Wallet,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { DatePicker } from '@/components/shared/DatePicker'
import { useAnosAcademicosLookup, useEstudantesLookup, useInscricoesPorEstudanteLookup } from '@/lib/lookups'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
  SimpleCrudPage,
  type ColumnDef,
} from '@/components/shared/SimpleCrudPage'
import { api, type ApiResponse } from '@/lib/api'
import { createCrudClient } from '@/lib/crud'
import { cn } from '@/lib/utils'

// Métodos de pagamento — códigos backend + label PT
const METODOS = [
  { value: 'NUM', label: 'Numerário', icon: Banknote },
  { value: 'TRA', label: 'Transferência bancária', icon: Wallet },
  { value: 'CAR', label: 'Cartão', icon: CreditCard },
  { value: 'MCX', label: 'Multicaixa Express', icon: Smartphone },
  { value: 'OUT', label: 'Outro', icon: Coins },
] as const

const METODO_LABEL: Record<string, string> = Object.fromEntries(
  METODOS.map((m) => [m.value, m.label]),
)

type Propina = {
  id: number
  metodo: string | null
  inscricao_id: number | null
  num_doc: string | null
  total_merc: number | string | null
  total_iva: number | string | null
  total_desconto: number | string | null
  total_liquido: number | string | null
  referencia: string | null
  estudante?: { id: number; num_processo: string | null; nome: string | null } | null
  curso?: { id: number; sigla: string | null; nome: string } | null
  ano_academico?: { id: number; ano: number } | null
  linhas?: Array<{ id: number; descricao: string | null; valor: number | string | null }>
}

const MESES = [
  '',
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const client = createCrudClient<Propina>('propinas')

const columns: ColumnDef<Propina>[] = [
  {
    header: 'Documento',
    cell: (r) => <span className="font-mono">{r.num_doc ?? `#${r.id}`}</span>,
  },
  {
    header: 'Estudante',
    cell: (r) =>
      r.estudante ? (
        <div>
          <div className="font-medium text-sm">{r.estudante.nome ?? '—'}</div>
          <div className="font-mono text-xs text-muted-foreground">
            {r.estudante.num_processo ?? '—'}
          </div>
        </div>
      ) : (
        '—'
      ),
  },
  {
    header: 'Curso',
    cell: (r) =>
      r.curso ? (
        <div className="flex items-center gap-2">
          {r.curso.sigla && (
            <Badge variant="outline" className="font-mono text-xs">
              {r.curso.sigla}
            </Badge>
          )}
          <span className="text-sm">{r.curso.nome}</span>
        </div>
      ) : (
        '—'
      ),
  },
  {
    header: 'Ano',
    cell: (r) => <span className="font-mono">{r.ano_academico?.ano ?? '—'}</span>,
  },
  {
    header: 'Método',
    cell: (r) =>
      r.metodo ? (
        <Badge variant="outline">{METODO_LABEL[r.metodo] ?? r.metodo}</Badge>
      ) : (
        '—'
      ),
  },
  {
    header: 'Total',
    cell: (r) => <span className="font-mono font-medium">{r.total_liquido ?? '—'}</span>,
  },
  {
    header: 'Linhas',
    cell: (r) => <Badge variant="secondary">{r.linhas?.length ?? 0}</Badge>,
  },
]

async function abrirPdf(url: string, fallbackMsg = 'Não foi possível gerar o PDF') {
  try {
    const response = await api.get(url, { responseType: 'blob' })
    const blob = new Blob([response.data], { type: 'application/pdf' })
    const objectUrl = URL.createObjectURL(blob)
    window.open(objectUrl, '_blank')
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
  } catch (e) {
    const msg =
      e && typeof e === 'object' && 'response' in e
        ? // @ts-expect-error — payload variável
          (e as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined
    toast.error(typeof msg === 'string' ? msg : fallbackMsg)
  }
}

export function PropinasPage() {
  const [open, setOpen] = useState(false)
  const [metodo, setMetodo] = useState<string>('')
  const [anoId, setAnoId] = useState<string>('')
  const [dataInicio, setDataInicio] = useState<string>('')
  const [dataFim, setDataFim] = useState<string>('')

  const anosQuery = useAnosAcademicosLookup()

  const extraFilters: Record<string, unknown> = {
    metodo: metodo || undefined,
    ano_academico: anoId || undefined,
    data_inicio: dataInicio || undefined,
    data_fim: dataFim || undefined,
  }

  const hasFilters = !!(metodo || anoId || dataInicio || dataFim)

  return (
    <>
      <SimpleCrudPage<Propina>
        title="Propinas"
        description="Pagamentos de propinas registados"
        queryKey="propinas"
        searchKey="searchTerm"
        searchPlaceholder="Pesquisar nº doc, estudante, referência..."
        listFn={(params) => client.list(params)}
        deleteFn={client.remove}
        getRowId={(r) => r.id}
        getDeleteLabel={(r) => r.num_doc ?? `Propina #${r.id}`}
        columns={columns}
        newLabel="Registar propina"
        onNew={() => setOpen(true)}
        onEdit={() => toast.info('Edição de propinas existentes ainda não implementada.')}
        extraActions={(row) => (
          <>
            <DropdownMenuItem onClick={() => abrirPdf(`/propina/${row.id}/printrecibo`, 'Não foi possível gerar o recibo')}>
              <Printer className="mr-2 h-4 w-4" />
              Imprimir recibo
            </DropdownMenuItem>
            {row.linhas && row.linhas.length > 0 && (
              <DropdownMenuItem
                onClick={() => abrirPdf(`/propina/${row.linhas![0].id}/printcomprovativo`, 'Não foi possível gerar o comprovativo')}
              >
                <FileText className="mr-2 h-4 w-4" />
                Imprimir comprovativo
              </DropdownMenuItem>
            )}
          </>
        )}
        extraFilters={extraFilters}
        filterBar={
          <>
            <Select value={metodo} onValueChange={setMetodo}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Método" />
              </SelectTrigger>
              <SelectContent>
                {METODOS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={anoId} onValueChange={setAnoId}>
              <SelectTrigger className="w-full sm:w-28">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                {anosQuery.data?.map((a) => (
                  <SelectItem key={a.id} value={a.id.toString()}>
                    {a.ano}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <DatePicker
              value={dataInicio}
              onChange={setDataInicio}
              className="w-full sm:w-44"
              placeholder="Data início"
            />
            <DatePicker
              value={dataFim}
              onChange={setDataFim}
              className="w-full sm:w-44"
              placeholder="Data fim"
            />

            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setMetodo('')
                  setAnoId('')
                  setDataInicio('')
                  setDataFim('')
                }}
              >
                <X className="mr-1 h-3.5 w-3.5" />
                Limpar
              </Button>
            )}
          </>
        }
      />

      <PropinaFormDialog open={open} onOpenChange={setOpen} />
    </>
  )
}

// ---------------------------------------------------------------------------
// Form simplificado: o utilizador só escolhe o valor; backend distribui meses.
// ---------------------------------------------------------------------------

type MesPendente = {
  id: number
  ano: number
  mes: number
  mes_nome: string | null
  por_pagar: string
  valor_pago: string
  em_falta: string
  data_limite: string | null
}

type InfoInscricao = {
  inscricao_id: number
  valor_mensal: string
  valor_mensal_raw: number
  tem_configuracao: boolean
  total_em_divida: string
  total_em_divida_raw: number
  meses_pendentes_count: number
  proximo_mes: MesPendente | null
  meses_pendentes: MesPendente[]
}

async function fetchInfoInscricao(inscricaoId: number): Promise<InfoInscricao> {
  const { data } = await api.get<ApiResponse<InfoInscricao>>(
    `/propinas/info-inscricao/${inscricaoId}`,
  )
  return data.dados as InfoInscricao
}

function PropinaFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [estudanteSearch, setEstudanteSearch] = useState('')
  const [estudanteId, setEstudanteId] = useState<number | null>(null)
  const [inscricaoId, setInscricaoId] = useState<number | null>(null)
  const [referencia, setReferencia] = useState('')
  const [metodoPag, setMetodoPag] = useState<string>('NUM')
  const [meses, setMeses] = useState<number>(1)
  const [valorPersonalizado, setValorPersonalizado] = useState<string>('')
  const [modoPersonalizado, setModoPersonalizado] = useState(false)

  const estudantesQuery = useEstudantesLookup(
    estudanteSearch || undefined,
    estudanteSearch.length >= 2,
  )
  const inscricoesQuery = useInscricoesPorEstudanteLookup(estudanteId, !!estudanteId)
  const infoQuery = useQuery({
    queryKey: ['propinas-info', inscricaoId],
    queryFn: () => fetchInfoInscricao(inscricaoId!),
    enabled: !!inscricaoId,
  })

  const info = infoQuery.data
  const valorMensal = info?.valor_mensal_raw ?? 0
  const totalDivida = info?.total_em_divida_raw ?? 0

  const valorAPagar = useMemo(() => {
    if (modoPersonalizado) {
      const n = Number(String(valorPersonalizado).replace(',', '.'))
      return Number.isFinite(n) && n > 0 ? n : 0
    }
    return meses * valorMensal
  }, [meses, valorMensal, modoPersonalizado, valorPersonalizado])

  const valorExcedeDivida = totalDivida > 0 && valorAPagar > totalDivida + 0.01
  const restoMultiplo = valorMensal > 0 ? Math.abs(valorAPagar % valorMensal) : 0
  const naoMultiplo =
    valorMensal > 0 &&
    valorAPagar > 0 &&
    restoMultiplo > 0.01 &&
    Math.abs(restoMultiplo - valorMensal) > 0.01

  const mesesCobertos = valorMensal > 0 ? Math.floor(valorAPagar / valorMensal) : 0
  const mesesAfectados = info?.meses_pendentes.slice(0, mesesCobertos) ?? []

  useEffect(() => {
    if (!open) {
      setEstudanteSearch('')
      setEstudanteId(null)
      setInscricaoId(null)
      setReferencia('')
      setMetodoPag('NUM')
      setMeses(1)
      setValorPersonalizado('')
      setModoPersonalizado(false)
    }
  }, [open])

  const mutation = useMutation({
    mutationFn: async () => {
      await api.post('/propinas', {
        inscricao: inscricaoId,
        referencia: referencia || undefined,
        metodo: metodoPag,
        valor: valorAPagar,
        total_iva: 0,
        total_desconto: 0,
        total_liquido: valorAPagar,
        liquidado: true,
      })
    },
    onSuccess: () => {
      toast.success('Propina registada — distribuída pelos meses pendentes.')
      queryClient.invalidateQueries({ queryKey: ['propinas'] })
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
      toast.error(typeof data?.message === 'string' ? data.message : 'Erro ao registar propina')
    },
  })

  const podeSubmeter =
    !!inscricaoId &&
    valorAPagar > 0 &&
    !valorExcedeDivida &&
    !naoMultiplo &&
    !!info?.tem_configuracao

  const opcoesRapidas = useMemo(() => {
    if (!info) return [] as number[]
    const candidatos = [1, 2, 3, 6, 12, info.meses_pendentes_count]
    return Array.from(new Set(candidatos))
      .filter((m) => m > 0 && m <= info.meses_pendentes_count)
      .sort((a, b) => a - b)
  }, [info])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registar pagamento de propina</DialogTitle>
          <DialogDescription>
            O valor é distribuído automaticamente pelos meses pendentes por ordem cronológica.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-sm">Estudante</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
              <Input
                placeholder="Nome ou nº processo (mín. 2 chars)..."
                value={estudanteSearch}
                onChange={(e) => setEstudanteSearch(e.target.value)}
              />
              <Select
                value={estudanteId ? String(estudanteId) : ''}
                onValueChange={(v) => {
                  setEstudanteId(Number(v))
                  setInscricaoId(null)
                }}
                disabled={!estudantesQuery.data || estudantesQuery.data.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !estudanteSearch
                        ? 'Pesquise para listar'
                        : estudantesQuery.isLoading
                        ? 'A pesquisar...'
                        : !estudantesQuery.data?.length
                        ? 'Sem resultados'
                        : 'Escolher estudante'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {estudantesQuery.data?.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-sm">Inscrição</Label>
            <Select
              value={inscricaoId ? String(inscricaoId) : ''}
              onValueChange={(v) => setInscricaoId(Number(v))}
              disabled={!estudanteId}
            >
              <SelectTrigger className="mt-1">
                <SelectValue
                  placeholder={
                    !estudanteId
                      ? 'Escolha primeiro o estudante'
                      : inscricoesQuery.isLoading
                      ? 'A carregar...'
                      : 'Selecionar inscrição'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {inscricoesQuery.data?.map((i) => (
                  <SelectItem key={i.id} value={String(i.id)}>
                    {i.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {inscricaoId && (
            <>
              {infoQuery.isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : info && !info.tem_configuracao ? (
                <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-destructive">Sem configuração de propina</p>
                    <p className="text-muted-foreground mt-0.5">
                      Não existe configuração de propina activa para o curso/turno/ano académico desta inscrição. Configure em <strong>/config-propinas</strong> antes de registar pagamentos.
                    </p>
                  </div>
                </div>
              ) : info ? (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Wallet className="h-4 w-4" />
                      Situação financeira
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Coins className="h-3 w-3" />
                        Valor mensal
                      </p>
                      <p className="font-mono font-semibold tabular-nums">{info.valor_mensal}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total em dívida</p>
                      <p className="font-mono font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                        {info.total_em_divida}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <CalendarClock className="h-3 w-3" />
                        Meses pendentes
                      </p>
                      <p className="font-semibold">{info.meses_pendentes_count}</p>
                    </div>
                    {info.proximo_mes && (
                      <div className="col-span-2 sm:col-span-3 border-t pt-2 mt-1">
                        <p className="text-xs text-muted-foreground">Próximo mês a liquidar</p>
                        <p className="text-sm font-medium">
                          {info.proximo_mes.mes_nome} {info.proximo_mes.ano} —{' '}
                          <span className="font-mono">{info.proximo_mes.em_falta} AKZ</span>
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : null}

              {info?.tem_configuracao && info.meses_pendentes_count > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Valor a pagar</Label>
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:underline"
                      onClick={() => setModoPersonalizado(!modoPersonalizado)}
                    >
                      {modoPersonalizado ? '↶ Voltar a múltiplos' : 'Valor personalizado…'}
                    </button>
                  </div>

                  {!modoPersonalizado ? (
                    <>
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                        {opcoesRapidas.map((m) => (
                          <Button
                            key={m}
                            type="button"
                            size="sm"
                            variant={meses === m ? 'default' : 'outline'}
                            onClick={() => setMeses(m)}
                            className="text-xs"
                          >
                            {m === info.meses_pendentes_count && info.meses_pendentes_count > 1
                              ? `Todos (${m})`
                              : `${m} ${m === 1 ? 'mês' : 'meses'}`}
                          </Button>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {meses} × {info.valor_mensal} ={' '}
                        <span className="font-mono font-semibold text-foreground">
                          {valorAPagar.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AKZ
                        </span>
                      </p>
                    </>
                  ) : (
                    <div>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        value={valorPersonalizado}
                        onChange={(e) => setValorPersonalizado(e.target.value)}
                        placeholder={`Múltiplo de ${valorMensal}`}
                        className={cn(
                          (naoMultiplo || valorExcedeDivida) &&
                            'border-destructive focus-visible:ring-destructive',
                        )}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Deve ser múltiplo de {info.valor_mensal} AKZ.
                      </p>
                    </div>
                  )}

                  {naoMultiplo && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      O valor não é múltiplo do valor mensal ({info.valor_mensal} AKZ).
                    </p>
                  )}
                  {valorExcedeDivida && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      O valor excede a dívida total ({info.total_em_divida} AKZ).
                    </p>
                  )}

                  {mesesAfectados.length > 0 && !naoMultiplo && !valorExcedeDivida && (
                    <div className="rounded-md border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        Este pagamento liquida <strong>{mesesAfectados.length}</strong>{' '}
                        {mesesAfectados.length === 1 ? 'mês' : 'meses'}:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {mesesAfectados.map((m) => (
                          <Badge key={m.id} variant="outline" className="text-xs font-mono">
                            {MESES[m.mes]} {m.ano}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {info?.tem_configuracao && info.meses_pendentes_count === 0 && (
                <div className="rounded-md border border-emerald-300/60 bg-emerald-50 dark:bg-emerald-950/20 p-3 text-sm">
                  <CheckCircle2 className="h-4 w-4 inline mr-2 text-emerald-600" />
                  Esta inscrição não tem propinas pendentes.
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Método de pagamento</Label>
                  <Select value={metodoPag} onValueChange={setMetodoPag}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {METODOS.map((m) => {
                        const Icon = m.icon
                        return (
                          <SelectItem key={m.value} value={m.value}>
                            <span className="flex items-center gap-2">
                              <Icon className="h-3.5 w-3.5" />
                              {m.label}
                            </span>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">Referência (opcional)</Label>
                  <Input
                    value={referencia}
                    onChange={(e) => setReferencia(e.target.value)}
                    placeholder={metodoPag === 'TRA' ? 'Nº transferência' : metodoPag === 'CAR' || metodoPag === 'MCX' ? 'TPV-12345' : 'Opcional'}
                    className="mt-1"
                  />
                </div>
              </div>
            </>
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
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Registar{' '}
            {valorAPagar > 0
              ? `${valorAPagar.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} AKZ`
              : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
