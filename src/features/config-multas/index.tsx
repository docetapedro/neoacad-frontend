import { useState } from 'react'
import type { useForm } from 'react-hook-form'
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
import { createCrudClient } from '@/lib/crud'
import { api } from '@/lib/api'

type ConfigMulta = {
  id: number
  ano_academico_id: number
  usar_percentagem: boolean
  valor_percentagem: number | string | null
  valor_fixo: number | string | null
  dias_tolerancia: number
  activo: boolean
  ano_academico?: { id: number; ano: number } | null
}

type ConfigMultaInput = {
  ano_academico: number
  usar_percentagem: boolean
  valor_percentagem?: number | null
  valor_fixo?: number | null
  dias_tolerancia: number
  activo: boolean
}

const client = createCrudClient<ConfigMulta, ConfigMultaInput>('config-multas')

const schema = z.object({
  ano_academico: z.number().int().positive('Ano académico é obrigatório'),
  usar_percentagem: z.boolean(),
  valor_percentagem: z.number().nullable().optional(),
  valor_fixo: z.number().nullable().optional(),
  dias_tolerancia: z.number().int().min(0),
  activo: z.boolean(),
})
type FormValues = z.infer<typeof schema>

const columns: ColumnDef<ConfigMulta>[] = [
  {
    header: 'Ano',
    cell: (r) => <span className="font-mono">{r.ano_academico?.ano ?? r.ano_academico_id}</span>,
  },
  {
    header: 'Tipo',
    cell: (r) => (
      <Badge variant="outline">
        {r.usar_percentagem ? 'Percentual' : 'Fixo'}
      </Badge>
    ),
  },
  {
    header: 'Valor',
    cell: (r) =>
      r.usar_percentagem ? `${r.valor_percentagem ?? 0} %` : `${r.valor_fixo ?? 0}`,
  },
  { header: 'Dias tolerância', cell: (r) => r.dias_tolerancia },
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

async function listAnosAcademicos(): Promise<{ id: number; ano: number }[]> {
  const { data } = await api.get('/anos-academicos', { params: { quantidade: 100 } })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data?.dados?.items ?? []).map((a: any) => ({ id: a.id, ano: a.ano }))
}

export function ConfigMultasPage() {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ConfigMulta | null>(null)

  return (
    <>
      <SimpleCrudPage<ConfigMulta>
        title="Configuração de Multas"
        description="Regras de cálculo de multas por ano académico"
        queryKey="config-multas"
        listFn={(params) => client.list(params)}
        deleteFn={client.remove}
        getRowId={(r) => r.id}
        getDeleteLabel={(r) => `Multa ${r.ano_academico?.ano ?? r.id}`}
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

      <ConfigMultaFormDialog open={open} onOpenChange={setOpen} config={editing} />
    </>
  )
}

function parseNum(v: number | string | null | undefined): number {
  if (v === null || v === undefined || v === '') return 0
  return typeof v === 'number' ? v : Number(String(v).replace(/[^\d.,-]/g, '').replace(',', '.'))
}

function ConfigMultaFormDialog({
  open,
  onOpenChange,
  config,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  config: ConfigMulta | null
}) {
  const isEdit = !!config
  const anosQuery = useQuery({
    queryKey: ['anos-academicos-lookup'],
    queryFn: listAnosAcademicos,
    enabled: open,
    staleTime: 5 * 60 * 1000,
  })

  const defaults: FormValues = {
    ano_academico: config?.ano_academico_id ?? 0,
    usar_percentagem: config?.usar_percentagem ?? true,
    valor_percentagem: parseNum(config?.valor_percentagem) || 0,
    valor_fixo: parseNum(config?.valor_fixo) || 0,
    dias_tolerancia: config?.dias_tolerancia ?? 0,
    activo: config?.activo ?? false,
  }

  return (
    <SimpleFormDialog<FormValues>
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Editar configuração' : 'Nova configuração de multa'}
      defaultValues={defaults}
      resolver={zodResolver(schema)}
      isEdit={isEdit}
      invalidateKey="config-multas"
      submitFn={(v) => (isEdit ? client.update(config!.id, v) : client.create(v))}
      size="lg"
    >
      {(form: ReturnType<typeof useForm<FormValues>>) => (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="ano_academico"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
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
            name="usar_percentagem"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de multa</FormLabel>
                <Select
                  onValueChange={(v) => field.onChange(v === 'true')}
                  value={field.value ? 'true' : 'false'}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="true">Percentual</SelectItem>
                    <SelectItem value="false">Fixo</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dias_tolerancia"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dias de tolerância</FormLabel>
                <FormControl>
                  <Input
                    type="number"
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
          {form.watch('usar_percentagem') ? (
            <FormField
              control={form.control}
              name="valor_percentagem"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor percentual (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      max={100}
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
          ) : (
            <FormField
              control={form.control}
              name="valor_fixo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor fixo</FormLabel>
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
          )}
          <FormField
            control={form.control}
            name="activo"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Estado</FormLabel>
                <Select
                  onValueChange={(v) => field.onChange(v === 'true')}
                  value={field.value ? 'true' : 'false'}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="true">Activa</SelectItem>
                    <SelectItem value="false">Inactiva</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </SimpleFormDialog>
  )
}
