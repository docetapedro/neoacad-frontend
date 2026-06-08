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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SimpleFormDialog } from '@/components/shared/SimpleFormDialog'
import { api } from '@/lib/api'
import { useCtaaLookup } from '@/lib/lookups'

const schema = z.object({
  curso_turno_ano_academico: z.number().int().positive('Curso/turno/ano é obrigatório'),
  valor: z.number().min(1, 'Valor deve ser positivo'),
  activo: z.boolean(),
})
type FormValues = z.infer<typeof schema>

type ConfigPropinaForForm = {
  id: number
  ctaa_id: number
  valor: number | string | null
  activo: boolean
}

async function create(payload: FormValues): Promise<void> {
  await api.post('/config-propinas', payload)
}

async function update(id: number, payload: FormValues): Promise<void> {
  await api.put(`/config-propinas/${id}`, payload)
}

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  config: ConfigPropinaForForm | null
}

function parseNum(v: number | string | null): number {
  if (v === null) return 0
  if (typeof v === 'number') return v
  return Number(String(v).replace(/[^\d.,-]/g, '').replace(',', '.'))
}

export function ConfigPropinaFormDialog({ open, onOpenChange, config }: Props) {
  const isEdit = !!config
  const defaults: FormValues = {
    curso_turno_ano_academico: config?.ctaa_id ?? 0,
    valor: parseNum(config?.valor ?? null),
    activo: config?.activo ?? true,
  }

  return (
    <SimpleFormDialog<FormValues>
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Editar configuração de propina' : 'Nova configuração de propina'}
      defaultValues={defaults}
      resolver={zodResolver(schema)}
      isEdit={isEdit}
      invalidateKey="config-propinas"
      submitFn={(v) => (isEdit ? update(config!.id, v) : create(v))}
      size="lg"
    >
      {(form) => <Fields form={form} />}
    </SimpleFormDialog>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Fields({ form }: { form: any }) {
  const ctaaQuery = useCtaaLookup()

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="curso_turno_ano_academico"
        render={({ field }: { field: { value: number; onChange: (v: number) => void } }) => (
          <FormItem>
            <FormLabel>Curso / Turno / Ano académico</FormLabel>
            <Select
              onValueChange={(v) => field.onChange(Number(v))}
              value={field.value ? String(field.value) : ''}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
              </FormControl>
              <SelectContent className="max-h-[300px]">
                {ctaaQuery.data?.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.label}
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
        render={({ field }: {
          field: {
            value: number
            onChange: (v: number) => void
            onBlur: () => void
            name: string
            ref: React.Ref<HTMLInputElement>
          }
        }) => (
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

      <FormField
        control={form.control}
        name="activo"
        render={({ field }: { field: { value: boolean; onChange: (v: boolean) => void } }) => (
          <FormItem>
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
  )
}
