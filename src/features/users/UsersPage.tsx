import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MoreHorizontal, Pencil, Plus, Search, Trash2, UserCheck, UserX, X } from 'lucide-react'
import { toast } from 'sonner'
import { api, type ApiResponse, type Paginated } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { Card } from '@/components/ui/card'
import { deleteUser, listUsers, restoreUser, suspendUser } from './api'
import { UserFormDialog } from './UserFormDialog'
import type { UserRow } from './types'

type RoleLite = { id: number; name: string }

async function fetchRoles(): Promise<RoleLite[]> {
  const { data } = await api.get<ApiResponse<Paginated<RoleLite>>>('/roles', {
    params: { quantidade: 100 },
  })
  return data.dados?.items ?? []
}

type Tipo = '' | 'admin' | 'docente' | 'estudante'
type Estado = '' | 'activo' | 'inactivo' | 'suspenso'

export function UsersPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [tipo, setTipo] = useState<Tipo>('')
  const [estado, setEstado] = useState<Estado>('')
  const [role, setRole] = useState<string>('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<UserRow | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<UserRow | null>(null)

  const rolesQuery = useQuery({
    queryKey: ['roles-lookup'],
    queryFn: fetchRoles,
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    setPage(1)
  }, [search, tipo, estado, role])

  const extraFilters: Record<string, unknown> = {
    administrador: tipo === 'admin' ? 1 : undefined,
    docente: tipo === 'docente' ? 1 : undefined,
    estudante: tipo === 'estudante' ? 1 : undefined,
    activo: estado === 'activo' ? 1 : estado === 'inactivo' ? 0 : undefined,
    suspenso: estado === 'suspenso' ? 1 : undefined,
    role: role || undefined,
  }

  const hasFilters = !!(search || tipo || estado || role)

  const query = useQuery({
    queryKey: ['users', { page, search, tipo, estado, role }],
    queryFn: () =>
      listUsers({
        page,
        searchTerm: search || undefined,
        ...extraFilters,
      }),
    placeholderData: (prev) => prev,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteUser(id),
    onSuccess: () => {
      toast.success('Utilizador eliminado')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setConfirmDelete(null)
    },
    onError: () => toast.error('Não foi possível eliminar o utilizador'),
  })

  const suspendMutation = useMutation({
    mutationFn: (id: number) => suspendUser(id),
    onSuccess: () => {
      toast.success('Utilizador suspenso')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: () => toast.error('Não foi possível suspender o utilizador'),
  })

  const restoreMutation = useMutation({
    mutationFn: (id: number) => restoreUser(id),
    onSuccess: () => {
      toast.success('Utilizador restaurado')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: () => toast.error('Não foi possível restaurar o utilizador'),
  })

  const handleCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const handleEdit = (user: UserRow) => {
    setEditing(user)
    setFormOpen(true)
  }

  const items = query.data?.items ?? []
  const pag = query.data?.paginacao

  return (
    <div>
      <PageHeader
        title="Utilizadores"
        description="Gerir contas com acesso ao sistema"
        actions={
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Novo utilizador
          </Button>
        }
      />

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4 flex-wrap">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar nome, username, email..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Select value={tipo} onValueChange={(v) => setTipo(v as Tipo)}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Administradores</SelectItem>
              <SelectItem value="docente">Docentes</SelectItem>
              <SelectItem value="estudante">Estudantes</SelectItem>
            </SelectContent>
          </Select>

          <Select value={estado} onValueChange={(v) => setEstado(v as Estado)}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="activo">Activo</SelectItem>
              <SelectItem value="inactivo">Inactivo</SelectItem>
              <SelectItem value="suspenso">Suspenso</SelectItem>
            </SelectContent>
          </Select>

          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Perfil (role)" />
            </SelectTrigger>
            <SelectContent>
              {rolesQuery.data?.map((r) => (
                <SelectItem key={r.id} value={r.name}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch('')
                setTipo('')
                setEstado('')
                setRole('')
              }}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Limpar
            </Button>
          )}
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                    Sem resultados
                  </TableCell>
                </TableRow>
              ) : (
                items.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-muted-foreground">{user.username}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      {user.superadministrador ? (
                        <Badge>Super Admin</Badge>
                      ) : user.administrador ? (
                        <Badge variant="secondary">Admin</Badge>
                      ) : user.docente ? (
                        <Badge variant="outline">Docente</Badge>
                      ) : (
                        <Badge variant="outline">Utilizador</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {!user.activo ? (
                        <Badge variant="destructive">Inactivo</Badge>
                      ) : user.suspended_at ? (
                        <Badge variant="destructive">Suspenso</Badge>
                      ) : (
                        <Badge className="bg-emerald-600 hover:bg-emerald-600">Activo</Badge>
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
                          <DropdownMenuItem onClick={() => handleEdit(user)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          {user.suspended_at ? (
                            <DropdownMenuItem
                              onClick={() => restoreMutation.mutate(user.id)}
                              disabled={restoreMutation.isPending}
                            >
                              <UserCheck className="mr-2 h-4 w-4" />
                              Restaurar
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => suspendMutation.mutate(user.id)}
                              disabled={suspendMutation.isPending}
                            >
                              <UserX className="mr-2 h-4 w-4" />
                              Suspender
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setConfirmDelete(user)}
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

      <UserFormDialog open={formOpen} onOpenChange={setFormOpen} user={editing} />

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="Eliminar utilizador"
        description={`Tem a certeza que pretende eliminar ${confirmDelete?.name}? Esta acção não pode ser revertida.`}
        confirmLabel="Eliminar"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)}
      />
    </div>
  )
}
