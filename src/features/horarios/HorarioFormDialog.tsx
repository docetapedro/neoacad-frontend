import { useFieldArray, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Info, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { useCtaaLookup, useTurmasPorCtaaLookup } from '@/lib/lookups'

const detalheSchema = z.object({
  id: z.number().optional(),
  turma_id: z.number().int().positive('Turma é obrigatória'),
  dia_semana: z.enum(['2', '3', '4', '5', '6', '7']),
  hora_inicio: z.string().regex(/^\d{2}:\d{2}$/, 'HH:MM'),
  hora_fim: z.string().regex(/^\d{2}:\d{2}$/, 'HH:MM'),
})

const schema = z.object({
  curso_turno_ano_academico: z.number().int().positive('Curso/turno/ano é obrigatório'),
  detalhes: z.array(detalheSchema).min(1, 'Indique pelo menos uma sessão'),
})
type FormValues = z.infer<typeof schema>

type HorarioForForm = {
  id: number
  curso_turno_ano_academico_id: number
  detalhes?: {
    id: number
    dia_semana: string
    hora_inicio: string
    hora_fim: string
    turma_id?: number | null
    turma?: { id: number; sigla: string | null; nome: string | null } | null
  }[]
}

async function create(payload: FormValues): Promise<void> {
  await api.post('/horarios', payload)
}

async function update(id: number, payload: FormValues): Promise<void> {
  await api.put(`/horarios/${id}`, payload)
}

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  horario: HorarioForForm | null
}

const DIAS = [
  { value: '2', label: 'Segunda-feira' },
  { value: '3', label: 'Terça-feira' },
  { value: '4', label: 'Quarta-feira' },
  { value: '5', label: 'Quinta-feira' },
  { value: '6', label: 'Sexta-feira' },
  { value: '7', label: 'Sábado' },
]

export function HorarioFormDialog({ open, onOpenChange, horario }: Props) {
  const isEdit = !!horario

  const defaults: FormValues = {
    curso_turno_ano_academico: horario?.curso_turno_ano_academico_id != null
      ? Number(horario.curso_turno_ano_academico_id)
      : 0,
    detalhes:
      horario?.detalhes?.map((d) => ({
        id: d.id,
        turma_id: d.turma_id != null ? Number(d.turma_id) : 0,
        dia_semana: d.dia_semana as '2' | '3' | '4' | '5' | '6' | '7',
        hora_inicio: d.hora_inicio.slice(0, 5),
        hora_fim: d.hora_fim.slice(0, 5),
      })) ?? [
        { turma_id: 0, dia_semana: '2', hora_inicio: '08:00', hora_fim: '10:00' },
      ],
  }

  return (
    <SimpleFormDialog<FormValues>
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Editar horário' : 'Novo horário'}
      description="Escolha o curso/turno/ano e defina as sessões semanais (turma + dia + intervalo de horas)"
      defaultValues={defaults}
      resolver={zodResolver(schema)}
      isEdit={isEdit}
      invalidateKey="horarios"
      submitFn={(v) => (isEdit ? update(horario!.id, v) : create(v))}
      size="xl"
    >
      {(form) => <Fields form={form} />}
    </SimpleFormDialog>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Fields({ form }: { form: any }) {
  const ctaaQuery = useCtaaLookup()
  const ctaaId = useWatch({ control: form.control, name: 'curso_turno_ano_academico' }) as number
  const turmasQuery = useTurmasPorCtaaLookup(ctaaId || null, !!ctaaId)
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'detalhes' })

  const novaSessaoDefault = () => ({
    turma_id: 0,
    dia_semana: '2' as const,
    hora_inicio: '08:00',
    hora_fim: '10:00',
  })

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="curso_turno_ano_academico"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        render={({ field }: any) => (
          <FormItem>
            <FormLabel>Curso / Turno / Ano académico</FormLabel>
            <Select
              onValueChange={(v) => {
                field.onChange(Number(v))
                // Trocar de CTAA invalida as turmas previamente seleccionadas
                form.getValues('detalhes').forEach((_d: unknown, idx: number) => {
                  form.setValue(`detalhes.${idx}.turma_id`, 0, { shouldValidate: false })
                })
              }}
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

      <div className="flex items-center justify-between border-t pt-4">
        <h4 className="text-sm font-medium">Sessões</h4>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append(novaSessaoDefault())}
          disabled={!ctaaId}
        >
          <Plus className="mr-2 h-4 w-4" />
          Adicionar sessão
        </Button>
      </div>

      {!ctaaId && (
        <p className="text-xs text-muted-foreground flex items-start gap-1">
          <Info className="h-3 w-3 mt-0.5 shrink-0" />
          Escolha primeiro o curso/turno/ano académico para depois definir as sessões.
        </p>
      )}

      <div className="space-y-3">
        {fields.map((f, idx) => (
          <div
            key={f.id}
            className="grid grid-cols-1 sm:grid-cols-6 gap-3 border rounded-md p-3 relative"
          >
            <FormField
              control={form.control}
              name={`detalhes.${idx}.turma_id`}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              render={({ field }: any) => (
                <FormItem className="sm:col-span-3">
                  <FormLabel>Turma</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(Number(v))}
                    value={field.value ? String(field.value) : ''}
                    disabled={!ctaaId}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            !ctaaId
                              ? 'Escolha o CTAA primeiro'
                              : turmasQuery.isLoading
                                ? 'A carregar turmas...'
                                : turmasQuery.data?.length === 0
                                  ? 'Sem turmas para este CTAA'
                                  : 'Seleccionar turma'
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[260px]">
                      {turmasQuery.data?.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>
                          {t.label}
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
              name={`detalhes.${idx}.dia_semana`}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              render={({ field }: any) => (
                <FormItem className="sm:col-span-3">
                  <FormLabel>Dia da semana</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DIAS.map((d) => (
                        <SelectItem key={d.value} value={d.value}>
                          {d.label}
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
              name={`detalhes.${idx}.hora_inicio`}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              render={({ field }: any) => (
                <FormItem className="sm:col-span-3">
                  <FormLabel>Início</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`detalhes.${idx}.hora_fim`}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              render={({ field }: any) => (
                <FormItem className="sm:col-span-3">
                  <FormLabel>Fim</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {fields.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/80"
                onClick={() => remove(idx)}
                title="Remover sessão"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
