import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { ArrowLeft, Loader2, Pencil, Search, ShieldCheck, Trash2, UserPlus, Users } from 'lucide-react'
import { toast } from 'sonner'

function extractErrorMessage(e: unknown, fallback: string): string {
  if (e instanceof AxiosError) {
    const data = e.response?.data as { message?: unknown; errors?: Record<string, string[]> } | undefined
    if (data?.errors) {
      const first = Object.values(data.errors)[0]
      if (Array.isArray(first) && first[0]) return first[0]
    }
    if (typeof data?.message === 'string' && data.message) return data.message
  }
  return fallback
}
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { PageHeader } from '@/components/shared/PageHeader'
import { api, type ApiResponse, type Paginated } from '@/lib/api'

type Role = {
  id: number
  name: string
  guard_name: string
  users_count?: number
  permissions: string[]
}

type RoleUser = {
  id: number
  name: string
  email: string | null
  username: string | null
  activo: number
}

type PermissoesAgrupadas = Record<string, string[]>

async function fetchRole(id: number): Promise<Role> {
  const { data } = await api.get<ApiResponse<Role>>(`/roles/${id}`)
  return data.dados as Role
}

async function fetchPermissoesAgrupadas(): Promise<PermissoesAgrupadas> {
  const { data } = await api.get<ApiResponse<PermissoesAgrupadas>>('/permissoes', {
    params: { agrupado: 1 },
  })
  return (data.dados ?? {}) as PermissoesAgrupadas
}

async function fetchRoleUsers(
  roleId: number,
  params: { searchTerm?: string; pagina_actual?: number; quantidade?: number },
): Promise<Paginated<RoleUser>> {
  const { data } = await api.get<ApiResponse<Paginated<RoleUser>>>(`/roles/${roleId}/users`, {
    params: { ...params, page: params.pagina_actual },
  })
  return data.dados as Paginated<RoleUser>
}

async function syncRolePermissions(roleId: number, permissions: string[]): Promise<void> {
  await api.put(`/roles/${roleId}/permissions`, { permissions })
}

async function updateRoleName(roleId: number, name: string): Promise<void> {
  await api.put(`/roles/${roleId}`, { name })
}

async function attachUsers(roleId: number, userIds: number[]): Promise<void> {
  await api.post(`/roles/${roleId}/users`, { user_ids: userIds })
}

async function detachUser(roleId: number, userId: number): Promise<void> {
  await api.delete(`/roles/${roleId}/users/${userId}`)
}

const CATEGORIA_LABEL: Record<string, string> = {
  lista: 'Listas',
  ver: 'Visualizar',
  registar: 'Registar',
  editar: 'Editar',
  eliminar: 'Eliminar',
  outros: 'Outros',
}

export function PerfilDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const roleId = Number(id)

  const roleQuery = useQuery({
    queryKey: ['role', roleId],
    queryFn: () => fetchRole(roleId),
    enabled: !!roleId,
  })

  if (roleQuery.isLoading) return <DetailsSkeleton />
  if (!roleQuery.data) {
    return (
      <div>
        <Button variant="ghost" onClick={() => navigate('/permissoes')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar aos perfis
        </Button>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Perfil não encontrado
          </CardContent>
        </Card>
      </div>
    )
  }

  const role = roleQuery.data

  const invalidateRole = () => {
    queryClient.invalidateQueries({ queryKey: ['role', roleId] })
    queryClient.invalidateQueries({ queryKey: ['roles'] })
  }

  return (
    <div>
      <Button variant="ghost" onClick={() => navigate('/permissoes')} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar aos perfis
      </Button>

      <PageHeader
        title={role.name}
        description={`Guard: ${role.guard_name} • ${role.permissions?.length ?? 0} permissões • ${role.users_count ?? 0} utilizadores`}
        actions={<EditNomeButton role={role} onSaved={invalidateRole} />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PermissoesSection role={role} onSaved={invalidateRole} />
        </div>
        <div className="lg:col-span-1">
          <UtilizadoresSection role={role} onChanged={invalidateRole} />
        </div>
      </div>
    </div>
  )
}

function EditNomeButton({ role, onSaved }: { role: Role; onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const [nome, setNome] = useState(role.name)

  const mutation = useMutation({
    mutationFn: () => updateRoleName(role.id, nome.trim()),
    onSuccess: () => {
      toast.success('Nome do perfil actualizado')
      onSaved()
      setOpen(false)
    },
    onError: (e) => toast.error(extractErrorMessage(e, 'Não foi possível actualizar o nome')),
  })

  return (
    <>
      <Button variant="outline" onClick={() => { setNome(role.name); setOpen(true) }}>
        <Pencil className="mr-2 h-4 w-4" />
        Renomear
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear perfil</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome</label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={mutation.isPending}>
              Cancelar
            </Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || nome.trim().length < 2 || nome === role.name}
            >
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function PermissoesSection({ role, onSaved }: { role: Role; onSaved: () => void }) {
  const [filtro, setFiltro] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set(role.permissions ?? []))
  const [confirmSave, setConfirmSave] = useState(false)

  const permsQuery = useQuery({
    queryKey: ['permissoes-agrupadas'],
    queryFn: fetchPermissoesAgrupadas,
    staleTime: 10 * 60 * 1000,
  })

  const mutation = useMutation({
    mutationFn: () => syncRolePermissions(role.id, Array.from(selected)),
    onSuccess: () => {
      toast.success('Permissões actualizadas')
      onSaved()
      setConfirmSave(false)
    },
    onError: (e) => toast.error(extractErrorMessage(e, 'Não foi possível guardar')),
  })

  const toggle = (perm: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(perm)) next.delete(perm)
      else next.add(perm)
      return next
    })
  }

  const filtroLower = filtro.trim().toLowerCase()
  const grupos = useMemo(() => {
    const data = permsQuery.data ?? {}
    return Object.entries(data).map(([cat, items]) => ({
      cat,
      label: CATEGORIA_LABEL[cat] ?? cat,
      items: filtroLower ? items.filter((p) => p.toLowerCase().includes(filtroLower)) : items,
    })).filter((g) => g.items.length > 0)
  }, [permsQuery.data, filtroLower])

  const totalVisible = grupos.reduce((acc, g) => acc + g.items.length, 0)

  const toggleGrupo = (items: string[], allSelected: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allSelected) items.forEach((i) => next.delete(i))
      else items.forEach((i) => next.add(i))
      return next
    })
  }

  const dirty = useMemo(() => {
    const original = new Set(role.permissions ?? [])
    if (original.size !== selected.size) return true
    for (const p of selected) if (!original.has(p)) return true
    return false
  }, [role.permissions, selected])

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Permissões
              </CardTitle>
              <CardDescription>
                {selected.size} seleccionada{selected.size === 1 ? '' : 's'}
                {filtroLower && ` • ${totalVisible} visível${totalVisible === 1 ? '' : 'is'} (filtro: "${filtro}")`}
              </CardDescription>
            </div>
            <Button
              onClick={() => setConfirmSave(true)}
              disabled={!dirty || mutation.isPending}
            >
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar permissões
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="Filtrar permissões..."
              className="pl-9"
            />
          </div>

          {permsQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : grupos.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-10">
              Nenhuma permissão corresponde ao filtro.
            </div>
          ) : (
            grupos.map((g) => {
              const allSelected = g.items.every((p) => selected.has(p))
              return (
                <div key={g.cat} className="rounded-md border">
                  <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{g.label}</span>
                      <Badge variant="outline" className="text-xs">{g.items.length}</Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleGrupo(g.items, allSelected)}
                    >
                      {allSelected ? 'Desmarcar grupo' : 'Marcar grupo'}
                    </Button>
                  </div>
                  <div className="p-2 grid grid-cols-1 md:grid-cols-2 gap-1">
                    {g.items.map((perm) => (
                      <label
                        key={perm}
                        className="flex items-center gap-2 text-sm cursor-pointer rounded-md px-2 py-1.5 hover:bg-muted"
                      >
                        <Checkbox
                          checked={selected.has(perm)}
                          onCheckedChange={() => toggle(perm)}
                        />
                        <span>{perm}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmSave}
        onOpenChange={setConfirmSave}
        title="Confirmar alterações"
        description={`Vai gravar ${selected.size} permissões no perfil "${role.name}".`}
        confirmLabel="Gravar"
        isLoading={mutation.isPending}
        onConfirm={() => mutation.mutate()}
      />
    </>
  )
}

function UtilizadoresSection({ role, onChanged }: { role: Role; onChanged: () => void }) {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState<RoleUser | null>(null)

  const usersQuery = useQuery({
    queryKey: ['role', role.id, 'users', searchTerm],
    queryFn: () => fetchRoleUsers(role.id, { searchTerm, quantidade: 20 }),
  })

  const removeMutation = useMutation({
    mutationFn: (userId: number) => detachUser(role.id, userId),
    onSuccess: () => {
      toast.success('Utilizador removido do perfil')
      queryClient.invalidateQueries({ queryKey: ['role', role.id, 'users'] })
      onChanged()
      setConfirmRemove(null)
    },
    onError: (e) => toast.error(extractErrorMessage(e, 'Não foi possível remover')),
  })

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Utilizadores
              </CardTitle>
              <CardDescription>
                {usersQuery.data?.paginacao.total ?? 0} associado{(usersQuery.data?.paginacao.total ?? 0) === 1 ? '' : 's'}
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => setPickerOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar utilizador..."
              className="pl-9"
            />
          </div>

          {usersQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (usersQuery.data?.items.length ?? 0) === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-10">
              Nenhum utilizador associado.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersQuery.data!.items.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="font-medium">{u.name}</div>
                      <div className="text-xs text-muted-foreground">{u.email ?? u.username}</div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setConfirmRemove(u)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {pickerOpen && (
        <UserPickerDialog
          roleId={role.id}
          roleName={role.name}
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          onAdded={() => {
            queryClient.invalidateQueries({ queryKey: ['role', role.id, 'users'] })
            onChanged()
          }}
        />
      )}

      {confirmRemove && (
        <ConfirmDialog
          open={!!confirmRemove}
          onOpenChange={(o) => !o && setConfirmRemove(null)}
          title="Remover utilizador do perfil"
          description={`Vai remover "${confirmRemove.name}" do perfil "${role.name}".`}
          confirmLabel="Remover"
          isLoading={removeMutation.isPending}
          onConfirm={() => removeMutation.mutate(confirmRemove.id)}
        />
      )}
    </>
  )
}

type SimpleUser = { id: number; name: string; email: string | null; username: string | null }

async function searchUsers(searchTerm: string): Promise<SimpleUser[]> {
  const { data } = await api.get<ApiResponse<Paginated<SimpleUser>>>('/users', {
    params: { searchTerm, quantidade: 50 },
  })
  return data.dados?.items ?? []
}

function UserPickerDialog({
  roleId,
  roleName,
  open,
  onOpenChange,
  onAdded,
}: {
  roleId: number
  roleName: string
  open: boolean
  onOpenChange: (v: boolean) => void
  onAdded: () => void
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const query = useQuery({
    queryKey: ['users-picker', searchTerm],
    queryFn: () => searchUsers(searchTerm),
  })

  const mutation = useMutation({
    mutationFn: () => attachUsers(roleId, Array.from(selected)),
    onSuccess: () => {
      toast.success(`${selected.size} utilizador(es) associado(s) ao perfil`)
      setSelected(new Set())
      onAdded()
      onOpenChange(false)
    },
    onError: (e) => toast.error(extractErrorMessage(e, 'Não foi possível associar')),
  })

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Associar utilizadores a "{roleName}"</DialogTitle>
          <DialogDescription>
            Marque os utilizadores que devem ter este perfil. {selected.size} seleccionado{selected.size === 1 ? '' : 's'}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar utilizador..."
              className="pl-9"
              autoFocus
            />
          </div>

          <div className="max-h-80 overflow-y-auto rounded-md border">
            {query.isLoading ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : (query.data?.length ?? 0) === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-10">
                Sem resultados.
              </div>
            ) : (
              query.data!.map((u) => (
                <label
                  key={u.id}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-muted cursor-pointer border-b last:border-b-0"
                >
                  <Checkbox
                    checked={selected.has(u.id)}
                    onCheckedChange={() => toggle(u.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{u.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{u.email ?? u.username}</div>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || selected.size === 0}
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Adicionar {selected.size > 0 ? `(${selected.size})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DetailsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-32" />
      <Skeleton className="h-12 w-64" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2"><Skeleton className="h-96 w-full" /></div>
        <div className="lg:col-span-1"><Skeleton className="h-96 w-full" /></div>
      </div>
    </div>
  )
}
