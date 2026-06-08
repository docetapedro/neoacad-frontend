import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardList,
  FileText,
  GraduationCap,
  Loader2,
  Phone,
  User as UserIcon,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/shared/DatePicker'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
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
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import {
  useAnosAcademicosLookup,
  useCursosLookup,
  useTurnosLookup,
} from '@/lib/lookups'
import type { Candidato } from './types'

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const TIPO_DOC_OPTIONS = [
  { value: 'BI', label: 'Bilhete de Identidade' },
  { value: 'Passaporte', label: 'Passaporte' },
  { value: 'CartaoConsular', label: 'Cartão Consular' },
]

const PARENTESCO_OPTIONS = [
  'Pai',
  'Mãe',
  'Tio(a)',
  'Avô(ó)',
  'Irmão(ã)',
  'Tutor legal',
  'Outro',
]

const schema = z.object({
  // Step 1 — pessoais
  nome_completo: z.string().min(3, 'Nome obrigatório'),
  data_nascimento: z.string().min(1, 'Data obrigatória'),
  genero: z.enum(['M', 'F']),
  nacionalidade: z.string().optional().nullable(),
  naturalidade: z.string().optional().nullable(),

  // Step 2 — documento
  tipo_documento: z.string().min(1, 'Tipo obrigatório'),
  numero_documento: z.string().min(1, 'Nº obrigatório'),
  data_emissao: z.string().optional().nullable(),
  data_validade: z.string().optional().nullable(),

  // Step 3 — contactos
  telefone_principal: z.string().min(1, 'Telefone obrigatório'),
  telefone_alternativo: z.string().optional().nullable(),
  email: z.string().email('Email inválido').or(z.literal('')).optional().nullable(),
  endereco: z.string().optional().nullable(),
  provincia: z.string().optional().nullable(),
  municipio: z.string().optional().nullable(),

  // Step 4 — encarregado
  nome_encarregado: z.string().optional().nullable(),
  parentesco: z.string().optional().nullable(),
  telefone_encarregado: z.string().optional().nullable(),

  // Step 5 — habilitações
  escola_origem: z.string().optional().nullable(),
  ultima_classe: z.string().optional().nullable(),
  ano_conclusao: z.number().int().min(1900).max(2100).optional().nullable(),
  media_final: z.number().min(0).max(20).optional().nullable(),

  // Step 6 — pretensão
  curso_id: z.number().int().positive('Curso obrigatório'),
  turno_id: z.number().int().positive('Turno obrigatório'),
  ano_lectivo_id: z.number().int().positive('Ano lectivo obrigatório'),
  observacoes: z.string().optional().nullable(),
})
type FormValues = z.infer<typeof schema>

type Step = {
  id: string
  title: string
  description: string
  icon: React.ElementType
  fields: (keyof FormValues)[]
}

const STEPS: Step[] = [
  {
    id: 'pessoais',
    title: 'Dados pessoais',
    description: 'Nome, nascimento e nacionalidade',
    icon: UserIcon,
    fields: ['nome_completo', 'data_nascimento', 'genero', 'nacionalidade', 'naturalidade'],
  },
  {
    id: 'documento',
    title: 'Documento',
    description: 'Identificação oficial',
    icon: FileText,
    fields: ['tipo_documento', 'numero_documento', 'data_emissao', 'data_validade'],
  },
  {
    id: 'contactos',
    title: 'Contactos',
    description: 'Telefones, email e morada',
    icon: Phone,
    fields: ['telefone_principal', 'telefone_alternativo', 'email', 'endereco', 'provincia', 'municipio'],
  },
  {
    id: 'encarregado',
    title: 'Encarregado',
    description: 'Responsável (opcional)',
    icon: Users,
    fields: ['nome_encarregado', 'parentesco', 'telefone_encarregado'],
  },
  {
    id: 'habilitacoes',
    title: 'Habilitações',
    description: 'Histórico escolar anterior',
    icon: GraduationCap,
    fields: ['escola_origem', 'ultima_classe', 'ano_conclusao', 'media_final'],
  },
  {
    id: 'pretensao',
    title: 'Pretensão',
    description: 'Curso, turno e ano lectivo',
    icon: ClipboardList,
    fields: ['curso_id', 'turno_id', 'ano_lectivo_id', 'observacoes'],
  },
]

async function create(payload: FormValues): Promise<void> {
  await api.post('/candidatos', payload)
}
async function update(id: number, payload: FormValues): Promise<void> {
  await api.put(`/candidatos/${id}`, payload)
}

function parseDate(value: string | null | undefined): string {
  if (!value) return ''
  const m = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  return value
}

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  candidato: Candidato | null
}

export function CandidatoFormDialog({ open, onOpenChange, candidato }: Props) {
  const queryClient = useQueryClient()
  const isEdit = !!candidato
  const [step, setStep] = useState(0)

  const cursosQuery = useCursosLookup(open)
  const turnosQuery = useTurnosLookup(open)
  const anosQuery = useAnosAcademicosLookup(open)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: buildDefaults(null),
    mode: 'onTouched',
  })

  useEffect(() => {
    if (open) {
      form.reset(buildDefaults(candidato))
      setStep(0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, candidato?.id])

  const mutation = useMutation({
    mutationFn: (v: FormValues) => (isEdit ? update(candidato!.id, v) : create(v)),
    onSuccess: () => {
      toast.success(isEdit ? 'Candidato actualizado' : 'Candidato registado')
      queryClient.invalidateQueries({ queryKey: ['candidatos'] })
      onOpenChange(false)
    },
    onError: (error: unknown) => {
      if (error && typeof error === 'object' && 'isAxiosError' in error) {
        const ax = error as AxiosError<{ message?: unknown; errors?: Record<string, string[]> }>
        const errors = ax.response?.data?.errors
        if (errors) {
          const fieldErrors = Object.entries(errors).flatMap(([f, msgs]) =>
            Array.isArray(msgs) ? [[f, msgs[0]] as const] : [],
          )
          fieldErrors.forEach(([f, m]) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            form.setError(f as any, { message: m })
          })
          const firstErrorField = fieldErrors[0]?.[0]
          if (firstErrorField) {
            const idx = STEPS.findIndex((s) =>
              (s.fields as string[]).includes(firstErrorField),
            )
            if (idx >= 0) setStep(idx)
          }
          toast.error('Há campos inválidos — corrija e tente novamente.')
          return
        }
        const m = ax.response?.data?.message
        toast.error(typeof m === 'string' ? m : ax.message || 'Erro ao gravar')
        return
      }
      toast.error(error instanceof Error ? error.message : 'Erro ao gravar candidato')
    },
  })

  const goNext = async () => {
    const fields = STEPS[step].fields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ok = await form.trigger(fields as any)
    if (ok) setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }
  const goPrev = () => setStep((s) => Math.max(s - 1, 0))
  const submit = (v: FormValues) => mutation.mutate(v)
  const isLast = step === STEPS.length - 1

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Editar candidato' : 'Novo candidato — pré-matrícula'}
          </DialogTitle>
          <DialogDescription>
            Passo {step + 1} de {STEPS.length}: {STEPS[step].description}
          </DialogDescription>
        </DialogHeader>

        <Stepper currentStep={step} onClick={setStep} />

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(submit)}
            className="space-y-4"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isLast) e.preventDefault()
            }}
          >
            {step === 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nome_completo"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Nome completo</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="data_nascimento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de nascimento</FormLabel>
                      <FormControl>
                        <DatePicker value={field.value} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="genero"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Género</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="M">Masculino</SelectItem>
                          <SelectItem value="F">Feminino</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <TextField name="nacionalidade" label="Nacionalidade" form={form} optional />
                <TextField name="naturalidade" label="Naturalidade" form={form} optional />
              </div>
            )}

            {step === 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="tipo_documento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de documento</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TIPO_DOC_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <TextField name="numero_documento" label="Nº do documento" form={form} mono />
                <DateField name="data_emissao" label="Data de emissão" form={form} optional />
                <DateField name="data_validade" label="Data de validade" form={form} optional />
              </div>
            )}

            {step === 2 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField name="telefone_principal" label="Telefone principal" form={form} />
                <TextField
                  name="telefone_alternativo"
                  label="Telefone alternativo"
                  form={form}
                  optional
                />
                <TextField name="email" label="Email" form={form} type="email" optional />
                <TextField name="endereco" label="Endereço" form={form} optional colSpan />
                <TextField name="provincia" label="Província" form={form} optional />
                <TextField name="municipio" label="Município" form={form} optional />
              </div>
            )}

            {step === 3 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField
                  name="nome_encarregado"
                  label="Nome do encarregado"
                  form={form}
                  optional
                  colSpan
                />
                <FormField
                  control={form.control}
                  name="parentesco"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Parentesco{' '}
                        <span className="text-xs text-muted-foreground">(opcional)</span>
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PARENTESCO_OPTIONS.map((o) => (
                            <SelectItem key={o} value={o}>
                              {o}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <TextField
                  name="telefone_encarregado"
                  label="Telefone do encarregado"
                  form={form}
                  optional
                />
              </div>
            )}

            {step === 4 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField
                  name="escola_origem"
                  label="Escola de origem"
                  form={form}
                  optional
                  colSpan
                />
                <TextField name="ultima_classe" label="Última classe" form={form} optional />
                <NumberField name="ano_conclusao" label="Ano de conclusão" form={form} optional />
                <NumberField
                  name="media_final"
                  label="Média final (0–20)"
                  form={form}
                  optional
                  step="0.01"
                />
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="curso_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Curso</FormLabel>
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
                            {cursosQuery.data?.map((c) => (
                              <SelectItem key={c.id} value={String(c.id)}>
                                {c.nome}
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
                    name="turno_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Turno</FormLabel>
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
                            {turnosQuery.data?.map((t) => (
                              <SelectItem key={t.id} value={String(t.id)}>
                                {t.nome}
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
                    name="ano_lectivo_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ano lectivo</FormLabel>
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
                </div>
                <FormField
                  control={form.control}
                  name="observacoes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Observações{' '}
                        <span className="text-xs text-muted-foreground">(opcional)</span>
                      </FormLabel>
                      <FormControl>
                        <textarea
                          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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

            <DialogFooter className="pt-2 sm:justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={step === 0 ? () => onOpenChange(false) : goPrev}
                disabled={mutation.isPending}
              >
                {step === 0 ? (
                  'Cancelar'
                ) : (
                  <>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Anterior
                  </>
                )}
              </Button>

              {!isLast ? (
                <Button type="button" onClick={goNext} disabled={mutation.isPending}>
                  Seguinte
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  {isEdit ? 'Guardar alterações' : 'Registar candidato'}
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function Stepper({
  currentStep,
  onClick,
}: {
  currentStep: number
  onClick: (i: number) => void
}) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-2 -mx-1 px-1">
      {STEPS.map((s, idx) => {
        const Icon = s.icon
        const active = idx === currentStep
        const done = idx < currentStep
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onClick(idx)}
            className={cn(
              'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs whitespace-nowrap transition-colors',
              active && 'bg-primary text-primary-foreground',
              !active && done && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
              !active && !done && 'bg-muted text-muted-foreground hover:bg-muted/70',
            )}
          >
            <span
              className={cn(
                'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold',
                active && 'bg-primary-foreground text-primary',
                !active && done && 'bg-emerald-600 text-white',
                !active && !done && 'bg-background text-muted-foreground',
              )}
            >
              {done ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
            </span>
            <span className="font-medium">{s.title}</span>
          </button>
        )
      })}
    </div>
  )
}

function TextField({
  name,
  label,
  form,
  type = 'text',
  optional,
  mono,
  colSpan,
}: {
  name: keyof FormValues
  label: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any
  type?: string
  optional?: boolean
  mono?: boolean
  colSpan?: boolean
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      render={({ field }: any) => (
        <FormItem className={colSpan ? 'sm:col-span-2' : ''}>
          <FormLabel>
            {label}{' '}
            {optional && <span className="text-xs text-muted-foreground">(opcional)</span>}
          </FormLabel>
          <FormControl>
            <Input
              type={type}
              className={mono ? 'font-mono' : ''}
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
  )
}

function DateField({
  name,
  label,
  form,
  optional,
}: {
  name: keyof FormValues
  label: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any
  optional?: boolean
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      render={({ field }: any) => (
        <FormItem>
          <FormLabel>
            {label}{' '}
            {optional && <span className="text-xs text-muted-foreground">(opcional)</span>}
          </FormLabel>
          <FormControl>
            <DatePicker value={field.value ?? ''} onChange={field.onChange} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

function NumberField({
  name,
  label,
  form,
  step,
  optional,
}: {
  name: keyof FormValues
  label: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any
  step?: string
  optional?: boolean
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      render={({ field }: any) => (
        <FormItem>
          <FormLabel>
            {label}{' '}
            {optional && <span className="text-xs text-muted-foreground">(opcional)</span>}
          </FormLabel>
          <FormControl>
            <Input
              type="number"
              step={step}
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
  )
}

function buildDefaults(c: Candidato | null): FormValues {
  return {
    nome_completo: c?.nome_completo ?? '',
    data_nascimento: parseDate(c?.data_nascimento),
    genero: (c?.genero as 'M' | 'F') ?? 'M',
    nacionalidade: c?.nacionalidade ?? '',
    naturalidade: c?.naturalidade ?? '',
    tipo_documento: c?.tipo_documento ?? 'BI',
    numero_documento: c?.numero_documento ?? '',
    data_emissao: parseDate(c?.data_emissao),
    data_validade: parseDate(c?.data_validade),
    telefone_principal: c?.telefone_principal ?? '',
    telefone_alternativo: c?.telefone_alternativo ?? '',
    email: c?.email ?? '',
    endereco: c?.endereco ?? '',
    provincia: c?.provincia ?? '',
    municipio: c?.municipio ?? '',
    nome_encarregado: c?.nome_encarregado ?? '',
    parentesco: c?.parentesco ?? '',
    telefone_encarregado: c?.telefone_encarregado ?? '',
    escola_origem: c?.escola_origem ?? '',
    ultima_classe: c?.ultima_classe ?? '',
    ano_conclusao: c?.ano_conclusao ?? null,
    media_final:
      typeof c?.media_final === 'number'
        ? c.media_final
        : c?.media_final
        ? Number(c.media_final)
        : null,
    curso_id: c?.curso_id ?? 0,
    turno_id: c?.turno_id ?? 0,
    ano_lectivo_id: c?.ano_lectivo_id ?? 0,
    observacoes: c?.observacoes ?? '',
  }
}
