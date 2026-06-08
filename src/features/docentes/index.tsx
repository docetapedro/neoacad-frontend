import { Badge } from '@/components/ui/badge'
import {
  SimpleCrudPage,
  type ColumnDef,
} from '@/components/shared/SimpleCrudPage'
import { api, type ApiResponse, type Paginated } from '@/lib/api'
import { toast } from 'sonner'

type Docente = {
  id: number
  name: string
  username: string
  email: string
  docente: boolean
  activo: boolean
  suspended_at: string | null
}

async function listDocentes(params: Record<string, unknown>): Promise<Paginated<Docente>> {
  const { data } = await api.get<ApiResponse<Paginated<Docente>>>('/users', {
    params: { ...params, docente: 1 },
  })
  return data.dados as Paginated<Docente>
}

const columns: ColumnDef<Docente>[] = [
  { header: 'Nome', cell: (r) => <span className="font-medium">{r.name}</span> },
  { header: 'Username', cell: (r) => <span className="text-muted-foreground">{r.username}</span> },
  { header: 'Email', cell: (r) => <span className="text-muted-foreground">{r.email}</span> },
  {
    header: 'Estado',
    cell: (r) =>
      !r.activo ? (
        <Badge variant="destructive">Inactivo</Badge>
      ) : r.suspended_at ? (
        <Badge variant="destructive">Suspenso</Badge>
      ) : (
        <Badge className="bg-emerald-600 hover:bg-emerald-600">Activo</Badge>
      ),
  },
]

export function DocentesPage() {
  return (
    <SimpleCrudPage<Docente>
      title="Docentes"
      description="Lista de utilizadores com perfil de docente"
      queryKey="docentes"
      searchKey="name"
      searchPlaceholder="Pesquisar docente..."
      listFn={listDocentes}
      getRowId={(r) => r.id}
      getDeleteLabel={(r) => r.name}
      columns={columns}
      newLabel="Novo docente"
      onNew={() =>
        toast.info('Criar docente via Utilizadores marcando o campo "docente".')
      }
      onEdit={() =>
        toast.info('A edição de docentes faz-se no módulo de Utilizadores.')
      }
    />
  )
}
