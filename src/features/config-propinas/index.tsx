import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  SimpleCrudPage,
  type ColumnDef,
} from '@/components/shared/SimpleCrudPage'
import { createCrudClient } from '@/lib/crud'
import { ConfigPropinaFormDialog } from './ConfigPropinaFormDialog'

type ConfigPropina = {
  id: number
  ctaa_id: number
  valor: number | string | null
  activo: boolean
  curso_turno_ano_academico?: {
    id: number
    curso: string | null
    turno: string | null
    ano_academico: number | null
  } | null
}

const client = createCrudClient<ConfigPropina>('config-propinas')

const columns: ColumnDef<ConfigPropina>[] = [
  {
    header: 'Curso',
    cell: (r) => (
      <span className="font-medium">{r.curso_turno_ano_academico?.curso ?? '—'}</span>
    ),
  },
  {
    header: 'Turno',
    cell: (r) => r.curso_turno_ano_academico?.turno ?? '—',
  },
  {
    header: 'Ano',
    cell: (r) => (
      <span className="font-mono">{r.curso_turno_ano_academico?.ano_academico ?? '—'}</span>
    ),
  },
  { header: 'Valor', cell: (r) => r.valor ?? '—' },
  {
    header: 'Estado',
    cell: (r) =>
      r.activo ? (
        <Badge className="bg-emerald-600 hover:bg-emerald-600">Activa</Badge>
      ) : (
        <Badge variant="outline">Inactiva</Badge>
      ),
  },
]

export function ConfigPropinasPage() {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ConfigPropina | null>(null)

  return (
    <>
      <SimpleCrudPage<ConfigPropina>
        title="Configuração de Propinas"
        description="Valores de propinas por curso, turno e ano académico"
        queryKey="config-propinas"
        listFn={(params) => client.list(params)}
        deleteFn={client.remove}
        getRowId={(r) => r.id}
        getDeleteLabel={(r) => `Propina ${r.curso_turno_ano_academico?.curso ?? '#' + r.id}`}
        columns={columns}
        newLabel="Nova configuração"
        onNew={() => {
          setEditing(null)
          setOpen(true)
        }}
        onEdit={(r) => {
          setEditing(r)
          setOpen(true)
        }}
      />

      <ConfigPropinaFormDialog open={open} onOpenChange={setOpen} config={editing} />
    </>
  )
}
