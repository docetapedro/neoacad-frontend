import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Badge } from '@/components/ui/badge'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
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
import { SimpleFormDialog } from '@/components/shared/SimpleFormDialog'
import { DatePicker } from '@/components/shared/DatePicker'
import { createCrudClient } from '@/lib/crud'

type Assiduidade = {
  id: number
  inscricao_turma_id: number
  horario_id: number
  data_aula: string | null
  estado: 'P' | 'F' | 'A' | 'J' | string | null
  estado_label: string | null
  observacao: string | null
}

const client = createCrudClient<Assiduidade>('assiduidades')

const schema = z.object({
  inscricao_turma_id: z.number().int().positive('Inscrição-turma é obrigatória'),
  horario_id: z.number().int().positive('Horário é obrigatório'),
  data_aula: z.string().min(1, 'Data é obrigatória'),
  estado: z.enum(['P', 'F', 'A', 'J']),
  observacao: z.string().optional().nullable(),
})
type FormValues = z.infer<typeof schema>

const COLOR: Record<string, string> = {
  P: 'bg-emerald-600 hover:bg-emerald-600',
  F: 'bg-red-600 hover:bg-red-600',
  A: 'bg-amber-600 hover:bg-amber-600',
  J: 'bg-blue-600 hover:bg-blue-600',
}

const columns: ColumnDef<Assiduidade>[] = [
  { header: 'Data', cell: (r) => r.data_aula ?? '—' },
  {
    header: 'Inscrição-turma',
    cell: (r) => <span className="font-mono">#{r.inscricao_turma_id}</span>,
  },
  {
    header: 'Horário',
    cell: (r) => <span className="font-mono">#{r.horario_id}</span>,
  },
  {
    header: 'Estado',
    cell: (r) =>
      r.estado ? (
        <Badge className={COLOR[r.estado] ?? ''}>{r.estado_label ?? r.estado}</Badge>
      ) : (
        <Badge variant="outline">—</Badge>
      ),
  },
  {
    header: 'Observação',
    cell: (r) => <span className="text-muted-foreground truncate">{r.observacao ?? '—'}</span>,
  },
]

export function AssiduidadePage() {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Assiduidade | null>(null)

  return (
    <>
      <SimpleCrudPage<Assiduidade>
        title="Assiduidade"
        description="Registo de presenças, faltas e justificações por aula"
        queryKey="assiduidades"
        searchKey="data_aula"
        searchPlaceholder="Pesquisar por data..."
        listFn={(params) => client.list(params)}
        deleteFn={client.remove}
        getRowId={(r) => r.id}
        getDeleteLabel={(r) => `Assiduidade #${r.id}`}
        columns={columns}
        newLabel="Registar assiduidade"
        onNew={() => {
          setEditing(null)
          setOpen(true)
        }}
        onEdit={(r) => {
          setEditing(r)
          setOpen(true)
        }}
      />

      <AssiduidadeFormDialog open={open} onOpenChange={setOpen} item={editing} />
    </>
  )
}

function AssiduidadeFormDialog({
  open,
  onOpenChange,
  item,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  item: Assiduidade | null
}) {
  const isEdit = !!item
  const defaults: FormValues = {
    inscricao_turma_id: item?.inscricao_turma_id ?? 0,
    horario_id: item?.horario_id ?? 0,
    data_aula: parseDate(item?.data_aula ?? null),
    estado: (item?.estado as 'P' | 'F' | 'A' | 'J') ?? 'P',
    observacao: item?.observacao ?? '',
  }

  return (
    <SimpleFormDialog<FormValues>
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Editar assiduidade' : 'Registar assiduidade'}
      defaultValues={defaults}
      resolver={zodResolver(schema)}
      isEdit={isEdit}
      invalidateKey="assiduidades"
      submitFn={(v) => (isEdit ? client.update(item!.id, v) : client.create(v))}
    >
      {(form) => <Fields form={form} />}
    </SimpleFormDialog>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Fields({ form }: { form: any }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="inscricao_turma_id"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          render={({ field }: any) => (
            <FormItem>
              <FormLabel>ID Inscrição-turma</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="horario_id"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          render={({ field }: any) => (
            <FormItem>
              <FormLabel>ID Horário</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="data_aula"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          render={({ field }: any) => (
            <FormItem>
              <FormLabel>Data da aula</FormLabel>
              <FormControl>
                <DatePicker value={field.value} onChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="estado"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          render={({ field }: any) => (
            <FormItem>
              <FormLabel>Estado</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="P">Presente</SelectItem>
                  <SelectItem value="F">Falta</SelectItem>
                  <SelectItem value="A">Atrasado</SelectItem>
                  <SelectItem value="J">Justificada</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="observacao"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        render={({ field }: any) => (
          <FormItem>
            <FormLabel>Observação</FormLabel>
            <FormControl>
              <Input value={field.value ?? ''} onChange={field.onChange} onBlur={field.onBlur} name={field.name} ref={field.ref} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}

function parseDate(value: string | null): string {
  if (!value) return ''
  const m = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  return value
}
