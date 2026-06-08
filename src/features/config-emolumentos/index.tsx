import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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
import { api, type ApiResponse } from '@/lib/api'
import { useAnosAcademicosLookup } from '@/lib/lookups'

type ConfigEmolumento = {
  id: number
  ano_academico_id: number
  emolumento_id: number
  valor: number | string | null
  ano_academico?: { id: number; ano: number } | null
  emolumento?: { id: number; nome: string } | null
}

const client = {
  list: async (params: Record<string, unknown>) => {
    const { data } = await api.get<ApiResponse<{
      items: ConfigEmolumento[]
      paginacao: { total: number; por_pagina: number; pagina_actual: number; ultima_pagina: number }
    }>>('/config-emolumentos', { params })
    return data.dados!
  },
  create: async (payload: { ano_academico_id: number; emolumento_id: number; valor: number }) => {
    await api.post('/config-emolumentos', payload)
  },
  update: async (id: number, payload: { ano_academico_id: number; emolumento_id: number; valor: number }) => {
    await api.put(`/config-emolumentos/${id}`, payload)
  },
  remove: async (id: number) => {
    await api.delete(`/config-emolumentos/${id}`)
  },
}

const schema = z.object({
  ano_academico_id: z.number().int().positive('Ano académico é obrigatório'),
  emolumento_id: z.number().int().positive('Emolumento é obrigatório'),
  valor: z.number().min(0, 'Valor deve ser >= 0'),
})
type FormValues = z.infer<typeof schema>

const columns: ColumnDef<ConfigEmolumento>[] = [
  {
    header: 'Emolumento',
    cell: (r) => <span className="font-medium">{r.emolumento?.nome ?? `#${r.emolumento_id}`}</span>,
  },
  {
    header: 'Ano',
    cell: (r) => (
      <Badge variant="outline" className="font-mono">
        {r.ano_academico?.ano ?? r.ano_academico_id}
      </Badge>
    ),
  },
  { header: 'Valor', cell: (r) => <span className="font-mono">{r.valor ?? '—'}</span> },
]

export function ConfigEmolumentosPage() {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ConfigEmolumento | null>(null)

  return (
    <>
      <SimpleCrudPage<ConfigEmolumento>
        title="Configuração de Emolumentos"
        description="Valores dos emolumentos por ano académico"
        queryKey="config-emolumentos"
        listFn={(params) => client.list(params)}
        deleteFn={client.remove}
        getRowId={(r) => r.id}
        getDeleteLabel={(r) => `${r.emolumento?.nome ?? r.id} — ${r.ano_academico?.ano ?? ''}`}
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

      <ConfigFormDialog open={open} onOpenChange={setOpen} item={editing} />
    </>
  )
}

async function listEmolumentosLookup(): Promise<{ id: number; nome: string }[]> {
  const { data } = await api.get('/emolumentos', { params: { quantidade: 200 } })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data?.dados?.items ?? []).map((e: any) => ({ id: e.id, nome: e.nome }))
}

function ConfigFormDialog({
  open,
  onOpenChange,
  item,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  item: ConfigEmolumento | null
}) {
  const isEdit = !!item
  const anosQuery = useAnosAcademicosLookup(open)
  const emolumentosQuery = useQuery({
    queryKey: ['emolumentos-lookup'],
    queryFn: listEmolumentosLookup,
    enabled: open,
    staleTime: 5 * 60 * 1000,
  })

  const defaults: FormValues = {
    ano_academico_id: item?.ano_academico_id ?? 0,
    emolumento_id: item?.emolumento_id ?? 0,
    valor:
      typeof item?.valor === 'number'
        ? item.valor
        : item?.valor
        ? Number(String(item.valor).replace(/[^\d.,-]/g, '').replace(',', '.'))
        : 0,
  }

  return (
    <SimpleFormDialog<FormValues>
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Editar configuração de emolumento' : 'Nova configuração'}
      defaultValues={defaults}
      resolver={zodResolver(schema)}
      isEdit={isEdit}
      invalidateKey="config-emolumentos"
      submitFn={(v) => (isEdit ? client.update(item!.id, v) : client.create(v))}
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="ano_academico_id"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            render={({ field }: any) => (
              <FormItem>
                <FormLabel>Ano académico</FormLabel>
                <Select
                  onValueChange={(v) => field.onChange(Number(v))}
                  value={field.value ? String(field.value) : ''}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {anosQuery.data?.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.ano}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="emolumento_id"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            render={({ field }: any) => (
              <FormItem>
                <FormLabel>Emolumento</FormLabel>
                <Select
                  onValueChange={(v) => field.onChange(Number(v))}
                  value={field.value ? String(field.value) : ''}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {emolumentosQuery.data?.map((e) => (
                      <SelectItem key={e.id} value={String(e.id)}>
                        {e.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="valor"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            render={({ field }: any) => (
              <FormItem>
                <FormLabel>Valor (AOA)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={field.value ?? 0}
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
      )}
    </SimpleFormDialog>
  )
}
