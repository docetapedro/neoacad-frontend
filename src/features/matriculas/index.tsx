import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  SimpleCrudPage,
  type ColumnDef,
} from '@/components/shared/SimpleCrudPage'
import { createCrudClient } from '@/lib/crud'
import { MatriculaFormDialog } from './MatriculaFormDialog'

type Matricula = {
  id: number
  estado: string | null
  data_matricula: string | null
  curso_turno_ano_academico_id?: number | null
  classe_id?: number | null
  estudante?: { id: number; num_processo: string; nome: string | null; email: string | null } | null
  curso_turno_ano_academico?: {
    id?: number
    curso: { id: number; nome: string; sigla: string } | null
    turno: { id: number; nome: string } | null
    ano_academico: { id: number; ano: number } | null
  } | null
  classe?: { designacao: string } | null
}

const client = createCrudClient<Matricula>('matriculas')

const TODOS = '__all__'

// Códigos têm que corresponder ao MatriculaEnum do backend (2 chars).
const ESTADO_OPTIONS = [
  { value: 'AC', label: 'Activa' },
  { value: 'AN', label: 'Anulada' },
  { value: 'TR', label: 'Trancada' },
]

const ESTADO_LABEL: Record<string, string> = Object.fromEntries(
  ESTADO_OPTIONS.map((o) => [o.value, o.label]),
)

const ESTADO_CIVIL_OPTIONS = [
  { value: 'Solteiro', label: 'Solteiro(a)' },
  { value: 'Casado', label: 'Casado(a)' },
  { value: 'Divorciado', label: 'Divorciado(a)' },
  { value: 'Viuvo', label: 'Viúvo(a)' },
  { value: 'Uniao de Facto', label: 'União de Facto' },
]

const ESTADO_COLOR: Record<string, string> = {
  AC: 'bg-emerald-600 hover:bg-emerald-600',
  AN: 'bg-red-600 hover:bg-red-600',
  TR: 'bg-amber-600 hover:bg-amber-600',
}

const columns: ColumnDef<Matricula>[] = [
  {
    header: 'Nº processo',
    cell: (r) => <span className="font-mono">{r.estudante?.num_processo ?? '—'}</span>,
  },
  {
    header: 'Estudante',
    cell: (r) => <span className="font-medium">{r.estudante?.nome ?? '—'}</span>,
  },
  {
    header: 'Curso',
    cell: (r) => r.curso_turno_ano_academico?.curso?.nome ?? '—',
  },
  {
    header: 'Turno',
    cell: (r) => r.curso_turno_ano_academico?.turno?.nome ?? '—',
  },
  {
    header: 'Ano',
    cell: (r) => (
      <span className="font-mono">
        {r.curso_turno_ano_academico?.ano_academico?.ano ?? '—'}
      </span>
    ),
  },
  {
    header: 'Estado',
    cell: (r) =>
      r.estado ? (
        <Badge className={ESTADO_COLOR[r.estado] ?? ''}>
          {ESTADO_LABEL[r.estado] ?? r.estado}
        </Badge>
      ) : (
        <Badge variant="outline">—</Badge>
      ),
  },
  { header: 'Data', cell: (r) => r.data_matricula ?? '—' },
]

export function MatriculasPage() {
  const navigate = useNavigate()
  const [estado, setEstado] = useState<string>(TODOS)
  const [genero, setGenero] = useState<string>(TODOS)
  const [estadoCivil, setEstadoCivil] = useState<string>(TODOS)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Matricula | null>(null)

  const filterBar = (
    <>
      <Select value={estado} onValueChange={(v) => setEstado(v)}>
        <SelectTrigger className="sm:w-40">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TODOS}>Todos os estados</SelectItem>
          {ESTADO_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={genero} onValueChange={(v) => setGenero(v)}>
        <SelectTrigger className="sm:w-44">
          <SelectValue placeholder="Género" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TODOS}>Todos os géneros</SelectItem>
          <SelectItem value="M">Masculino</SelectItem>
          <SelectItem value="F">Feminino</SelectItem>
        </SelectContent>
      </Select>

      <Select value={estadoCivil} onValueChange={(v) => setEstadoCivil(v)}>
        <SelectTrigger className="sm:w-56">
          <SelectValue placeholder="Estado civil" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TODOS}>Todos os estados civis</SelectItem>
          {ESTADO_CIVIL_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  )

  return (
    <>
      <SimpleCrudPage<Matricula>
        title="Matrículas"
        description="Matrículas de estudantes nos cursos"
        queryKey="matriculas"
        searchKey="searchTerm"
        searchPlaceholder="Pesquisar por estudante..."
        listFn={(params) => client.list(params)}
        deleteFn={client.remove}
        getRowId={(r) => r.id}
        getDeleteLabel={(r) => r.estudante?.nome ?? `Matrícula #${r.id}`}
        columns={columns}
        newLabel="Nova matrícula"
        onNew={() => {
          setEditing(null)
          setFormOpen(true)
        }}
        onEdit={(row) => {
          setEditing(row)
          setFormOpen(true)
        }}
        filterBar={filterBar}
        extraFilters={{
          estado: estado === TODOS ? undefined : estado,
          genero: genero === TODOS ? undefined : genero,
          estado_civil: estadoCivil === TODOS ? undefined : estadoCivil,
        }}
        extraActions={(row) => (
          <DropdownMenuItem onClick={() => navigate(`/matriculas/${row.id}`)}>
            <Eye className="mr-2 h-4 w-4" />
            Ver detalhes
          </DropdownMenuItem>
        )}
      />

      <MatriculaFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        matricula={
          editing
            ? {
                id: editing.id,
                estudante: editing.estudante ? { id: editing.estudante.id } : null,
                curso_turno_ano_academico_id: editing.curso_turno_ano_academico_id,
                classe_id: editing.classe_id,
              }
            : null
        }
      />
    </>
  )
}
