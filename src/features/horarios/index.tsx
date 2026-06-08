import { useState } from 'react'
import { Printer } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import {
  SimpleCrudPage,
  type ColumnDef,
} from '@/components/shared/SimpleCrudPage'
import { api } from '@/lib/api'
import { createCrudClient } from '@/lib/crud'
import { HorarioFormDialog } from './HorarioFormDialog'

type HorarioDetalhe = {
  id: number
  dia_semana: string
  hora_inicio: string
  hora_fim: string
  turma_id?: number | null
  turma?: { id: number; sigla: string | null; nome: string | null } | null
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
            <Badge
              key={d.id}
              variant="outline"
              className="font-mono text-[10px]"
              title={d.turma?.nome ?? undefined}
            >
              {d.turma?.sigla ? `${d.turma.sigla} · ` : ''}
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

async function imprimirHorario(id: number, label: string): Promise<void> {
  const response = await api.get(`/horario/${id}/print`, { responseType: 'blob' })
  const blob = new Blob([response.data as BlobPart], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  // Abre em nova aba para visualização imediata + opção de download/print
  const win = window.open(url, '_blank')
  if (!win) {
    // Popup bloqueado — força download
    const a = document.createElement('a')
    a.href = url
    a.download = `horario-${label || id}.pdf`
    a.click()
  }
  // Libertar URL após algum tempo (o browser ainda precisa dele para abrir)
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export function HorariosPage() {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Horario | null>(null)

  const handlePrint = async (r: Horario) => {
    try {
      const label = `${r.curso_turno_ano_academico?.curso ?? r.id}`.replace(/\s+/g, '_')
      await imprimirHorario(r.id, label)
    } catch {
      toast.error('Não foi possível gerar o PDF do horário')
    }
  }

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
        extraActions={(row) => (
          <DropdownMenuItem onClick={() => handlePrint(row)}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir PDF
          </DropdownMenuItem>
        )}
      />

      <HorarioFormDialog open={open} onOpenChange={setOpen} horario={editing} />
    </>
  )
}
