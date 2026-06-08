import { useState } from 'react'
import { useWatch } from 'react-hook-form'
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
import { FormulaInput } from '@/components/shared/FormulaInput'
import { SimpleFormDialog } from '@/components/shared/SimpleFormDialog'
import { api } from '@/lib/api'
import {
  useAnosAcademicosLookup,
  useCodigosAvaliacaoLookup,
  usePeriodosLectivosLookup,
} from '@/lib/lookups'

const schema = z.object({
  ano_academico_id: z.number().int().positive('Ano académico é obrigatório'),
  periodo_avaliacao: z.number().int().positive('Período é obrigatório'),
  codigo_avaliacao: z.number().int().positive('Código de avaliação é obrigatório'),
  natureza: z.enum(['LAN', 'CAL']),
  descricao: z.string().min(3, 'Descrição deve ter pelo menos 3 caracteres'),
  ordem: z.number().int().min(1, 'Ordem deve ser >= 1'),
  peso: z.number().min(0).max(100).optional().nullable(),
  expressao: z.string().optional().nullable(),
  activo: z.boolean().optional(),
})
type FormValues = z.infer<typeof schema>

type TipoAvaliacaoForForm = {
  id: number
  natureza: string | null
  descricao: string | null
  ordem: number | null
  peso: number | string | null
  expressao: string | null
  activo: boolean
  codigo_avaliacao_id: number | null
  ano_academico_periodo_lectivo_id: number | null
}

async function create(payload: FormValues): Promise<void> {
  await api.post('/tipos-avaliacoes', payload)
}

async function update(id: number, payload: FormValues): Promise<void> {
  await api.put(`/tipos-avaliacoes/${id}`, payload)
}

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  tipo: TipoAvaliacaoForForm | null
}

export function TipoAvaliacaoFormDialog({ open, onOpenChange, tipo }: Props) {
  const isEdit = !!tipo

  const defaults: FormValues = {
    ano_academico_id: 0,
    periodo_avaliacao: tipo?.ano_academico_periodo_lectivo_id ?? 0,
    codigo_avaliacao: tipo?.codigo_avaliacao_id ?? 0,
    natureza: (tipo?.natureza as 'LAN' | 'CAL') ?? 'LAN',
    descricao: tipo?.descricao ?? '',
    ordem: tipo?.ordem ?? 1,
    peso: typeof tipo?.peso === 'number' ? tipo.peso : tipo?.peso ? Number(tipo.peso) : null,
    expressao: tipo?.expressao ?? '',
    activo: tipo?.activo ?? true,
  }

  return (
    <SimpleFormDialog<FormValues>
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Editar tipo de avaliação' : 'Novo tipo de avaliação'}
      defaultValues={defaults}
      resolver={zodResolver(schema)}
      isEdit={isEdit}
      invalidateKey="tipos-avaliacoes"
      submitFn={(v) => (isEdit ? update(tipo!.id, v) : create(v))}
      size="lg"
    >
      {(form) => <Fields form={form} />}
    </SimpleFormDialog>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Fields({ form }: { form: any }) {
  const [anoSelected, setAnoSelected] = useState<number | null>(null)
  const anosQuery = useAnosAcademicosLookup()
  const codigosQuery = useCodigosAvaliacaoLookup()
  const ano = useWatch({ control: form.control, name: 'ano_academico_id' }) as number
  const natureza = useWatch({ control: form.control, name: 'natureza' }) as 'LAN' | 'CAL'
  const effectiveAno = ano || anoSelected
  const periodosQuery = usePeriodosLectivosLookup(effectiveAno, !!effectiveAno)
  const isCalculada = natureza === 'CAL'

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <FormField
        control={form.control}
        name="ano_academico_id"
        render={({ field }: { field: { value: number; onChange: (v: number) => void } }) => (
          <FormItem>
            <FormLabel>Ano académico</FormLabel>
            <Select
              onValueChange={(v) => {
                field.onChange(Number(v))
                setAnoSelected(Number(v))
              }}
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
        name="periodo_avaliacao"
        render={({ field }: { field: { value: number; onChange: (v: number) => void } }) => (
          <FormItem>
            <FormLabel>Período lectivo</FormLabel>
            <Select
              onValueChange={(v) => field.onChange(Number(v))}
              value={field.value ? String(field.value) : ''}
              disabled={!effectiveAno}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={!effectiveAno ? 'Selecione o ano primeiro' : 'Selecionar'} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {periodosQuery.data?.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.label}
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
        name="codigo_avaliacao"
        render={({ field }: { field: { value: number; onChange: (v: number) => void } }) => (
          <FormItem>
            <FormLabel>Código de avaliação</FormLabel>
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
                {codigosQuery.data?.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.codigo} {c.descricao ? `— ${c.descricao}` : ''}
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
        name="natureza"
        render={({ field }: { field: { value: 'LAN' | 'CAL'; onChange: (v: 'LAN' | 'CAL') => void } }) => (
          <FormItem>
            <FormLabel>Natureza</FormLabel>
            <Select onValueChange={(v) => field.onChange(v as 'LAN' | 'CAL')} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="LAN">Lançada</SelectItem>
                <SelectItem value="CAL">Calculada</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="descricao"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        render={({ field }: any) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>Descrição</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="ordem"
        render={({ field }: {
          field: { value: number; onChange: (v: number) => void; name: string; onBlur: () => void; ref: React.Ref<HTMLInputElement> }
        }) => (
          <FormItem>
            <FormLabel>Ordem</FormLabel>
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
        name="peso"
        render={({ field }: {
          field: { value: number | null; onChange: (v: number | null) => void; name: string; onBlur: () => void; ref: React.Ref<HTMLInputElement> }
        }) => (
          <FormItem>
            <FormLabel>Peso (%)</FormLabel>
            <FormControl>
              <Input
                type="number"
                step="0.01"
                min={0}
                max={100}
                value={field.value ?? ''}
                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {isCalculada && (
        <FormField
          control={form.control}
          name="expressao"
          render={({ field }: {
            field: { value: string | null; onChange: (v: string) => void }
          }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>Expressão de cálculo *</FormLabel>
              <FormControl>
                <FormulaInput
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  anoAcademicoId={effectiveAno || undefined}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground mt-1">
                A nota é <strong>recalculada automaticamente</strong> quando as notas de origem são lançadas.
              </p>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  )
}
