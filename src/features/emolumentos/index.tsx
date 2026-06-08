import { useState } from 'react'
import type { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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

type Emolumento = {
  id: number
  nome: string
  descricao: string | null
  tipo: string | null
}

const client = createCrudClient<Emolumento>('emolumentos')

const schema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  descricao: z.string().optional().nullable(),
  tipo: z.string().optional().nullable(),
})
type FormValues = z.infer<typeof schema>

const columns: ColumnDef<Emolumento>[] = [
  { header: 'Nome', cell: (r) => <span className="font-medium">{r.nome}</span> },
  {
    header: 'Tipo',
    cell: (r) => <span className="text-muted-foreground">{r.tipo ?? '—'}</span>,
  },
  {
    header: 'Descrição',
    cell: (r) => <span className="text-muted-foreground">{r.descricao ?? '—'}</span>,
  },
]

export function EmolumentosPage() {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Emolumento | null>(null)

  return (
    <>
      <SimpleCrudPage<Emolumento>
        title="Emolumentos"
        description="Catálogo de emolumentos / serviços cobrados pela instituição"
        queryKey="emolumentos"
        listFn={(params) => client.list(params)}
        deleteFn={client.remove}
        getRowId={(r) => r.id}
        getDeleteLabel={(r) => r.nome}
        columns={columns}
        newLabel="Novo emolumento"
        onNew={() => {
          setEditing(null)
          setOpen(true)
        }}
        onEdit={(r) => {
          setEditing(r)
          setOpen(true)
        }}
      />

      <EmolumentoFormDialog open={open} onOpenChange={setOpen} item={editing} />
    </>
  )
}

function EmolumentoFormDialog({
  open,
  onOpenChange,
  item,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  item: Emolumento | null
}) {
  const isEdit = !!item
  const defaults: FormValues = {
    nome: item?.nome ?? '',
    descricao: item?.descricao ?? '',
    tipo: item?.tipo ?? '',
  }

  return (
    <SimpleFormDialog<FormValues>
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Editar emolumento' : 'Novo emolumento'}
      defaultValues={defaults}
      resolver={zodResolver(schema)}
      isEdit={isEdit}
      invalidateKey="emolumentos"
      submitFn={(v) => (isEdit ? client.update(item!.id, v) : client.create(v))}
    >
      {(form: ReturnType<typeof useForm<FormValues>>) => (
        <div className="space-y-4">
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
            name="tipo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo</FormLabel>
                <FormControl>
                  <Input
                    value={field.value ?? ''}
                    onChange={field.onChange}
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
            name="descricao"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição</FormLabel>
                <FormControl>
                  <Input
                    value={field.value ?? ''}
                    onChange={field.onChange}
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
      )}
    </SimpleFormDialog>
  )
}
