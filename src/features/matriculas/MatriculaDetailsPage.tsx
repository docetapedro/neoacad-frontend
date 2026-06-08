import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  GraduationCap,
  Lock,
  Mail,
  MapPin,
  Phone,
  Trash2,
  User as UserIcon,
  Users,
  XCircle,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { PageHeader } from '@/components/shared/PageHeader'
import { api, type ApiResponse } from '@/lib/api'
import { useState } from 'react'

type MatriculaDetail = {
  id: number
  estado: string | null
  data_matricula: string | null
  created_at: string
  updated_at: string
  estudante?: {
    id: number
    num_processo: string
    nome: string | null
    email: string | null
    username: string | null
    num_bi: string | null
    nif: string | null
    genero: 'M' | 'F' | null
    estado_civil: string | null
    data_nascimento: string | null
    contactos: string | null
    telefone_responsavel: string | null
    email_faturacao: string | null
    telefone_faturacao: string | null
    nome_pai: string | null
    nome_mae: string | null
    endereco: string | null
    observacao: string | null
    militar: boolean
    pais?: { id: number; nome: string | null } | null
  } | null
  curso_turno_ano_academico?: {
    id: number
    curso?: { id: number; nome: string; sigla: string } | null
    turno?: { id: number; nome: string } | null
    ano_academico?: { id: number; ano: number } | null
  } | null
  classe?: { id: number; designacao: string; tipo: string | null; ordem: number | null } | null
  grelha_curricular?: { id: number; nome: string } | null
}

// Códigos têm que corresponder ao MatriculaEnum do backend (2 chars).
const ESTADO_INFO: Record<string, { label: string; color: string }> = {
  AC: { label: 'Activa', color: 'bg-emerald-600 hover:bg-emerald-600' },
  AN: { label: 'Anulada', color: 'bg-red-600 hover:bg-red-600' },
  TR: { label: 'Trancada', color: 'bg-amber-600 hover:bg-amber-600' },
}

async function fetchMatricula(id: number): Promise<MatriculaDetail> {
  const { data } = await api.get<ApiResponse<MatriculaDetail>>(`/matriculas/${id}`)
  return data.dados as MatriculaDetail
}

async function deleteMatricula(id: number): Promise<void> {
  await api.delete(`/matriculas/${id}`)
}

async function updateEstado(id: number, estado: string): Promise<void> {
  await api.put(`/matriculas/${id}`, { estado })
}

export function MatriculaDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmEstado, setConfirmEstado] = useState<{ estado: string; label: string } | null>(null)

  const matriculaId = Number(id)
  const query = useQuery({
    queryKey: ['matricula', matriculaId],
    queryFn: () => fetchMatricula(matriculaId),
    enabled: !!matriculaId,
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteMatricula(matriculaId),
    onSuccess: () => {
      toast.success('Matrícula eliminada')
      queryClient.invalidateQueries({ queryKey: ['matriculas'] })
      navigate('/matriculas')
    },
    onError: () => toast.error('Não foi possível eliminar a matrícula'),
  })

  const estadoMutation = useMutation({
    mutationFn: (estado: string) => updateEstado(matriculaId, estado),
    onSuccess: (_d, estado) => {
      toast.success(`Matrícula marcada como ${ESTADO_INFO[estado]?.label ?? estado}.`)
      queryClient.invalidateQueries({ queryKey: ['matricula', matriculaId] })
      queryClient.invalidateQueries({ queryKey: ['matriculas'] })
      setConfirmEstado(null)
    },
    onError: () => {
      toast.error('Não foi possível alterar o estado da matrícula')
      setConfirmEstado(null)
    },
  })

  if (query.isLoading) return <MatriculaDetailsSkeleton />
  if (query.error || !query.data) {
    return (
      <div>
        <Button variant="ghost" onClick={() => navigate('/matriculas')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Matrícula não encontrada
          </CardContent>
        </Card>
      </div>
    )
  }

  const m = query.data
  const estudante = m.estudante
  const ctaa = m.curso_turno_ano_academico
  const initials = (estudante?.nome ?? '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  const estadoInfo = m.estado ? ESTADO_INFO[m.estado] : null

  return (
    <div>
      <Button variant="ghost" onClick={() => navigate('/matriculas')} className="mb-2 -ml-2">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar à listagem
      </Button>

      <PageHeader
        title={`Matrícula #${m.id}`}
        description={`Registada em ${m.data_matricula ?? '—'}`}
        actions={
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={estadoMutation.isPending}>
                  Alterar estado
                  <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Estado actual: {ESTADO_INFO[m.estado ?? '']?.label ?? '—'}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {m.estado !== 'AC' && (
                  <DropdownMenuItem onClick={() => setConfirmEstado({ estado: 'AC', label: 'Activa' })}>
                    <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600" />
                    Activar / Reactivar
                  </DropdownMenuItem>
                )}
                {m.estado !== 'TR' && (
                  <DropdownMenuItem onClick={() => setConfirmEstado({ estado: 'TR', label: 'Trancada' })}>
                    <Lock className="mr-2 h-4 w-4 text-amber-600" />
                    Trancar
                  </DropdownMenuItem>
                )}
                {m.estado !== 'AN' && (
                  <DropdownMenuItem
                    onClick={() => setConfirmEstado({ estado: 'AN', label: 'Anulada' })}
                    className="text-destructive focus:text-destructive"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Anular
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="destructive"
              onClick={() => setConfirmDelete(true)}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Coluna esquerda — Identificação do estudante */}
        <Card className="lg:col-span-1">
          <CardHeader className="text-center">
            <Avatar className="h-20 w-20 mx-auto mb-2">
              <AvatarFallback className="text-xl">{initials}</AvatarFallback>
            </Avatar>
            <CardTitle className="text-lg">{estudante?.nome ?? '—'}</CardTitle>
            <CardDescription className="font-mono">
              Nº processo: {estudante?.num_processo ?? '—'}
            </CardDescription>
            <div className="flex items-center justify-center gap-2 pt-2">
              {estadoInfo ? (
                <Badge className={estadoInfo.color}>{estadoInfo.label}</Badge>
              ) : (
                <Badge variant="outline">Sem estado</Badge>
              )}
              {estudante?.militar && <Badge variant="secondary">Militar</Badge>}
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <InfoRow icon={Mail} label="Email" value={estudante?.email} />
            <InfoRow icon={Phone} label="Telefone" value={estudante?.contactos} />
            <InfoRow icon={Phone} label="Tel. responsável" value={estudante?.telefone_responsavel} />
            <InfoRow icon={UserIcon} label="Username" value={estudante?.username} mono />
            <Separator />
            <InfoRow
              icon={UserIcon}
              label="Género"
              value={
                estudante?.genero === 'M'
                  ? 'Masculino'
                  : estudante?.genero === 'F'
                  ? 'Feminino'
                  : null
              }
            />
            <InfoRow icon={UserIcon} label="Estado civil" value={estudante?.estado_civil} />
            <InfoRow icon={Calendar} label="Nascimento" value={estudante?.data_nascimento} />
            <InfoRow icon={MapPin} label="País" value={estudante?.pais?.nome} />
          </CardContent>
        </Card>

        {/* Coluna direita — Dados da matrícula */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Dados académicos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <Field label="Curso" value={ctaa?.curso?.nome} mono={false} />
                <Field
                  label="Sigla do curso"
                  value={ctaa?.curso?.sigla}
                  mono
                />
                <Field label="Turno" value={ctaa?.turno?.nome} />
                <Field label="Ano académico" value={ctaa?.ano_academico?.ano} mono />
                <Field
                  label="Classe"
                  value={
                    m.classe
                      ? `${m.classe.designacao}${m.classe.tipo === 'A' ? 'º Ano' : m.classe.tipo === 'S' ? 'º Semestre' : ''}`
                      : null
                  }
                />
                <Field label="Grelha curricular" value={m.grelha_curricular?.nome} />
                <Field
                  label="Data de matrícula"
                  value={m.data_matricula}
                  icon={Calendar}
                />
                <Field
                  label="Estado"
                  value={estadoInfo?.label}
                  icon={undefined}
                />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Identificação fiscal e familiar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <Field label="Nº BI" value={estudante?.num_bi} mono />
                <Field label="NIF" value={estudante?.nif} mono />
                <Field label="Email faturação" value={estudante?.email_faturacao} />
                <Field label="Telefone faturação" value={estudante?.telefone_faturacao} />
                <Field label="Nome do pai" value={estudante?.nome_pai} />
                <Field label="Nome da mãe" value={estudante?.nome_mae} />
                <Field
                  label="Endereço"
                  value={estudante?.endereco}
                  span={2}
                />
              </dl>
            </CardContent>
          </Card>

          {estudante?.observacao && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {estudante.observacao}
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Pagamento / propinas
              </CardTitle>
              <CardDescription>
                Histórico financeiro associado à matrícula
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Módulo financeiro será integrado numa fase seguinte.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Eliminar matrícula"
        description={`Tem a certeza que pretende eliminar a matrícula de ${
          estudante?.nome ?? '#' + m.id
        }? Esta acção não pode ser revertida.`}
        confirmLabel="Eliminar"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
      />

      <ConfirmDialog
        open={!!confirmEstado}
        onOpenChange={(o) => !o && setConfirmEstado(null)}
        title={`Marcar matrícula como ${confirmEstado?.label}`}
        description={
          confirmEstado
            ? `Confirma alterar o estado da matrícula de ${estudante?.nome ?? '#' + m.id} para "${confirmEstado.label}"?`
            : ''
        }
        confirmLabel={`Marcar como ${confirmEstado?.label}`}
        variant={confirmEstado?.estado === 'AN' ? 'destructive' : 'default'}
        isLoading={estadoMutation.isPending}
        onConfirm={() => confirmEstado && estadoMutation.mutate(confirmEstado.estado)}
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

function MatriculaDetailsSkeleton() {
  return (
    <div>
      <Skeleton className="h-9 w-32 mb-4" />
      <Skeleton className="h-10 w-72 mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="h-96" />
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-48" />
        </div>
      </div>
    </div>
  )
}
