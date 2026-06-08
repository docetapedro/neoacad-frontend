import { useState } from 'react'
import type { useForm } from 'react-hook-form'
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
  SimpleCrudPage,
  type ColumnDef,
} from '@/components/shared/SimpleCrudPage'
import { SimpleFormDialog } from '@/components/shared/SimpleFormDialog'
import { createCrudClient } from '@/lib/crud'

type Departamento = {
  id: number
  sigla: string
  nome: string
  descricao: string | null
}

const client = createCrudClient<Departamento>('departamentos')

const schema = z.object({
  sigla: z.string().min(1, 'Sigla é obrigatória').max(10),
  nome: z.string().min(1, 'Nome é obrigatório').max(255),
  descricao: z.string().optional().nullable(),
})
type FormValues = z.infer<typeof schema>

const columns: ColumnDef<Departamento>[] = [
  {
    header: 'Sigla',
    cell: (r) => (
      <Badge variant="outline" className="font-mono">
        {r.sigla}
      </Badge>
    ),
  },
  { header: 'Nome', cell: (r) => <span className="font-medium">{r.nome}</span> },
  {
    header: 'Descrição',
    cell: (r) => <span className="text-muted-foreground">{r.descricao ?? '—'}</span>,
  },
]

export function DepartamentosPage() {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Departamento | null>(null)

  return (
    <>
      <SimpleCrudPage<Departamento>
        title="Departamentos"
        description="Unidades orgânicas que organizam os cursos"
        queryKey="departamentos"
        searchPlaceholder="Pesquisar por nome..."
        listFn={(params) => client.list(params)}
        deleteFn={client.remove}
        getRowId={(r) => r.id}
        getDeleteLabel={(r) => r.nome}
        columns={columns}
        newLabel="Novo departamento"
        onNew={() => {
          setEditing(null)
          setOpen(true)
        }}
        onEdit={(r) => {
          setEditing(r)
          setOpen(true)
        }}
      />

      <DepartamentoFormDialog
        open={open}
        onOpenChange={setOpen}
        departamento={editing}
      />
    </>
  )
}

function DepartamentoFormDialog({
  open,
  onOpenChange,
  departamento,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  departamento: Departamento | null
}) {
  const isEdit = !!departamento
  const defaults: FormValues = {
    sigla: departamento?.sigla ?? '',
    nome: departamento?.nome ?? '',
    descricao: departamento?.descricao ?? '',
  }

  return (
    <SimpleFormDialog<FormValues>
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Editar departamento' : 'Novo departamento'}
      defaultValues={defaults}
      resolver={zodResolver(schema)}
      isEdit={isEdit}
      invalidateKey="departamentos"
      submitFn={(v) =>
        isEdit ? client.update(departamento!.id, v) : client.create(v)
      }
    >
      {(form: ReturnType<typeof useForm<FormValues>>) => (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="sigla"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sigla</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="nome"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="descricao"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Descrição</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </SimpleFormDialog>
  )
}
