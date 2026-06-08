import { useState } from 'react'
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
import {
  useAnosAcademicosLookup,
  useDisciplinasLookup,
} from '@/lib/lookups'

type PlanoEnsino = {
  id: number
  disciplina_id: number
  docente_id: number | null
  ano_academico_id: number
  objetivos: string | null
  conteudo: string | null
  metodologia: string | null
  criterios_avaliacao: string | null
  cronograma: string | null
  observacoes: string | null
  disciplina?: { id: number; nome: string; sigla: string } | null
  docente?: { id: number; name: string; email: string } | null
  ano_academico?: { id: number; ano: number } | null
}

const client = createCrudClient<PlanoEnsino>('planos-ensino')

const schema = z.object({
  disciplina_id: z.number().int().positive('Disciplina é obrigatória'),
  docente_id: z.number().int().nullable().optional(),
  ano_academico_id: z.number().int().positive('Ano académico é obrigatório'),
  objetivos: z.string().optional().nullable(),
  conteudo: z.string().optional().nullable(),
  metodologia: z.string().optional().nullable(),
  criterios_avaliacao: z.string().optional().nullable(),
  cronograma: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
})
type FormValues = z.infer<typeof schema>

const columns: ColumnDef<PlanoEnsino>[] = [
  {
    header: 'Disciplina',
    cell: (r) => (
      <span className="font-medium">
        {r.disciplina?.sigla ? `${r.disciplina.sigla} — ` : ''}
        {r.disciplina?.nome ?? '—'}
      </span>
    ),
  },
  {
    header: 'Ano',
    cell: (r) => (
      <Badge variant="outline" className="font-mono">
        {r.ano_academico?.ano ?? '—'}
      </Badge>
    ),
  },
  {
    header: 'Docente',
    cell: (r) => r.docente?.name ?? <span className="text-muted-foreground">—</span>,
  },
]

export function PlanosEnsinoPage() {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<PlanoEnsino | null>(null)

  return (
    <>
      <SimpleCrudPage<PlanoEnsino>
        title="Planos de Ensino"
        description="Conteúdo programático de cada disciplina por ano académico"
        queryKey="planos-ensino"
        listFn={(params) => client.list(params)}
        deleteFn={client.remove}
        getRowId={(r) => r.id}
        getDeleteLabel={(r) => r.disciplina?.nome ?? `Plano #${r.id}`}
        columns={columns}
        newLabel="Novo plano"
        onNew={() => {
          setEditing(null)
          setOpen(true)
        }}
        onEdit={(r) => {
          setEditing(r)
          setOpen(true)
        }}
      />

      <PlanoFormDialog open={open} onOpenChange={setOpen} plano={editing} />
    </>
  )
}

function PlanoFormDialog({
  open,
  onOpenChange,
  plano,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  plano: PlanoEnsino | null
}) {
  const isEdit = !!plano
  const defaults: FormValues = {
    disciplina_id: plano?.disciplina_id ?? 0,
    docente_id: plano?.docente_id ?? null,
    ano_academico_id: plano?.ano_academico_id ?? 0,
    objetivos: plano?.objetivos ?? '',
    conteudo: plano?.conteudo ?? '',
    metodologia: plano?.metodologia ?? '',
    criterios_avaliacao: plano?.criterios_avaliacao ?? '',
    cronograma: plano?.cronograma ?? '',
    observacoes: plano?.observacoes ?? '',
  }

  return (
    <SimpleFormDialog<FormValues>
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Editar plano de ensino' : 'Novo plano de ensino'}
      defaultValues={defaults}
      resolver={zodResolver(schema)}
      isEdit={isEdit}
      invalidateKey="planos-ensino"
      submitFn={(v) => (isEdit ? client.update(plano!.id, v) : client.create(v))}
      size="xl"
    >
      {(form) => <Fields form={form} />}
    </SimpleFormDialog>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Fields({ form }: { form: any }) {
  const disciplinasQuery = useDisciplinasLookup()
  const anosQuery = useAnosAcademicosLookup()

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="disciplina_id"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          render={({ field }: any) => (
            <FormItem>
              <FormLabel>Disciplina</FormLabel>
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
                  {disciplinasQuery.data?.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.sigla} — {d.nome}
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
      </div>

      <FormField
        control={form.control}
        name="docente_id"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        render={({ field }: any) => (
          <FormItem>
            <FormLabel>ID do Docente (opcional)</FormLabel>
            <FormControl>
              <Input
                type="number"
                min={1}
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

      {(['objetivos', 'conteudo', 'metodologia', 'criterios_avaliacao', 'cronograma', 'observacoes'] as const).map(
        (name) => (
          <FormField
            key={name}
            control={form.control}
            name={name}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            render={({ field }: any) => (
              <FormItem>
                <FormLabel>
                  {name === 'criterios_avaliacao'
                    ? 'Critérios de avaliação'
                    : name.charAt(0).toUpperCase() + name.slice(1)}
                </FormLabel>
                <FormControl>
                  <textarea
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value)}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ),
      )}
    </div>
  )
}
