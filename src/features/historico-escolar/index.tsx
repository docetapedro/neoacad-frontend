import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { GraduationCap, History, Search, User } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PageHeader } from '@/components/shared/PageHeader'
import { api, type ApiResponse } from '@/lib/api'
import { useEstudantesLookup } from '@/lib/lookups'

type HistoricoMatricula = {
  id: number
  estado: string | null
  data_matricula: string | null
  curso: string | null
  turno: string | null
  ano_academico: number | null
  classe: string | null
  classe_tipo: string | null
  grelha_curricular: string | null
}

type Historico = {
  estudante: {
    id: number
    num_processo: string
    nome: string | null
    email: string | null
    genero: string | null
    estado_civil: string | null
    data_nascimento: string | null
    num_bi: string | null
    nif: string | null
  }
  matriculas: HistoricoMatricula[]
  total_matriculas: number
}

async function fetchHistorico(estudanteId: number): Promise<Historico> {
  const { data } = await api.get<ApiResponse<Historico>>(
    `/historico-escolar/estudante/${estudanteId}`,
  )
  return data.dados as Historico
}

const ESTADO_COLOR: Record<string, string> = {
  ACT: 'bg-emerald-600 hover:bg-emerald-600',
  ANU: 'bg-red-600 hover:bg-red-600',
  TRA: 'bg-amber-600 hover:bg-amber-600',
}

export function HistoricoEscolarPage() {
  const [search, setSearch] = useState('')
  const [estudanteId, setEstudanteId] = useState<number | null>(null)

  const lookupQuery = useEstudantesLookup(search || undefined, search.length >= 2)
  const historicoQuery = useQuery({
    queryKey: ['historico', estudanteId],
    queryFn: () => fetchHistorico(estudanteId!),
    enabled: !!estudanteId,
  })

  return (
    <div>
      <PageHeader
        title="Histórico Escolar"
        description="Consultar o histórico de matrículas e situação académica de um estudante"
      />

      <Card className="mb-4">
        <CardContent className="pt-6 space-y-3">
          <label className="text-sm font-medium">Selecionar estudante</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por nº processo, BI ou nome..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select
              value={estudanteId ? String(estudanteId) : ''}
              onValueChange={(v) => setEstudanteId(Number(v))}
              disabled={!lookupQuery.data || lookupQuery.data.length === 0}
            >
              <SelectTrigger className="sm:w-96">
                <SelectValue
                  placeholder={
                    !search
                      ? 'Pesquise primeiro para listar estudantes'
                      : lookupQuery.isLoading
                      ? 'A pesquisar...'
                      : !lookupQuery.data?.length
                      ? 'Sem resultados'
                      : 'Escolher estudante'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {lookupQuery.data?.map((e) => (
                  <SelectItem key={e.id} value={String(e.id)}>
                    {e.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {!estudanteId ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <History className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>Selecione um estudante para ver o histórico.</p>
          </CardContent>
        </Card>
      ) : historicoQuery.isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : historicoQuery.data ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4" />
                {historicoQuery.data.estudante.nome ?? '—'}
              </CardTitle>
              <CardDescription className="font-mono">
                Nº processo: {historicoQuery.data.estudante.num_processo}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 text-sm">
                <Field label="BI" value={historicoQuery.data.estudante.num_bi} mono />
                <Field label="NIF" value={historicoQuery.data.estudante.nif} mono />
                <Field
                  label="Género"
                  value={
                    historicoQuery.data.estudante.genero === 'M'
                      ? 'Masculino'
                      : historicoQuery.data.estudante.genero === 'F'
                      ? 'Feminino'
                      : null
                  }
                />
                <Field label="Estado civil" value={historicoQuery.data.estudante.estado_civil} />
                <Field label="Data de nascimento" value={historicoQuery.data.estudante.data_nascimento} />
                <Field label="Email" value={historicoQuery.data.estudante.email} colSpan={3} />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <GraduationCap className="h-4 w-4" />
                Matrículas
                <Badge variant="outline" className="ml-2">
                  {historicoQuery.data.total_matriculas}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {historicoQuery.data.matriculas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem matrículas registadas.</p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Curso</TableHead>
                        <TableHead>Turno</TableHead>
                        <TableHead>Ano</TableHead>
                        <TableHead>Classe</TableHead>
                        <TableHead>Grelha</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historicoQuery.data.matriculas.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell>{m.data_matricula ?? '—'}</TableCell>
                          <TableCell className="font-medium">{m.curso ?? '—'}</TableCell>
                          <TableCell>{m.turno ?? '—'}</TableCell>
                          <TableCell className="font-mono">{m.ano_academico ?? '—'}</TableCell>
                          <TableCell>
                            {m.classe ?? '—'}
                            {m.classe_tipo === 'A'
                              ? 'º Ano'
                              : m.classe_tipo === 'S'
                              ? 'º Semestre'
                              : ''}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {m.grelha_curricular ?? '—'}
                          </TableCell>
                          <TableCell>
                            {m.estado ? (
                              <Badge className={ESTADO_COLOR[m.estado] ?? ''}>{m.estado}</Badge>
                            ) : (
                              <Badge variant="outline">—</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}

function Field({
  label,
  value,
  mono,
  colSpan = 1,
}: {
  label: string
  value: string | number | null | undefined
  mono?: boolean
  colSpan?: 1 | 2 | 3
}) {
  return (
    <div className={colSpan === 3 ? 'sm:col-span-3' : colSpan === 2 ? 'sm:col-span-2' : ''}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`mt-0.5 ${mono ? 'font-mono' : ''}`}>
        {value !== null && value !== undefined && value !== '' ? value : '—'}
      </dd>
    </div>
  )
}
