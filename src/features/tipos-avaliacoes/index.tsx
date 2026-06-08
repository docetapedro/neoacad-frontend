import { useState } from 'react'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { useAnosAcademicosLookup, usePeriodosLectivosLookup } from '@/lib/lookups'
import { TipoAvaliacaoFormDialog } from './TipoAvaliacaoFormDialog'

type TipoAvaliacao = {
  id: number
  natureza: string | null
  descricao: string | null
  ordem: number | null
  peso: number | string | null
  expressao: string | null
  activo: boolean
  codigo_avaliacao_id: number | null
  ano_academico_periodo_lectivo_id: number | null
  codigo_avaliacao?: { id: number; codigo: string | null; descricao: string | null } | null
  ano_academico_periodo_lectivo?: {
    ano_academico?: { ano: number }
    periodo_lectivo?: { numero: number }
  } | null
}

const client = createCrudClient<TipoAvaliacao>('tipos-avaliacoes')

const columns: ColumnDef<TipoAvaliacao>[] = [
  { header: 'Ordem', cell: (r) => <span className="font-mono">{r.ordem ?? '—'}</span> },
  { header: 'Descrição', cell: (r) => <span className="font-medium">{r.descricao ?? '—'}</span> },
  {
    header: 'Natureza',
    cell: (r) => (
      <Badge variant="outline">
        {r.natureza === 'LAN' ? 'Lançada' : r.natureza === 'CAL' ? 'Calculada' : r.natureza ?? '—'}
      </Badge>
    ),
  },
  {
    header: 'Ano académico',
    cell: (r) => (
      <span className="font-mono">{r.ano_academico_periodo_lectivo?.ano_academico?.ano ?? '—'}</span>
    ),
  },
  {
    header: 'Período',
    cell: (r) =>
      r.ano_academico_periodo_lectivo?.periodo_lectivo?.numero
        ? `${r.ano_academico_periodo_lectivo.periodo_lectivo.numero}º`
        : '—',
  },
  { header: 'Peso', cell: (r) => (r.peso ? `${r.peso}` : '—') },
  {
    header: 'Estado',
    cell: (r) =>
      r.activo ? (
        <Badge className="bg-emerald-600 hover:bg-emerald-600">Activo</Badge>
      ) : (
        <Badge variant="outline">Inactivo</Badge>
      ),
  },
]

export function TiposAvaliacoesPage() {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<TipoAvaliacao | null>(null)

  const [anoId, setAnoId] = useState<string>('')
  const [aaplId, setAaplId] = useState<string>('')

  const anosQuery = useAnosAcademicosLookup()
  const periodosQuery = usePeriodosLectivosLookup(anoId ? Number(anoId) : null, !!anoId)

  const extraFilters: Record<string, unknown> = {
    ano_academico: anoId || undefined,
    ano_academico_periodo_lectivo_id: aaplId || undefined,
  }

  const hasFilters = !!(anoId || aaplId)

  return (
    <>
      <SimpleCrudPage<TipoAvaliacao>
        title="Tipos de Avaliações"
        description="Naturezas e tipologias de avaliações por período lectivo"
        queryKey="tipos-avaliacoes"
        searchKey="searchTerm"
        searchPlaceholder="Pesquisar..."
        listFn={(params) => client.list(params)}
        deleteFn={client.remove}
        getRowId={(r) => r.id}
        getDeleteLabel={(r) => r.descricao ?? `#${r.id}`}
        columns={columns}
        newLabel="Novo tipo"
        onNew={() => {
          setEditing(null)
          setOpen(true)
        }}
        onEdit={(r) => {
          setEditing(r)
          setOpen(true)
        }}
        extraFilters={extraFilters}
        filterBar={
          <>
            <Select
              value={anoId}
              onValueChange={(v) => {
                setAnoId(v)
                setAaplId('') // limpa período ao trocar ano
              }}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Ano académico" />
              </SelectTrigger>
              <SelectContent>
                {anosQuery.data?.map((a) => (
                  <SelectItem key={a.id} value={a.id.toString()}>
                    {a.ano}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={aaplId}
              onValueChange={setAaplId}
              disabled={!anoId || (periodosQuery.data?.length ?? 0) === 0}
            >
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue
                  placeholder={!anoId ? 'Escolha um ano…' : 'Período lectivo'}
                />
              </SelectTrigger>
              <SelectContent>
                {periodosQuery.data?.map((p) => (
                  <SelectItem key={p.id} value={p.id.toString()}>
                    {p.numero ? `${p.numero}º período` : p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setAnoId('')
                  setAaplId('')
                }}
              >
                <X className="mr-1 h-3.5 w-3.5" />
                Limpar
              </Button>
            )}
          </>
        }
      />

      <TipoAvaliacaoFormDialog open={open} onOpenChange={setOpen} tipo={editing} />
    </>
  )
}
