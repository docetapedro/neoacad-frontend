import { Fragment, useEffect, useState } from 'react'
import type { useForm } from 'react-hook-form'
import { useFieldArray } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AxiosError } from 'axios'
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Loader2,
  Lock,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  Unlock,
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { DatePicker } from '@/components/shared/DatePicker'
import { DataTablePagination } from '@/components/shared/DataTablePagination'
import { PageHeader } from '@/components/shared/PageHeader'
import { SimpleFormDialog } from '@/components/shared/SimpleFormDialog'
import { cn } from '@/lib/utils'
import { createCrudClient } from '@/lib/crud'

type PeriodoLectivo = {
  id?: number
  periodo_lectivo_id: number
  inicio_periodo: string
  fim_periodo: string
  inicio_avaliacao: string
  fim_avaliacao: string
  avaliacao_fechada?: boolean
}

type AnoAcademico = {
  id: number
  ano: number
  inicio: string
  fim: string
  activo: boolean
  periodos_lectivos?: PeriodoLectivo[]
}

const client = createCrudClient<AnoAcademico>('anos-academicos')

const detalheSchema = z.object({
  numero: z.number().int().min(1),
  inicio_periodo: z.string().min(1, 'Obrigatório'),
  fim_periodo: z.string().min(1, 'Obrigatório'),
  inicio_avaliacao: z.string().min(1, 'Obrigatório'),
  fim_avaliacao: z.string().min(1, 'Obrigatório'),
})

const schema = z.object({
  ano: z.number().int().min(1900, 'Ano inválido'),
  inicio: z.string().min(1, 'Data de início obrigatória'),
  fim: z.string().min(1, 'Data de fim obrigatória'),
  activo: z.boolean().optional(),
  detalhes: z.array(detalheSchema).min(1, 'Indique pelo menos um período lectivo'),
})
type FormValues = z.infer<typeof schema>

export function AnosAcademicosPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AnoAcademico | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<AnoAcademico | null>(null)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [addingPeriodoTo, setAddingPeriodoTo] = useState<AnoAcademico | null>(null)
  const [editingPeriodo, setEditingPeriodo] = useState<{
    ano: AnoAcademico
    periodo: PeriodoLectivo
  } | null>(null)

  const query = useQuery({
    queryKey: ['anos-academicos', { page, search }],
    queryFn: () =>
      client.list({
        page,
        ano: search || undefined,
      }),
    placeholderData: (prev) => prev,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => client.remove(id),
    onSuccess: () => {
      toast.success('Ano académico eliminado')
      queryClient.invalidateQueries({ queryKey: ['anos-academicos'] })
      setConfirmDelete(null)
    },
    onError: () => toast.error('Não foi possível eliminar'),
  })

  const toggleAvaliacaoMutation = useMutation({
    mutationFn: async ({ anoId, periodoId }: { anoId: number; periodoId: number }) => {
      const { data } = await api.patch(
        `/anos-academicos/${anoId}/periodos/${periodoId}/toggle-avaliacao`,
      )
      return data
    },
    onSuccess: (data) => {
      toast.success(typeof data?.message === 'string' ? data.message : 'Estado actualizado')
      queryClient.invalidateQueries({ queryKey: ['anos-academicos'] })
    },
    onError: (e: AxiosError<{ message?: string }>) =>
      toast.error(
        typeof e.response?.data?.message === 'string'
          ? e.response.data.message
          : 'Não foi possível alterar o estado da avaliação',
      ),
  })

  const deletePeriodoMutation = useMutation({
    mutationFn: ({ anoId, periodoId }: { anoId: number; periodoId: number }) =>
      api.delete(`/anos-academicos/${anoId}/periodos/${periodoId}`),
    onSuccess: () => {
      toast.success('Período eliminado')
      queryClient.invalidateQueries({ queryKey: ['anos-academicos'] })
    },
    onError: (e: AxiosError<{ message?: string }>) =>
      toast.error(
        typeof e.response?.data?.message === 'string'
          ? e.response.data.message
          : 'Não foi possível eliminar o período',
      ),
  })

  const toggle = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const items = query.data?.items ?? []
  const pag = query.data?.paginacao

  return (
    <div>
      <PageHeader
        title="Anos Académicos"
        description="Configuração dos anos lectivos e respectivos períodos. Clique no chevron para ver os períodos lectivos de cada ano."
        actions={
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo ano académico
          </Button>
        }
      />

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por ano..."
              className="pl-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12" />
                <TableHead>Ano</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Fim</TableHead>
                <TableHead className="text-center">Períodos</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground py-10"
                  >
                    Sem resultados
                  </TableCell>
                </TableRow>
              ) : (
                items.map((row) => {
                  const isOpen = expanded.has(row.id)
                  const periodos = row.periodos_lectivos ?? []
                  return (
                    <Fragment key={row.id}>
                      <TableRow
                        className={cn(isOpen && 'border-b-0 bg-muted/30')}
                      >
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => toggle(row.id)}
                            disabled={periodos.length === 0}
                            title={
                              periodos.length === 0
                                ? 'Sem períodos definidos'
                                : isOpen
                                ? 'Recolher'
                                : 'Ver períodos lectivos'
                            }
                          >
                            {isOpen ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono font-medium">{row.ano}</span>
                        </TableCell>
                        <TableCell>{row.inicio}</TableCell>
                        <TableCell>{row.fim}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{periodos.length}</Badge>
                        </TableCell>
                        <TableCell>
                          {row.activo ? (
                            <Badge className="bg-emerald-600 hover:bg-emerald-600">
                              Activo
                            </Badge>
                          ) : (
                            <Badge variant="outline">Inactivo</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditing(row)
                                  setFormOpen(true)
                                }}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setConfirmDelete(row)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                      {isOpen && periodos.length > 0 && (
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={7} className="p-0">
                            <div className="p-4 border-t">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-semibold flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  Períodos lectivos — Ano {row.ano}
                                </h4>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setAddingPeriodoTo(row)}
                                >
                                  <Plus className="mr-2 h-4 w-4" />
                                  Adicionar período
                                </Button>
                              </div>
                              <div className="rounded-md border bg-background">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="w-16">Nº</TableHead>
                                      <TableHead>Início período</TableHead>
                                      <TableHead>Fim período</TableHead>
                                      <TableHead>Início avaliação</TableHead>
                                      <TableHead>Fim avaliação</TableHead>
                                      <TableHead>Estado</TableHead>
                                      <TableHead className="text-right w-44">Acções</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {periodos
                                      .slice()
                                      .sort(
                                        (a, b) =>
                                          (a.periodo_lectivo_id ?? 0) -
                                          (b.periodo_lectivo_id ?? 0),
                                      )
                                      .map((p, idx) => {
                                        const periodoId = p.id ?? 0
                                        const isPending =
                                          (toggleAvaliacaoMutation.isPending &&
                                            toggleAvaliacaoMutation.variables?.periodoId ===
                                              periodoId) ||
                                          (deletePeriodoMutation.isPending &&
                                            deletePeriodoMutation.variables?.periodoId ===
                                              periodoId)
                                        return (
                                          <TableRow key={p.id ?? idx}>
                                            <TableCell className="font-mono">
                                              {p.periodo_lectivo_id ?? idx + 1}º
                                            </TableCell>
                                            <TableCell>{p.inicio_periodo ?? '—'}</TableCell>
                                            <TableCell>{p.fim_periodo ?? '—'}</TableCell>
                                            <TableCell>{p.inicio_avaliacao ?? '—'}</TableCell>
                                            <TableCell>{p.fim_avaliacao ?? '—'}</TableCell>
                                            <TableCell>
                                              {p.avaliacao_fechada ? (
                                                <Badge variant="secondary" className="gap-1">
                                                  <CheckCircle2 className="h-3 w-3" />
                                                  Fechada
                                                </Badge>
                                              ) : (
                                                <Badge variant="outline">Em curso</Badge>
                                              )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                              <div className="flex justify-end gap-1">
                                                {p.id && (
                                                  <Button
                                                    type="button"
                                                    variant={
                                                      p.avaliacao_fechada
                                                        ? 'outline'
                                                        : 'default'
                                                    }
                                                    size="sm"
                                                    className="h-7 text-xs"
                                                    disabled={isPending}
                                                    onClick={() =>
                                                      toggleAvaliacaoMutation.mutate({
                                                        anoId: row.id,
                                                        periodoId: p.id!,
                                                      })
                                                    }
                                                    title={
                                                      p.avaliacao_fechada
                                                        ? 'Reabrir avaliação'
                                                        : 'Fechar avaliação'
                                                    }
                                                  >
                                                    {p.avaliacao_fechada ? (
                                                      <>
                                                        <Unlock className="mr-1 h-3 w-3" />
                                                        Reabrir
                                                      </>
                                                    ) : (
                                                      <>
                                                        <Lock className="mr-1 h-3 w-3" />
                                                        Fechar
                                                      </>
                                                    )}
                                                  </Button>
                                                )}
                                                {p.id && (
                                                  <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    disabled={isPending}
                                                    onClick={() =>
                                                      setEditingPeriodo({ ano: row, periodo: p })
                                                    }
                                                    title="Editar período"
                                                  >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                  </Button>
                                                )}
                                                {p.id && (
                                                  <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                                    disabled={isPending}
                                                    onClick={() => {
                                                      if (
                                                        confirm(
                                                          `Eliminar o ${p.periodo_lectivo_id ?? idx + 1}º período do ano ${row.ano}?`,
                                                        )
                                                      ) {
                                                        deletePeriodoMutation.mutate({
                                                          anoId: row.id,
                                                          periodoId: p.id!,
                                                        })
                                                      }
                                                    }}
                                                    title="Eliminar período"
                                                  >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                  </Button>
                                                )}
                                              </div>
                                            </TableCell>
                                          </TableRow>
                                        )
                                      })}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {pag && (
          <DataTablePagination
            total={pag.total}
            pageSize={pag.por_pagina}
            currentPage={pag.pagina_actual}
            lastPage={pag.ultima_pagina}
            onPageChange={setPage}
          />
        )}
      </Card>

      <AnoFormDialog open={formOpen} onOpenChange={setFormOpen} ano={editing} />

      {addingPeriodoTo && (
        <PeriodoDialog
          mode="create"
          ano={addingPeriodoTo}
          open={!!addingPeriodoTo}
          onOpenChange={(o) => !o && setAddingPeriodoTo(null)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['anos-academicos'] })
            setAddingPeriodoTo(null)
          }}
        />
      )}

      {editingPeriodo && (
        <PeriodoDialog
          mode="edit"
          ano={editingPeriodo.ano}
          periodo={editingPeriodo.periodo}
          open={!!editingPeriodo}
          onOpenChange={(o) => !o && setEditingPeriodo(null)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['anos-academicos'] })
            setEditingPeriodo(null)
          }}
        />
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="Eliminar ano académico"
        description={`Tem a certeza que pretende eliminar o ano ${confirmDelete?.ano}? Esta acção não pode ser revertida.`}
        confirmLabel="Eliminar"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)}
      />
    </div>
  )
}

// ===== Dialog de criação/edição (mantido) =====

function parseDate(value?: string | null): string {
  if (!value) return ''
  const m = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  return value
}

function AnoFormDialog({
  open,
  onOpenChange,
  ano,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  ano: AnoAcademico | null
}) {
  const isEdit = !!ano
  const defaults: FormValues = {
    ano: ano?.ano ?? new Date().getFullYear(),
    inicio: parseDate(ano?.inicio),
    fim: parseDate(ano?.fim),
    activo: ano?.activo ?? false,
    detalhes:
      ano?.periodos_lectivos?.map((p, i) => ({
        numero: p.periodo_lectivo_id ?? i + 1,
        inicio_periodo: parseDate(p.inicio_periodo),
        fim_periodo: parseDate(p.fim_periodo),
        inicio_avaliacao: parseDate(p.inicio_avaliacao),
        fim_avaliacao: parseDate(p.fim_avaliacao),
      })) ?? [
        {
          numero: 1,
          inicio_periodo: '',
          fim_periodo: '',
          inicio_avaliacao: '',
          fim_avaliacao: '',
        },
      ],
  }

  return (
    <SimpleFormDialog<FormValues>
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Editar ano académico' : 'Novo ano académico'}
      description="Os períodos lectivos só podem ser definidos na criação"
      defaultValues={defaults}
      resolver={zodResolver(schema)}
      isEdit={isEdit}
      invalidateKey="anos-academicos"
      submitFn={(v) =>
        isEdit
          ? client.update(ano!.id, {
              ano: v.ano,
              inicio: v.inicio,
              fim: v.fim,
              activo: v.activo,
            })
          : client.create(v)
      }
      size="xl"
    >
      {(form: ReturnType<typeof useForm<FormValues>>) => (
        <FormContent form={form} isEdit={isEdit} />
      )}
    </SimpleFormDialog>
  )
}

function FormContent({
  form,
  isEdit,
}: {
  form: ReturnType<typeof useForm<FormValues>>
  isEdit: boolean
}) {
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'detalhes' })

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <FormField
          control={form.control}
          name="ano"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ano</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1900}
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
          name="inicio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data de início</FormLabel>
              <FormControl>
                <DatePicker value={field.value} onChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="fim"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data de fim</FormLabel>
              <FormControl>
                <DatePicker value={field.value} onChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {!isEdit && (
        <>
          <div className="flex items-center justify-between border-t pt-4">
            <h4 className="text-sm font-medium">Períodos lectivos</h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                append({
                  numero: fields.length + 1,
                  inicio_periodo: '',
                  fim_periodo: '',
                  inicio_avaliacao: '',
                  fim_avaliacao: '',
                })
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Adicionar período
            </Button>
          </div>

          <div className="space-y-3">
            {fields.map((f, idx) => (
              <div
                key={f.id}
                className="grid grid-cols-1 sm:grid-cols-5 gap-3 border rounded-md p-3 relative"
              >
                <FormField
                  control={form.control}
                  name={`detalhes.${idx}.numero`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nº</FormLabel>
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
                  name={`detalhes.${idx}.inicio_periodo`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Início período</FormLabel>
                      <FormControl>
                        <DatePicker value={field.value} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`detalhes.${idx}.fim_periodo`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fim período</FormLabel>
                      <FormControl>
                        <DatePicker value={field.value} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`detalhes.${idx}.inicio_avaliacao`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Início aval.</FormLabel>
                      <FormControl>
                        <DatePicker value={field.value} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`detalhes.${idx}.fim_avaliacao`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fim aval.</FormLabel>
                      <FormControl>
                        <DatePicker value={field.value} onChange={field.onChange} />
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
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}

// ===== Adicionar / editar período lectivo a ano académico existente =====

function isoFromDmY(value?: string | null): string {
  if (!value) return ''
  const m = value.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  // Já está em ISO (yyyy-mm-dd) ou outro formato — tenta usar os primeiros 10 chars
  return value.slice(0, 10)
}

function PeriodoDialog({
  mode,
  ano,
  periodo,
  open,
  onOpenChange,
  onSaved,
}: {
  mode: 'create' | 'edit'
  ano: AnoAcademico
  periodo?: PeriodoLectivo
  open: boolean
  onOpenChange: (v: boolean) => void
  onSaved: () => void
}) {
  const isEdit = mode === 'edit'

  // Próximo número esperado pelo backend = max(periodo_lectivo_id) + 1
  const proximo =
    (ano.periodos_lectivos ?? []).reduce(
      (max, p) => Math.max(max, p.periodo_lectivo_id ?? 0),
      0,
    ) + 1

  const initialNumero = isEdit ? periodo?.periodo_lectivo_id ?? proximo : proximo

  const [numero, setNumero] = useState<number>(initialNumero)
  const [inicioPeriodo, setInicioPeriodo] = useState('')
  const [fimPeriodo, setFimPeriodo] = useState('')
  const [inicioAvaliacao, setInicioAvaliacao] = useState('')
  const [fimAvaliacao, setFimAvaliacao] = useState('')

  useEffect(() => {
    if (open) {
      if (isEdit && periodo) {
        setNumero(periodo.periodo_lectivo_id ?? proximo)
        setInicioPeriodo(isoFromDmY(periodo.inicio_periodo))
        setFimPeriodo(isoFromDmY(periodo.fim_periodo))
        setInicioAvaliacao(isoFromDmY(periodo.inicio_avaliacao))
        setFimAvaliacao(isoFromDmY(periodo.fim_avaliacao))
      } else {
        setNumero(proximo)
        setInicioPeriodo('')
        setFimPeriodo('')
        setInicioAvaliacao('')
        setFimAvaliacao('')
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ano.id, periodo?.id])

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        periodo_lectivo: numero,
        inicio_periodo: inicioPeriodo,
        fim_periodo: fimPeriodo,
        inicio_avaliacao: inicioAvaliacao,
        fim_avaliacao: fimAvaliacao,
      }
      if (isEdit && periodo?.id) {
        await api.put(`/anos-academicos/${ano.id}/periodos/${periodo.id}`, payload)
      } else {
        await api.post(`/anos-academicos/${ano.id}/periodos`, payload)
      }
    },
    onSuccess: () => {
      toast.success(
        isEdit
          ? `${numero}º período actualizado`
          : `${numero}º período adicionado ao ano ${ano.ano}`,
      )
      onSaved()
    },
    onError: (e: AxiosError<{ message?: unknown; errors?: Record<string, string[]> }>) => {
      const data = e.response?.data
      if (data?.errors) {
        const first = Object.values(data.errors)[0]
        if (Array.isArray(first) && first[0]) {
          toast.error(first[0])
          return
        }
      }
      const m = data?.message
      toast.error(
        typeof m === 'string'
          ? m
          : isEdit
          ? 'Não foi possível actualizar o período'
          : 'Não foi possível adicionar o período',
      )
    },
  })

  const podeSubmeter =
    numero > 0 &&
    inicioPeriodo &&
    fimPeriodo &&
    inicioAvaliacao &&
    fimAvaliacao

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? `Editar ${numero}º período lectivo` : 'Adicionar período lectivo'}
          </DialogTitle>
          <DialogDescription>
            Ano académico {ano.ano}
            {!isEdit && (
              <>
                {' '}— próximo período esperado: <strong>{proximo}º</strong>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="col-span-2 sm:col-span-1">
            <Label className="text-sm">Nº período</Label>
            <Input
              type="number"
              min={1}
              value={numero}
              onChange={(e) => setNumero(Number(e.target.value))}
              className="mt-1"
              disabled={isEdit}
              title={isEdit ? 'O número do período não pode ser alterado' : undefined}
            />
          </div>
          <div>
            <Label className="text-sm">Início período</Label>
            <DatePicker value={inicioPeriodo} onChange={setInicioPeriodo} className="mt-1" />
          </div>
          <div>
            <Label className="text-sm">Fim período</Label>
            <DatePicker value={fimPeriodo} onChange={setFimPeriodo} className="mt-1" />
          </div>
          <div className="col-span-2 sm:col-span-1 sm:col-start-2">
            <Label className="text-sm">Início avaliação</Label>
            <DatePicker value={inicioAvaliacao} onChange={setInicioAvaliacao} className="mt-1" />
          </div>
          <div>
            <Label className="text-sm">Fim avaliação</Label>
            <DatePicker value={fimAvaliacao} onChange={setFimAvaliacao} className="mt-1" />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!podeSubmeter || mutation.isPending}
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? 'Guardar' : 'Adicionar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
