import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  GraduationCap,
  History,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Trash2,
  User as UserIcon,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
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
import { deleteEstudante, getEstudante } from './api'
import { EstudanteFormDialog } from './EstudanteFormDialog'

type HistoricoMatricula = {
  id: number
  estado: string | null
  data_matricula: string | null
  curso: string | null
  turno: string | null
  ano_academico: number | null
  classe: string | null
  classe_tipo: string | null
}

const ESTADO_COLOR: Record<string, string> = {
  ACT: 'bg-emerald-600 hover:bg-emerald-600',
  ANU: 'bg-red-600 hover:bg-red-600',
  TRA: 'bg-amber-600 hover:bg-amber-600',
}

async function fetchHistoricoMatriculas(estudanteId: number): Promise<HistoricoMatricula[]> {
  const { data } = await api.get<
    ApiResponse<{ matriculas: HistoricoMatricula[] }>
  >(`/historico-escolar/estudante/${estudanteId}`)
  return (data.dados?.matriculas ?? []) as HistoricoMatricula[]
}

export function EstudanteDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const estudanteId = Number(id)
  const estudanteQuery = useQuery({
    queryKey: ['estudante', estudanteId],
    queryFn: () => getEstudante(estudanteId),
    enabled: !!estudanteId,
  })

  const matriculasQuery = useQuery({
    queryKey: ['estudante', estudanteId, 'historico'],
    queryFn: () => fetchHistoricoMatriculas(estudanteId),
    enabled: !!estudanteId,
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteEstudante(estudanteId),
    onSuccess: () => {
      toast.success('Estudante eliminado')
      queryClient.invalidateQueries({ queryKey: ['estudantes'] })
      navigate('/estudantes')
    },
    onError: () => toast.error('Não foi possível eliminar o estudante'),
  })

  if (estudanteQuery.isLoading) return <DetailsSkeleton />
  if (!estudanteQuery.data) {
    return (
      <div>
        <Button variant="ghost" onClick={() => navigate('/estudantes')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Estudante não encontrado
          </CardContent>
        </Card>
      </div>
    )
  }

  const e = estudanteQuery.data
  const initials = (e.user?.name ?? '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  const matriculas = matriculasQuery.data ?? []

  return (
    <div>
      <Button
        variant="ghost"
        onClick={() => navigate('/estudantes')}
        className="mb-2 -ml-2"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar à listagem
      </Button>

      <PageHeader
        title={e.user?.name ?? `Estudante #${e.id}`}
        description={`Nº processo: ${e.num_processo}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setFormOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Button>
            <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Coluna esquerda — identificação */}
        <Card className="lg:col-span-1">
          <CardHeader className="text-center">
            <Avatar className="h-20 w-20 mx-auto mb-2">
              <AvatarFallback className="text-xl">{initials}</AvatarFallback>
            </Avatar>
            <CardTitle className="text-lg">{e.user?.name ?? '—'}</CardTitle>
            <CardDescription className="font-mono">{e.num_processo}</CardDescription>
            <div className="flex justify-center pt-2">
              {e.militar && <Badge variant="secondary">Militar</Badge>}
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <InfoRow icon={Mail} label="Email" value={e.user?.email} />
            <InfoRow icon={UserIcon} label="Username" value={e.user?.username} mono />
            <Separator />
            <InfoRow
              icon={UserIcon}
              label="Género"
              value={
                e.genero === 'M' ? 'Masculino' : e.genero === 'F' ? 'Feminino' : null
              }
            />
            <InfoRow icon={UserIcon} label="Estado civil" value={e.estado_civil} />
            <InfoRow icon={Calendar} label="Nascimento" value={e.data_nascimento} />
            <InfoRow icon={MapPin} label="País" value={e.pais?.nome} />
          </CardContent>
        </Card>

        {/* Coluna direita */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <UserIcon className="h-4 w-4" />
                Documentos e contactos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <Field label="Nº BI" value={e.num_bi} mono />
                <Field label="NIF" value={e.nif} mono />
                <Field label="Telefone" value={e.contactos} icon={Phone} />
                <Field
                  label="Telefone responsável"
                  value={e.telefone_responsavel}
                  icon={Phone}
                />
                <Field label="Email faturação" value={e.email_faturacao} />
                <Field label="Telefone faturação" value={e.telefone_faturacao} />
                <Field label="Endereço" value={e.endereco} span={2} />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Agregado familiar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <Field label="Nome do pai" value={e.nome_pai} />
                <Field label="Nome da mãe" value={e.nome_mae} />
              </dl>
            </CardContent>
          </Card>

          {e.observacao && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {e.observacao}
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    Matrículas
                    <Badge variant="outline" className="ml-1">
                      {matriculas.length}
                    </Badge>
                  </CardTitle>
                  <CardDescription>Histórico académico</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/historico-escolar')}
                >
                  <History className="mr-2 h-4 w-4" />
                  Ver histórico completo
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {matriculasQuery.isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : matriculas.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Sem matrículas registadas.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Curso</TableHead>
                      <TableHead>Turno</TableHead>
                      <TableHead>Ano</TableHead>
                      <TableHead>Classe</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matriculas.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>{m.data_matricula ?? '—'}</TableCell>
                        <TableCell className="font-medium">{m.curso ?? '—'}</TableCell>
                        <TableCell>{m.turno ?? '—'}</TableCell>
                        <TableCell className="font-mono">
                          {m.ano_academico ?? '—'}
                        </TableCell>
                        <TableCell>
                          {m.classe ?? '—'}
                          {m.classe_tipo === 'A'
                            ? 'º Ano'
                            : m.classe_tipo === 'S'
                            ? 'º Semestre'
                            : ''}
                        </TableCell>
                        <TableCell>
                          {m.estado ? (
                            <Badge className={ESTADO_COLOR[m.estado] ?? ''}>
                              {m.estado}
                            </Badge>
                          ) : (
                            <Badge variant="outline">—</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => navigate(`/matriculas/${m.id}`)}
                            title="Abrir matrícula"
                          >
                            <ArrowLeft className="h-4 w-4 rotate-180" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Situação financeira
              </CardTitle>
              <CardDescription>Dívida total registada</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold font-mono">
                {e.total_divida ?? '0,00'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Para consultar pagamentos individuais aceda ao módulo Propinas.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <EstudanteFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        estudante={e}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Eliminar estudante"
        description={`Tem a certeza que pretende eliminar ${
          e.user?.name ?? e.num_processo
        }? Esta acção não pode ser revertida.`}
        confirmLabel="Eliminar"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: React.ElementType
  label: string
  value: string | number | null | undefined
  mono?: boolean
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`truncate ${mono ? 'font-mono' : ''}`}>
          {value !== null && value !== undefined && value !== '' ? value : '—'}
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  span = 1,
  mono,
  icon: Icon,
}: {
  label: string
  value: string | number | null | undefined
  span?: 1 | 2
  mono?: boolean
  icon?: React.ElementType
}) {
  return (
    <div className={span === 2 ? 'sm:col-span-2' : ''}>
      <dt className="text-xs text-muted-foreground flex items-center gap-1">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </dt>
      <dd className={`mt-0.5 ${mono ? 'font-mono' : ''}`}>
        {value !== null && value !== undefined && value !== '' ? value : '—'}
      </dd>
    </div>
  )
}

function DetailsSkeleton() {
  return (
    <div>
      <Skeleton className="h-9 w-32 mb-4" />
      <Skeleton className="h-10 w-72 mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="h-96" />
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
        </div>
      </div>
    </div>
  )
}
