import { Fragment, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AxiosError } from 'axios'
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Layers,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { DataTablePagination } from '@/components/shared/DataTablePagination'
import { PageHeader } from '@/components/shared/PageHeader'
import { SimpleFormDialog } from '@/components/shared/SimpleFormDialog'
import { useAnosAcademicosLookup } from '@/lib/lookups'
import { createCrudClient } from '@/lib/crud'
import { cn } from '@/lib/utils'

type GrelhaCurricular = {
  id: number
  curso_id: number | null
  nome: string
  descricao: string | null
  fechado: boolean
  activo: boolean
  curso?: { id: number; nome: string; sigla: string } | null
}

type GrelhaInput = {
  curso: number
  nome: string
  descricao?: string | null
  fechado?: boolean
  activo?: boolean
}

type GCAA = {
  id: number
  grelha_curricular_id: number
  ano_academico_id: number
  ano_academico: { id: number; ano: number; activo: boolean } | null
  activo: boolean
  fechado: boolean
  turmas_geradas: number
}

const client = createCrudClient<GrelhaCurricular, GrelhaInput>('grelhas-curriculares')

const schema = z.object({
  curso: z.number().int().positive('Curso é obrigatório'),
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  descricao: z.string().optional().nullable(),
  fechado: z.boolean().optional(),
  activo: z.boolean().optional(),
})
type FormValues = z.infer<typeof schema>

async function listCursos(): Promise<{ id: number; nome: string }[]> {
  const { data } = await api.get('/cursos', { params: { quantidade: 200 } })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data?.dados?.items ?? []).map((c: any) => ({ id: c.id, nome: c.nome }))
}

async function fetchGCAAs(grelhaId: number): Promise<GCAA[]> {
  const { data } = await api.get(`/grelhas-curriculares/${grelhaId}/anos-academicos`)
  return (data?.dados ?? []) as GCAA[]
}

export function GrelhasCurricularesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<GrelhaCurricular | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<GrelhaCurricular | null>(null)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [associarTo, setAssociarTo] = useState<GrelhaCurricular | null>(null)
  const [confirmGerar, setConfirmGerar] = useState<{ grelha: GrelhaCurricular; gcaa: GCAA } | null>(
    null,
  )
  const [confirmRemoverAno, setConfirmRemoverAno] = useState<{
    grelha: GrelhaCurricular
    gcaa: GCAA
  } | null>(null)

  const query = useQuery({
    queryKey: ['grelhas-curriculares', { page, search }],
    queryFn: () => client.list({ page, nome: search || undefined }),
    placeholderData: (prev) => prev,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => client.remove(id),
    onSuccess: () => {
      toast.success('Grelha curricular eliminada')
      queryClient.invalidateQueries({ queryKey: ['grelhas-curriculares'] })
      setConfirmDelete(null)
    },
    onError: (e: AxiosError<{ message?: string }>) =>
      toast.error(
        typeof e.response?.data?.message === 'string'
          ? e.response.data.message
          : 'Não foi possível eliminar',
      ),
  })

  const gerarTurmasMutation = useMutation({
    mutationFn: async ({ grelhaId, gcaaId }: { grelhaId: number; gcaaId: number }) => {
      const { data } = await api.post(
        `/grelhas-curriculares/${grelhaId}/anos-academicos/${gcaaId}/gerar-turmas`,
      )
      return data as {
        message?: string
        dados?: { criadas: number; ignoradas: number; erros: unknown[] }
      }
    },
    onSuccess: (data, vars) => {
      const msg = data?.message ?? 'Turmas geradas'
      const erros = (data?.dados?.erros ?? []).length
      if (erros > 0) {
        toast.warning(`${msg} (${erros} erro(s) — verifique os logs).`)
      } else {
        toast.success(msg)
      }
      queryClient.invalidateQueries({ queryKey: ['grelha-gcaa', vars.grelhaId] })
      queryClient.invalidateQueries({ queryKey: ['turmas'] })
      setConfirmGerar(null)
    },
    onError: (e: AxiosError<{ message?: string }>) => {
      toast.error(
        typeof e.response?.data?.message === 'string'
          ? e.response.data.message
          : 'Não foi possível gerar turmas',
      )
      setConfirmGerar(null)
    },
  })

  const removerAnoMutation = useMutation({
    mutationFn: async ({ grelhaId, gcaaId }: { grelhaId: number; gcaaId: number }) =>
      api.delete(`/grelhas-curriculares/${grelhaId}/anos-academicos/${gcaaId}`),
    onSuccess: (_d, vars) => {
      toast.success('Associação removida')
      queryClient.invalidateQueries({ queryKey: ['grelha-gcaa', vars.grelhaId] })
      setConfirmRemoverAno(null)
    },
    onError: (e: AxiosError<{ message?: string }>) => {
      toast.error(
        typeof e.response?.data?.message === 'string'
          ? e.response.data.message
          : 'Não foi possível remover',
      )
      setConfirmRemoverAno(null)
    },
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
        title="Grelhas Curriculares"
        description="Planos curriculares por curso. Expanda uma grelha para ver os anos académicos onde está em uso e gerar turmas."
        actions={
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova grelha
          </Button>
        }
      />

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por nome..."
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
                <TableHead>Nome</TableHead>
                <TableHead>Curso</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                    Sem resultados
                  </TableCell>
                </TableRow>
              ) : (
                items.map((row) => {
                  const isOpen = expanded.has(row.id)
                  return (
                    <Fragment key={row.id}>
                      <TableRow className={cn(isOpen && 'border-b-0 bg-muted/30')}>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => toggle(row.id)}
                            title={isOpen ? 'Recolher' : 'Ver anos académicos'}
                          >
                            {isOpen ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{row.nome}</span>
                          {row.descricao && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {row.descricao}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-muted-foreground">{row.curso?.nome ?? '—'}</span>
                        </TableCell>
                        <TableCell>
                          {row.fechado ? (
                            <Badge variant="secondary">Fechada</Badge>
                          ) : row.activo ? (
                            <Badge className="bg-emerald-600 hover:bg-emerald-600">Activa</Badge>
                          ) : (
                            <Badge variant="outline">Inactiva</Badge>
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
                                onClick={() => navigate(`/grelhas-curriculares/${row.id}`)}
                              >
                                <BookOpen className="mr-2 h-4 w-4" />
                                Gerir disciplinas
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  if (!isOpen) toggle(row.id)
                                  setAssociarTo(row)
                                }}
                              >
                                <Calendar className="mr-2 h-4 w-4" />
                                Associar ano académico
                              </DropdownMenuItem>
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
                      {isOpen && (
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={5} className="p-0">
                            <GCAAPanel
                              grelha={row}
                              onAssociar={() => setAssociarTo(row)}
                              onGerar={(g) => setConfirmGerar({ grelha: row, gcaa: g })}
                              onRemover={(g) => setConfirmRemoverAno({ grelha: row, gcaa: g })}
                              isGerando={(gcaaId) =>
                                gerarTurmasMutation.isPending &&
                                gerarTurmasMutation.variables?.gcaaId === gcaaId
                              }
                            />
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

      <GrelhaFormDialog open={formOpen} onOpenChange={setFormOpen} grelha={editing} />

      {associarTo && (
        <AssociarAnoDialog
          grelha={associarTo}
          open={!!associarTo}
          onOpenChange={(o) => !o && setAssociarTo(null)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['grelha-gcaa', associarTo.id] })
            setAssociarTo(null)
          }}
        />
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="Eliminar grelha curricular"
        description={`Tem a certeza que pretende eliminar a grelha "${confirmDelete?.nome}"?`}
        confirmLabel="Eliminar"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)}
      />

      <ConfirmDialog
        open={!!confirmGerar}
        onOpenChange={(open) => !open && setConfirmGerar(null)}
        title="Gerar turmas"
        description={
          confirmGerar
            ? `Vão ser criadas turmas para cada combinação (disciplina × turno) da grelha "${confirmGerar.grelha.nome}" no ano ${confirmGerar.gcaa.ano_academico?.ano}. As que já existirem serão ignoradas.`
            : ''
        }
        confirmLabel="Gerar"
        isLoading={gerarTurmasMutation.isPending}
        onConfirm={() =>
          confirmGerar &&
          gerarTurmasMutation.mutate({
            grelhaId: confirmGerar.grelha.id,
            gcaaId: confirmGerar.gcaa.id,
          })
        }
      />

      <ConfirmDialog
        open={!!confirmRemoverAno}
        onOpenChange={(open) => !open && setConfirmRemoverAno(null)}
        title="Remover ano académico"
        description={
          confirmRemoverAno
            ? `Pretende desassociar o ano ${confirmRemoverAno.gcaa.ano_academico?.ano} da grelha "${confirmRemoverAno.grelha.nome}"?`
            : ''
        }
        confirmLabel="Remover"
        variant="destructive"
        isLoading={removerAnoMutation.isPending}
        onConfirm={() =>
          confirmRemoverAno &&
          removerAnoMutation.mutate({
            grelhaId: confirmRemoverAno.grelha.id,
            gcaaId: confirmRemoverAno.gcaa.id,
          })
        }
      />
    </div>
  )
}

// ============================================================
// Painel expandido — lista de GCAAs com acções
// ============================================================

function GCAAPanel({
  grelha,
  onAssociar,
  onGerar,
  onRemover,
  isGerando,
}: {
  grelha: GrelhaCurricular
  onAssociar: () => void
  onGerar: (g: GCAA) => void
  onRemover: (g: GCAA) => void
  isGerando: (gcaaId: number) => boolean
}) {
  const query = useQuery({
    queryKey: ['grelha-gcaa', grelha.id],
    queryFn: () => fetchGCAAs(grelha.id),
  })

  const items = query.data ?? []

  return (
    <div className="p-4 border-t">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted-foreground" />
          Anos académicos com esta grelha
          <Badge variant="outline" className="ml-1">
            {items.length}
          </Badge>
        </h4>
        <Button type="button" variant="outline" size="sm" onClick={onAssociar}>
          <Plus className="mr-2 h-4 w-4" />
          Associar ano
        </Button>
      </div>

      {query.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-sm text-muted-foreground py-6 text-center border rounded-md bg-background">
          Esta grelha ainda não está associada a nenhum ano académico. Clique em <strong>Associar ano</strong> acima.
        </div>
      ) : (
        <div className="rounded-md border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ano académico</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-center">Turmas geradas</TableHead>
                <TableHead className="text-right w-72">Acções</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items
                .slice()
                .sort((a, b) => (b.ano_academico?.ano ?? 0) - (a.ano_academico?.ano ?? 0))
                .map((g) => (
                  <TableRow key={g.id}>
                    <TableCell>
                      <span className="font-mono font-medium">
                        {g.ano_academico?.ano ?? `#${g.ano_academico_id}`}
                      </span>
                    </TableCell>
                    <TableCell>
                      {g.fechado ? (
                        <Badge variant="secondary" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Fechado
                        </Badge>
                      ) : g.activo ? (
                        <Badge className="bg-emerald-600 hover:bg-emerald-600">Activo</Badge>
                      ) : (
                        <Badge variant="outline">Inactivo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={g.turmas_geradas > 0 ? 'default' : 'outline'}>
                        {g.turmas_geradas}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 text-xs"
                          disabled={isGerando(g.id) || g.fechado}
                          onClick={() => onGerar(g)}
                          title={
                            g.fechado
                              ? 'Ano académico fechado — não é possível gerar turmas'
                              : 'Gerar turmas para todas as disciplinas × turnos'
                          }
                        >
                          {isGerando(g.id) ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <Sparkles className="mr-1 h-3 w-3" />
                          )}
                          Gerar turmas
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => onRemover(g)}
                          title="Desassociar ano"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Dialog: associar ano académico a uma grelha
// ============================================================

function AssociarAnoDialog({
  grelha,
  open,
  onOpenChange,
  onSaved,
}: {
  grelha: GrelhaCurricular
  open: boolean
  onOpenChange: (v: boolean) => void
  onSaved: () => void
}) {
  const [anoId, setAnoId] = useState<number>(0)
  const anosQuery = useAnosAcademicosLookup(open)

  const mutation = useMutation({
    mutationFn: async () => {
      await api.post(`/grelhas-curriculares/${grelha.id}/anos-academicos`, {
        ano_academico_id: anoId,
        activo: true,
      })
    },
    onSuccess: () => {
      toast.success('Ano académico associado à grelha')
      onSaved()
    },
    onError: (e: AxiosError<{ message?: string }>) => {
      toast.error(
        typeof e.response?.data?.message === 'string'
          ? e.response.data.message
          : 'Não foi possível associar',
      )
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Associar ano académico</DialogTitle>
          <DialogDescription>Grelha: {grelha.nome}</DialogDescription>
        </DialogHeader>
        <div>
          <Label className="text-sm">Ano académico</Label>
          <Select onValueChange={(v) => setAnoId(Number(v))} value={anoId ? String(anoId) : ''}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Selecionar ano" />
            </SelectTrigger>
            <SelectContent>
              {anosQuery.data?.map((a) => (
                <SelectItem key={a.id} value={String(a.id)}>
                  {a.ano} {a.activo ? '· activo' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={!anoId || mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Associar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Dialog: criar / editar grelha (mantido)
// ============================================================

function GrelhaFormDialog({
  open,
  onOpenChange,
  grelha,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  grelha: GrelhaCurricular | null
}) {
  const isEdit = !!grelha
  const cursosQuery = useQuery({
    queryKey: ['cursos-lookup'],
    queryFn: listCursos,
    enabled: open,
    staleTime: 5 * 60 * 1000,
  })

  const defaults: FormValues = {
    curso: grelha?.curso_id != null ? Number(grelha.curso_id) : 0,
    nome: grelha?.nome ?? '',
    descricao: grelha?.descricao ?? '',
    fechado: !!grelha?.fechado,
    activo: grelha?.activo ?? true,
  }

  return (
    <SimpleFormDialog<FormValues>
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Editar grelha curricular' : 'Nova grelha curricular'}
      defaultValues={defaults}
      resolver={zodResolver(schema)}
      isEdit={isEdit}
      invalidateKey="grelhas-curriculares"
      submitFn={(v) => (isEdit ? client.update(grelha!.id, v) : client.create(v))}
    >
      {(form: ReturnType<typeof useForm<FormValues>>) => (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="curso"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Curso</FormLabel>
                <Select
                  onValueChange={(v) => field.onChange(Number(v))}
                  value={field.value ? String(field.value) : ''}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar curso" />
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
            name="nome"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
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
            name="descricao"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Descrição</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="activo"
            render={({ field }) => (
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
          <FormField
            control={form.control}
            name="fechado"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fechada?</FormLabel>
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
                    <SelectItem value="false">Não</SelectItem>
                    <SelectItem value="true">Sim</SelectItem>
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
