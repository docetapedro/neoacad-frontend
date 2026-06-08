import { useEffect, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MoreHorizontal, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { ConfirmDialog } from './ConfirmDialog'
import { DataTablePagination } from './DataTablePagination'
import { PageHeader } from './PageHeader'
import type { Paginated } from '@/lib/api'

export type ColumnDef<T> = {
  header: string
  cell: (row: T) => ReactNode
  className?: string
}

type Props<T> = {
  title: string
  description?: string
  queryKey: string
  searchKey?: string
  searchPlaceholder?: string
  listFn: (params: Record<string, unknown>) => Promise<Paginated<T>>
  deleteFn?: (id: number) => Promise<void>
  getRowId: (row: T) => number
  getDeleteLabel: (row: T) => string
  columns: ColumnDef<T>[]
  newLabel?: string
  onNew: () => void
  onEdit: (row: T) => void
  extraActions?: (row: T) => ReactNode
  /** Filtros adicionais enviados ao listFn (e.g. { genero: 'M' }). Undefined ignora. */
  extraFilters?: Record<string, unknown>
  /** Componentes de UI dos filtros extra, renderizados ao lado da pesquisa. */
  filterBar?: ReactNode
}

export function SimpleCrudPage<T>({
  title,
  description,
  queryKey,
  searchKey = 'nome',
  searchPlaceholder = 'Pesquisar...',
  listFn,
  deleteFn,
  getRowId,
  getDeleteLabel,
  columns,
  newLabel = 'Novo',
  onNew,
  onEdit,
  extraActions,
  extraFilters,
  filterBar,
}: Props<T>) {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<T | null>(null)

  // Reset page when filters change
  const filtersKey = JSON.stringify(extraFilters ?? {})
  useEffect(() => {
    setPage(1)
  }, [filtersKey])

  const query = useQuery({
    queryKey: [queryKey, { page, search, extraFilters }],
    queryFn: () =>
      listFn({
        page,
        [searchKey]: search || undefined,
        ...(extraFilters ?? {}),
      }),
    placeholderData: (prev) => prev,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => (deleteFn ? deleteFn(id) : Promise.resolve()),
    onSuccess: () => {
      toast.success('Registo eliminado')
      queryClient.invalidateQueries({ queryKey: [queryKey] })
      setConfirmDelete(null)
    },
    onError: () => toast.error('Não foi possível eliminar'),
  })

  const items = query.data?.items ?? []
  const pag = query.data?.paginacao

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        actions={
          <Button onClick={onNew}>
            <Plus className="mr-2 h-4 w-4" />
            {newLabel}
          </Button>
        }
      />

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-4 flex-wrap">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              className="pl-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
          </div>
          {filterBar}
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((c) => (
                  <TableHead key={c.header} className={c.className}>
                    {c.header}
                  </TableHead>
                ))}
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {columns.map((c) => (
                      <TableCell key={c.header}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                    <TableCell>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length + 1}
                    className="text-center text-muted-foreground py-10"
                  >
                    Sem resultados
                  </TableCell>
                </TableRow>
              ) : (
                items.map((row) => (
                  <TableRow key={getRowId(row)}>
                    {columns.map((c) => (
                      <TableCell key={c.header} className={c.className}>
                        {c.cell(row)}
                      </TableCell>
                    ))}
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(row)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          {extraActions?.(row)}
                          {deleteFn && (
                            <DropdownMenuItem
                              onClick={() => setConfirmDelete(row)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          )}
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

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="Eliminar registo"
        description={`Tem a certeza que pretende eliminar "${
          confirmDelete ? getDeleteLabel(confirmDelete) : ''
        }"? Esta acção não pode ser revertida.`}
        confirmLabel="Eliminar"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => confirmDelete && deleteMutation.mutate(getRowId(confirmDelete))}
      />
    </div>
  )
}
