import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import {
  useAnosAcademicosLookup,
  useCursosLookup,
  useDisciplinasLookup,
  useTurnosLookup,
} from '@/lib/lookups'
import { TurmaFormDialog } from './TurmaFormDialog'

type Turma = {
  id: number
  sigla: string | null
  nome: string | null
  descricao: string | null
  formula_media_final: string | null
  disciplina_grelha_id: number | null
  ano_academico_id: number | null
  turno_id: number | null
  inscricoes_count?: number
  turno?: { id: number; sigla: string | null; nome: string } | null
  ano_academico?: { id: number; ano: number } | null
  curso?: { id: number; sigla: string | null; nome: string } | null
  disciplina?: { id: number; sigla: string | null; nome: string } | null
}

const client = createCrudClient<Turma>('turmas')

export function TurmasPage() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Turma | null>(null)

  const [curso, setCurso] = useState<string>('')
  const [turno, setTurno] = useState<string>('')
  const [ano, setAno] = useState<string>('')
  const [disciplina, setDisciplina] = useState<string>('')

  const cursosQuery = useCursosLookup()
  const turnosQuery = useTurnosLookup()
  const anosQuery = useAnosAcademicosLookup()
  const disciplinasQuery = useDisciplinasLookup()

  const extraFilters: Record<string, unknown> = {
    curso: curso || undefined,
    turno: turno || undefined,
    ano_academico: ano || undefined,
    disciplina: disciplina || undefined,
  }

  const hasFilters = !!(curso || turno || ano || disciplina)

  const columns: ColumnDef<Turma>[] = [
    {
      header: 'Sigla',
      cell: (r) => (
        <button
          onClick={() => navigate(`/turmas/${r.id}`)}
          className="font-mono text-left hover:underline"
        >
          <Badge variant="outline" className="font-mono">
            {r.sigla ?? '—'}
          </Badge>
        </button>
      ),
    },
    {
      header: 'Nome',
      cell: (r) => (
        <button
          onClick={() => navigate(`/turmas/${r.id}`)}
          className="font-medium text-left hover:underline"
        >
          {r.nome ?? '—'}
        </button>
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
    { header: 'Disciplina', cell: (r) => r.disciplina?.nome ?? '—' },
    { header: 'Turno', cell: (r) => r.turno?.nome ?? '—' },
    {
      header: 'Ano',
      cell: (r) => <span className="font-mono">{r.ano_academico?.ano ?? '—'}</span>,
    },
    {
      header: 'Inscritos',
      cell: (r) => (
        <Badge variant="secondary" className="font-mono">
          {r.inscricoes_count ?? 0}
        </Badge>
      ),
    },
  ]

  return (
    <>
      <SimpleCrudPage<Turma>
        title="Turmas"
        description="Turmas criadas para cada disciplina/ano académico"
        queryKey="turmas"
        searchKey="searchTerm"
        searchPlaceholder="Pesquisar turma..."
        listFn={(params) => client.list(params)}
        deleteFn={client.remove}
        getRowId={(r) => r.id}
        getDeleteLabel={(r) => r.nome ?? `Turma #${r.id}`}
        columns={columns}
        newLabel="Nova turma"
        onNew={() => {
          setEditing(null)
          setOpen(true)
        }}
        onEdit={(r) => {
          setEditing(r)
          setOpen(true)
        }}
        extraActions={(row) => (
          <DropdownMenuItem onClick={() => navigate(`/turmas/${row.id}`)}>
            <Eye className="mr-2 h-4 w-4" />
            Ver detalhes
          </DropdownMenuItem>
        )}
        extraFilters={extraFilters}
        filterBar={
          <>
            <Select value={curso} onValueChange={setCurso}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Curso" />
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

            <Select value={turno} onValueChange={setTurno}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Turno" />
              </SelectTrigger>
              <SelectContent>
                {turnosQuery.data?.map((t) => (
                  <SelectItem key={t.id} value={t.id.toString()}>
                    {t.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={ano} onValueChange={setAno}>
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

            <Select value={disciplina} onValueChange={setDisciplina}>
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder="Disciplina" />
              </SelectTrigger>
              <SelectContent>
                {disciplinasQuery.data?.map((d) => (
                  <SelectItem key={d.id} value={d.id.toString()}>
                    {d.sigla ? `${d.sigla} — ` : ''}
                    {d.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCurso('')
                  setTurno('')
                  setAno('')
                  setDisciplina('')
                }}
              >
                <X className="mr-1 h-3.5 w-3.5" />
                Limpar
              </Button>
            )}
          </>
        }
      />

      <TurmaFormDialog open={open} onOpenChange={setOpen} turma={editing} />
    </>
  )
}

export { TurmaDetailsPage } from './TurmaDetailsPage'
