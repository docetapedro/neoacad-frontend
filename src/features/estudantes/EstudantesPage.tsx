import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, MoreHorizontal, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
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
import { deleteEstudante, listEstudantes } from './api'
import { EstudanteFormDialog } from './EstudanteFormDialog'
import type { EstudanteRow } from './types'

const TODOS = '__all__'

const ESTADO_CIVIL_OPTIONS = [
  { value: 'Solteiro', label: 'Solteiro(a)' },
  { value: 'Casado', label: 'Casado(a)' },
  { value: 'Divorciado', label: 'Divorciado(a)' },
  { value: 'Viuvo', label: 'Viúvo(a)' },
  { value: 'Uniao de Facto', label: 'União de Facto' },
]

export function EstudantesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [genero, setGenero] = useState<string>(TODOS)
  const [estadoCivil, setEstadoCivil] = useState<string>(TODOS)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<EstudanteRow | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<EstudanteRow | null>(null)

  const query = useQuery({
    queryKey: ['estudantes', { page, search, genero, estadoCivil }],
    queryFn: () =>
      listEstudantes({
        page,
        num_processo: search || undefined,
        genero: genero === TODOS ? undefined : genero,
        estado_civil: estadoCivil === TODOS ? undefined : estadoCivil,
      }),
    placeholderData: (prev) => prev,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteEstudante(id),
    onSuccess: () => {
      toast.success('Estudante eliminado')
      queryClient.invalidateQueries({ queryKey: ['estudantes'] })
      setConfirmDelete(null)
    },
    onError: () => toast.error('Não foi possível eliminar o estudante'),
  })

  const items = query.data?.items ?? []
  const pag = query.data?.paginacao

  return (
    <div>
      <PageHeader
        title="Estudantes"
        description="Gestão dos estudantes inscritos na instituição"
        actions={
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo estudante
          </Button>
        }
      />

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-4">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por nº processo..."
              className="pl-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
          </div>

          <Select
            value={genero}
            onValueChange={(v) => {
              setGenero(v)
              setPage(1)
            }}
          >
            <SelectTrigger className="sm:w-44">
              <SelectValue placeholder="Género" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos os géneros</SelectItem>
              <SelectItem value="M">Masculino</SelectItem>
              <SelectItem value="F">Feminino</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={estadoCivil}
            onValueChange={(v) => {
              setEstadoCivil(v)
              setPage(1)
            }}
          >
            <SelectTrigger className="sm:w-56">
              <SelectValue placeholder="Estado civil" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos os estados civis</SelectItem>
              {ESTADO_CIVIL_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº Processo</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>BI</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Género</TableHead>
                <TableHead>País</TableHead>
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
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                    Sem resultados
                  </TableCell>
                </TableRow>
              ) : (
                items.map((est) => (
                  <TableRow key={est.id}>
                    <TableCell className="font-mono text-sm">{est.num_processo}</TableCell>
                    <TableCell className="font-medium">{est.user?.name ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{est.num_bi ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{est.contactos ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {est.genero === 'M' ? 'Masculino' : est.genero === 'F' ? 'Feminino' : '—'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {est.pais?.nome ?? '—'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/estudantes/${est.id}`)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setEditing(est)
                              setFormOpen(true)
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setConfirmDelete(est)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
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

      <EstudanteFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        estudante={editing}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="Eliminar estudante"
        description={`Tem a certeza que pretende eliminar o estudante ${confirmDelete?.user?.name ?? confirmDelete?.num_processo}?`}
        confirmLabel="Eliminar"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)}
      />
    </div>
  )
}
