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
import { DatePicker } from '@/components/shared/DatePicker'
import { createCrudClient } from '@/lib/crud'
import {
  useEstudantesLookup,
  useInscricoesTurmaLookup,
  useTiposAvaliacoesLookup,
} from '@/lib/lookups'

type Avaliacao = {
  id: number
  inscricao_turma_id: number | null
  tipo_avaliacao_id: number | null
  nota: number | string | null
  data_lancamento: string | null
  tipo_avaliacao?: { id: number; descricao: string | null; natureza: string | null } | null
}

type AvaliacaoInput = {
  inscricao_turma: number
  tipo_avaliacao: number
  nota: number
  data_lancamento?: string
}

const client = createCrudClient<Avaliacao, AvaliacaoInput>('avaliacoes')

const schema = z.object({
  estudante_filter: z.number().int().nullable().optional(),
  inscricao_turma: z.number().int().positive('Inscrição é obrigatória'),
  tipo_avaliacao: z.number().int().positive('Tipo de avaliação é obrigatório'),
  nota: z.number().min(0, 'Mínimo 0').max(20, 'Máximo 20'),
  data_lancamento: z.string().optional().nullable(),
})
type FormValues = z.infer<typeof schema>

const columns: ColumnDef<Avaliacao>[] = [
  { header: 'ID', cell: (r) => <span className="font-mono">#{r.id}</span> },
  {
    header: 'Tipo avaliação',
    cell: (r) => <span className="font-medium">{r.tipo_avaliacao?.descricao ?? '—'}</span>,
  },
  {
    header: 'Natureza',
    cell: (r) =>
      r.tipo_avaliacao?.natureza ? (
        <Badge variant="outline">
          {r.tipo_avaliacao.natureza === 'LAN' ? 'Lançada' : 'Calculada'}
        </Badge>
      ) : (
        '—'
      ),
  },
  {
    header: 'Nota',
    cell: (r) => <span className="font-mono font-medium">{r.nota ?? '—'}</span>,
  },
  { header: 'Lançada em', cell: (r) => r.data_lancamento ?? '—' },
]

export function AvaliacoesPage() {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Avaliacao | null>(null)

  return (
    <>
      <SimpleCrudPage<Avaliacao>
        title="Avaliações / Notas"
        description="Consulta e correcção pontual de notas. Para lançar notas em bloco, abra a turma respectiva."
        queryKey="avaliacoes"
        searchKey="nota"
        searchPlaceholder="Pesquisar..."
        listFn={(params) => client.list(params)}
        deleteFn={client.remove}
        getRowId={(r) => r.id}
        getDeleteLabel={(r) => `Avaliação #${r.id}`}
        columns={columns}
        newLabel="Corrigir nota"
        onNew={() => {
          setEditing(null)
          setOpen(true)
        }}
        onEdit={(r) => {
          setEditing(r)
          setOpen(true)
        }}
      />

      <AvaliacaoFormDialog open={open} onOpenChange={setOpen} item={editing} />
    </>
  )
}

function AvaliacaoFormDialog({
  open,
  onOpenChange,
  item,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  item: Avaliacao | null
}) {
  const isEdit = !!item
  const defaults: FormValues = {
    estudante_filter: null,
    inscricao_turma: item?.inscricao_turma_id ?? 0,
    tipo_avaliacao: item?.tipo_avaliacao_id ?? 0,
    nota:
      typeof item?.nota === 'number'
        ? item.nota
        : item?.nota
        ? Number(String(item.nota).replace(',', '.'))
        : 0,
    data_lancamento: parseDate(item?.data_lancamento ?? null),
  }

  return (
    <SimpleFormDialog<FormValues>
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Editar nota' : 'Lançar nota'}
      description="Filtra por estudante para reduzir a lista de inscrições."
      defaultValues={defaults}
      resolver={zodResolver(schema)}
      isEdit={isEdit}
      invalidateKey="avaliacoes"
      submitFn={(v) => {
        const payload = {
          inscricao_turma: v.inscricao_turma,
          tipo_avaliacao: v.tipo_avaliacao,
          nota: v.nota,
          data_lancamento: v.data_lancamento || undefined,
        }
        return isEdit ? client.update(item!.id, payload) : client.create(payload)
      }}
      size="lg"
    >
      {(form) => <Fields form={form} />}
    </SimpleFormDialog>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Fields({ form }: { form: any }) {
  const [estudanteSearch, setEstudanteSearch] = useState('')
  const estudantesQuery = useEstudantesLookup(
    estudanteSearch || undefined,
    estudanteSearch.length >= 2,
  )
  const estudanteId = form.watch('estudante_filter') as number | null
  const inscricoesQuery = useInscricoesTurmaLookup(
    { estudante_id: estudanteId || undefined },
    !!estudanteId,
  )
  const tiposQuery = useTiposAvaliacoesLookup()

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Filtrar por estudante (opcional)</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
          <Input
            placeholder="Digite o nome ou nº processo..."
            value={estudanteSearch}
            onChange={(e) => setEstudanteSearch(e.target.value)}
          />
          <Select
            value={estudanteId ? String(estudanteId) : ''}
            onValueChange={(v) => form.setValue('estudante_filter', Number(v))}
            disabled={!estudantesQuery.data || estudantesQuery.data.length === 0}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  !estudanteSearch
                    ? 'Pesquise para listar'
                    : estudantesQuery.isLoading
                    ? 'A pesquisar...'
                    : !estudantesQuery.data?.length
                    ? 'Sem resultados'
                    : 'Escolher estudante'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {estudantesQuery.data?.map((e) => (
                <SelectItem key={e.id} value={String(e.id)}>
                  {e.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Quando seleccionas um estudante, só aparecem as inscrições-turma dele em baixo.
        </p>
      </div>

      <FormField
        control={form.control}
        name="inscricao_turma"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        render={({ field }: any) => (
          <FormItem>
            <FormLabel>Inscrição-turma</FormLabel>
            <Select
              onValueChange={(v) => field.onChange(Number(v))}
              value={field.value ? String(field.value) : ''}
              disabled={!estudanteId && !inscricoesQuery.data}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !estudanteId
                        ? 'Filtre um estudante primeiro'
                        : inscricoesQuery.isLoading
                        ? 'A carregar...'
                        : 'Selecionar inscrição'
                    }
                  />
                </SelectTrigger>
              </FormControl>
              <SelectContent className="max-h-[280px]">
                {inscricoesQuery.data?.map((i) => (
                  <SelectItem key={i.id} value={String(i.id)}>
                    {i.label}
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
        name="tipo_avaliacao"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        render={({ field }: any) => (
          <FormItem>
            <FormLabel>Tipo de avaliação</FormLabel>
            <Select
              onValueChange={(v) => field.onChange(Number(v))}
              value={field.value ? String(field.value) : ''}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
              </FormControl>
              <SelectContent className="max-h-[280px]">
                {tiposQuery.data?.map((t) => (
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

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="nota"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          render={({ field }: any) => (
            <FormItem>
              <FormLabel>Nota (0–20)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  max={20}
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
          name="data_lancamento"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          render={({ field }: any) => (
            <FormItem>
              <FormLabel>Data de lançamento</FormLabel>
              <FormControl>
                <DatePicker value={field.value ?? ''} onChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}

function parseDate(value: string | null): string {
  if (!value) return ''
  const m = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  return value
}
