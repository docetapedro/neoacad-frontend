import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  SimpleCrudPage,
  type ColumnDef,
} from '@/components/shared/SimpleCrudPage'
import { createCrudClient } from '@/lib/crud'
import { HorarioFormDialog } from './HorarioFormDialog'

type HorarioDetalhe = {
  id: number
  dia_semana: string
  hora_inicio: string
  hora_fim: string
}

type Horario = {
  id: number
  curso_turno_ano_academico_id: number
  curso_turno_ano_academico?: {
    id: number
    curso: string | null
    turno: string | null
    ano_academico: number | null
  } | null
  detalhes?: HorarioDetalhe[]
}

const client = createCrudClient<Horario>('horarios')

const DIAS_LABEL: Record<string, string> = {
  '2': 'Seg',
  '3': 'Ter',
  '4': 'Qua',
  '5': 'Qui',
  '6': 'Sex',
  '7': 'Sáb',
}

const columns: ColumnDef<Horario>[] = [
  {
    header: 'Curso',
    cell: (r) => <span className="font-medium">{r.curso_turno_ano_academico?.curso ?? '—'}</span>,
  },
  { header: 'Turno', cell: (r) => r.curso_turno_ano_academico?.turno ?? '—' },
  {
    header: 'Ano',
    cell: (r) => <span className="font-mono">{r.curso_turno_ano_academico?.ano_academico ?? '—'}</span>,
  },
  {
    header: 'Sessões',
    cell: (r) => (
      <div className="flex flex-wrap gap-1">
        {r.detalhes && r.detalhes.length > 0 ? (
          r.detalhes.slice(0, 4).map((d) => (
            <Badge key={d.id} variant="outline" className="font-mono text-[10px]">
              {DIAS_LABEL[d.dia_semana] ?? d.dia_semana} {d.hora_inicio.slice(0, 5)}-{d.hora_fim.slice(0, 5)}
            </Badge>
          ))
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
        {r.detalhes && r.detalhes.length > 4 && (
          <Badge variant="secondary">+{r.detalhes.length - 4}</Badge>
        )}
      </div>
    ),
  },
]

export function HorariosPage() {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Horario | null>(null)

  return (
    <>
      <SimpleCrudPage<Horario>
        title="Horários"
        description="Horários por curso/turno/ano académico"
        queryKey="horarios"
        listFn={(params) => client.list(params)}
        deleteFn={client.remove}
        getRowId={(r) => r.id}
        getDeleteLabel={(r) => `Horário ${r.curso_turno_ano_academico?.curso ?? '#' + r.id}`}
        columns={columns}
        newLabel="Novo horário"
        onNew={() => {
          setEditing(null)
          setOpen(true)
        }}
        onEdit={(r) => {
          setEditing(r)
          setOpen(true)
        }}
      />

      <HorarioFormDialog open={open} onOpenChange={setOpen} horario={editing} />
    </>
  )
}
