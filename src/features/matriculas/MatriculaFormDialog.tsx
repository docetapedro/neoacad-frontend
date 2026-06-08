import { useEffect, useMemo } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SimpleFormDialog } from '@/components/shared/SimpleFormDialog'
import { api } from '@/lib/api'
import {
  useCtaaLookup,
  useEstudantesLookup,
  useClassesByCursoLookup,
} from '@/lib/lookups'

const schema = z.object({
  estudante: z.number().int().positive('Estudante é obrigatório'),
  curso_turno_ano_academico: z.number().int().positive('Curso/turno/ano é obrigatório'),
  classe: z.number().int().positive('Classe é obrigatória'),
})
type FormValues = z.infer<typeof schema>

type MatriculaForForm = {
  id: number
  estudante?: { id: number } | null
  curso_turno_ano_academico_id?: number | null
  classe_id?: number | null
}

async function createMatricula(payload: FormValues): Promise<void> {
  await api.post('/matriculas', payload)
}

async function updateMatricula(id: number, payload: FormValues): Promise<void> {
  await api.put(`/matriculas/${id}`, payload)
}

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  matricula?: MatriculaForForm | null
}

export function MatriculaFormDialog({ open, onOpenChange, matricula }: Props) {
  const isEdit = !!matricula

  const defaults: FormValues = {
    estudante: matricula?.estudante?.id ?? 0,
    curso_turno_ano_academico: matricula?.curso_turno_ano_academico_id ?? 0,
    classe: matricula?.classe_id ?? 0,
  }

  return (
    <SimpleFormDialog<FormValues>
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Editar matrícula' : 'Nova matrícula'}
      description={isEdit ? 'Actualizar dados da matrícula' : 'Registar uma nova matrícula'}
      defaultValues={defaults}
      resolver={zodResolver(schema)}
      isEdit={isEdit}
      invalidateKey="matriculas"
      submitFn={(v) => (isEdit ? updateMatricula(matricula!.id, v) : createMatricula(v))}
      size="lg"
    >
      {(form) => <MatriculaFields form={form} />}
    </SimpleFormDialog>
  )
}

function MatriculaFields({
  form,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any
}) {
  const estudantesQuery = useEstudantesLookup()
  const ctaaQuery = useCtaaLookup()

  const selectedCtaaId = useWatch({ control: form.control, name: 'curso_turno_ano_academico' })
  const cursoId = useMemo(() => {
    const found = ctaaQuery.data?.find((c) => c.id === selectedCtaaId)
    return found?.curso_id
  }, [ctaaQuery.data, selectedCtaaId])

  const classesQuery = useClassesByCursoLookup(cursoId)

  // Reset classe quando o curso muda
  useEffect(() => {
    if (cursoId && classesQuery.data) {
      const currentClasse = form.getValues('classe')
      if (currentClasse && !classesQuery.data.find((c) => c.id === currentClasse)) {
        form.setValue('classe', 0)
      }
    }
  }, [cursoId, classesQuery.data, form])

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="estudante"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Estudante</FormLabel>
            <Select
              onValueChange={(v) => field.onChange(Number(v))}
              value={field.value ? String(field.value) : ''}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar estudante" />
                </SelectTrigger>
              </FormControl>
              <SelectContent className="max-h-[300px]">
                {estudantesQuery.data?.map((e) => (
                  <SelectItem key={e.id} value={String(e.id)}>
                    {e.label}
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
        name="curso_turno_ano_academico"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Curso / Turno / Ano académico</FormLabel>
            <Select
              onValueChange={(v) => field.onChange(Number(v))}
              value={field.value ? String(field.value) : ''}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar curso/turno/ano" />
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
        name="classe"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Classe / Ano lectivo</FormLabel>
            <Select
              onValueChange={(v) => field.onChange(Number(v))}
              value={field.value ? String(field.value) : ''}
              disabled={!cursoId}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !cursoId
                        ? 'Selecione primeiro o curso'
                        : classesQuery.isLoading
                        ? 'A carregar...'
                        : 'Selecionar classe'
                    }
                  />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {classesQuery.data?.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.designacao}
                    {c.tipo === 'A' ? 'º Ano' : c.tipo === 'S' ? 'º Semestre' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
