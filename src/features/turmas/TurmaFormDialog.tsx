import { useState } from 'react'
import { useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { FormulaInput } from '@/components/shared/FormulaInput'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SimpleFormDialog } from '@/components/shared/SimpleFormDialog'
import { api, type ApiResponse } from '@/lib/api'
import { useAnosAcademicosLookup, useTurnosLookup } from '@/lib/lookups'

type GrelhaLite = { id: number; nome: string; curso?: { id: number; nome: string; sigla: string | null } | null }
type DisciplinaGrelhaLite = {
  id: number
  disciplina_id: number
  disciplina?: { id: number; nome: string; sigla: string | null } | null
  classe?: { id: number; designacao: string | null; ordem: number | null } | null
}

async function fetchGrelhas(): Promise<GrelhaLite[]> {
  const { data } = await api.get<ApiResponse<{ items: GrelhaLite[] }>>('/grelhas-curriculares', {
    params: { quantidade: 200 },
  })
  return data.dados?.items ?? []
}

async function fetchDisciplinasDaGrelha(grelhaId: number): Promise<DisciplinaGrelhaLite[]> {
  const { data } = await api.get<ApiResponse<DisciplinaGrelhaLite[]>>(
    `/grelhas-curriculares/${grelhaId}/disciplinas`,
  )
  return (data.dados ?? []) as DisciplinaGrelhaLite[]
}

const baseFields = {
  sigla: z.string().min(1, 'Sigla é obrigatória').max(50),
  nome: z.string().min(1, 'Nome é obrigatório').max(255),
  descricao: z.string().optional().nullable(),
  formula_media_final: z.string().optional().nullable(),
  turno_id: z.number().int().positive('Turno é obrigatório'),
}

const createSchema = z.object({
  ...baseFields,
  disciplina_grelha_id: z.number().int().positive('Disciplina grelha é obrigatória'),
  ano_academico_id: z.number().int().positive('Ano académico é obrigatório'),
})

const editSchema = z.object({
  ...baseFields,
  disciplina_grelha_id: z.number().optional(),
  ano_academico_id: z.number().optional(),
})

type FormValues = z.infer<typeof createSchema>

type TurmaForForm = {
  id: number
  sigla: string | null
  nome: string | null
  descricao: string | null
  formula_media_final?: string | null
  turno_id?: number | null
  ano_academico_id?: number | null
  disciplina_grelha_id?: number | null
}

async function create(payload: FormValues): Promise<void> {
  await api.post('/turmas', payload)
}

async function update(id: number, payload: Partial<FormValues>): Promise<void> {
  await api.put(`/turmas/${id}`, payload)
}

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  turma: TurmaForForm | null
}

export function TurmaFormDialog({ open, onOpenChange, turma }: Props) {
  const isEdit = !!turma

  const defaults: FormValues = {
    sigla: turma?.sigla ?? '',
    nome: turma?.nome ?? '',
    descricao: turma?.descricao ?? '',
    formula_media_final: turma?.formula_media_final ?? '',
    turno_id: turma?.turno_id ?? 0,
    disciplina_grelha_id: turma?.disciplina_grelha_id ?? 0,
    ano_academico_id: turma?.ano_academico_id ?? 0,
  }

  return (
    <SimpleFormDialog<FormValues>
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Editar turma' : 'Nova turma'}
      defaultValues={defaults}
      resolver={zodResolver(isEdit ? editSchema : createSchema)}
      isEdit={isEdit}
      invalidateKey="turmas"
      submitFn={(v) => (isEdit ? update(turma!.id, v) : create(v))}
      size="lg"
    >
      {(form) => <Fields form={form} isEdit={isEdit} />}
    </SimpleFormDialog>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Fields({ form, isEdit }: { form: any; isEdit: boolean }) {
  const turnosQuery = useTurnosLookup()
  const anosQuery = useAnosAcademicosLookup(!isEdit)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <FormField
        control={form.control}
        name="sigla"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        render={({ field }: any) => (
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        render={({ field }: any) => (
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
        name="turno_id"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        render={({ field }: any) => (
          <FormItem>
            <FormLabel>Turno</FormLabel>
            <Select
              onValueChange={(v) => field.onChange(Number(v))}
              value={field.value ? String(field.value) : ''}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar turno" />
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
      {!isEdit && (
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
      )}
      {!isEdit && <DisciplinaGrelhaPicker form={form} />}
      <FormField
        control={form.control}
        name="descricao"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        render={({ field }: any) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>Descrição</FormLabel>
            <FormControl>
              <Input value={field.value ?? ''} onChange={field.onChange} onBlur={field.onBlur} name={field.name} ref={field.ref} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="formula_media_final"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        render={({ field }: any) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>Fórmula da média final</FormLabel>
            <FormControl>
              <FormulaInput
                value={field.value ?? ''}
                onChange={field.onChange}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DisciplinaGrelhaPicker({ form }: { form: any }) {
  const dgId = useWatch({ control: form.control, name: 'disciplina_grelha_id' }) as number | undefined

  const grelhasQuery = useQuery({
    queryKey: ['turmas-form', 'grelhas-lookup'],
    queryFn: fetchGrelhas,
    staleTime: 5 * 60 * 1000,
  })

  // Estado controlado da grelha seleccionada — não vai para o form, só serve de filtro
  const [grelhaId, setGrelhaId] = useState<number | null>(null)

  const disciplinasQuery = useQuery({
    queryKey: ['turmas-form', 'disciplinas-grelha', grelhaId],
    queryFn: () => fetchDisciplinasDaGrelha(grelhaId!),
    enabled: !!grelhaId,
    staleTime: 60 * 1000,
  })

  return (
    <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-md border bg-muted/30 p-3">
      <div className="sm:col-span-2">
        <p className="text-xs font-medium mb-1">Disciplina da grelha</p>
        <p className="text-xs text-muted-foreground mb-2">
          Escolha primeiro a grelha curricular; depois aparece a lista de disciplinas dessa grelha.
        </p>
      </div>

      <div>
        <label className="text-sm font-medium">Grelha curricular</label>
        <Select
          value={grelhaId ? String(grelhaId) : ''}
          onValueChange={(v) => {
            const id = Number(v)
            setGrelhaId(id)
            // Limpa selecção anterior de disciplina ao trocar de grelha
            form.setValue('disciplina_grelha_id', 0, { shouldValidate: true })
          }}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Seleccionar grelha..." />
          </SelectTrigger>
          <SelectContent>
            {grelhasQuery.data?.map((g) => (
              <SelectItem key={g.id} value={String(g.id)}>
                {g.nome}
                {g.curso?.sigla && ` · ${g.curso.sigla}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <FormField
        control={form.control}
        name="disciplina_grelha_id"
        render={({ field }: { field: { value: number; onChange: (v: number) => void } }) => (
          <FormItem>
            <FormLabel>Disciplina</FormLabel>
            <Select
              onValueChange={(v) => field.onChange(Number(v))}
              value={field.value ? String(field.value) : ''}
              disabled={!grelhaId}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !grelhaId
                        ? 'Seleccione a grelha primeiro'
                        : disciplinasQuery.isLoading
                          ? 'A carregar...'
                          : 'Seleccionar disciplina'
                    }
                  />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {disciplinasQuery.data?.map((dg) => (
                  <SelectItem key={dg.id} value={String(dg.id)}>
                    {dg.disciplina?.sigla ? `[${dg.disciplina.sigla}] ` : ''}
                    {dg.disciplina?.nome ?? `Disciplina #${dg.disciplina_id}`}
                    {dg.classe?.designacao ? ` · ${dg.classe.designacao}` : ''}
                  </SelectItem>
                ))}
                {grelhaId && disciplinasQuery.isFetched && (disciplinasQuery.data?.length ?? 0) === 0 && (
                  <div className="px-3 py-4 text-sm text-muted-foreground">
                    Esta grelha ainda não tem disciplinas.
                  </div>
                )}
              </SelectContent>
            </Select>
            <FormMessage />
            {dgId ? (
              <p className="text-xs text-muted-foreground mt-1">
                disciplina_grelha_id seleccionado: <span className="font-mono">{dgId}</span>
              </p>
            ) : null}
          </FormItem>
        )}
      />
    </div>
  )
}

