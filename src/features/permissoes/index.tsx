import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AxiosError } from 'axios'
import { Loader2, Settings } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { createCrudClient } from '@/lib/crud'
import {
  SimpleCrudPage,
  type ColumnDef,
} from '@/components/shared/SimpleCrudPage'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'

export { PerfilDetailsPage } from './PerfilDetailsPage'

type Role = {
  id: number
  name: string
  guard_name: string
  permissions_count?: number
  users_count?: number
  permissions: string[]
}

const client = createCrudClient<Role, { name: string }>('roles')

const roleSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
})
type RoleFormValues = z.infer<typeof roleSchema>

export function PermissoesPage() {
  const navigate = useNavigate()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Role | null>(null)

  const columns: ColumnDef<Role>[] = [
    {
      header: 'Nome',
      cell: (r) => (
        <button
          onClick={() => navigate(`/perfis/${r.id}`)}
          className="font-medium hover:underline text-left"
        >
          {r.name}
        </button>
      ),
    },
    {
      header: 'Permissões',
      cell: (r) => (
        <Badge variant="outline">{r.permissions_count ?? r.permissions?.length ?? 0}</Badge>
      ),
    },
    {
      header: 'Utilizadores',
      cell: (r) => (
        <Badge variant="secondary">{r.users_count ?? 0}</Badge>
      ),
    },
  ]

  return (
    <>
      <SimpleCrudPage<Role>
        title="Perfis e Permissões"
        description="Gerir perfis (roles) e permissões atribuídas"
        queryKey="roles"
        searchPlaceholder="Pesquisar perfil..."
        listFn={(params) => client.list(params)}
        deleteFn={client.remove}
        getRowId={(r) => r.id}
        getDeleteLabel={(r) => r.name}
        columns={columns}
        newLabel="Novo perfil"
        onNew={() => {
          setEditing(null)
          setFormOpen(true)
        }}
        onEdit={(r) => {
          setEditing(r)
          setFormOpen(true)
        }}
        extraActions={(row) => (
          <DropdownMenuItem onClick={() => navigate(`/perfis/${row.id}`)}>
            <Settings className="mr-2 h-4 w-4" />
            Gerir perfil
          </DropdownMenuItem>
        )}
      />

      <RoleFormDialog open={formOpen} onOpenChange={setFormOpen} role={editing} />
    </>
  )
}

function RoleFormDialog({
  open,
  onOpenChange,
  role,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  role: Role | null
}) {
  const queryClient = useQueryClient()
  const isEdit = !!role

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: { name: role?.name ?? '' },
  })

  const mutation = useMutation({
    mutationFn: (v: RoleFormValues) =>
      isEdit ? client.update(role!.id, v) : client.create(v),
    onSuccess: () => {
      toast.success(isEdit ? 'Perfil actualizado' : 'Perfil criado')
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      onOpenChange(false)
      form.reset({ name: '' })
    },
    onError: (e: AxiosError<{ message?: unknown; errors?: Record<string, string[]> }>) => {
      const errors = e.response?.data?.errors
      if (errors) {
        Object.entries(errors).forEach(([field, msgs]) => {
          if (Array.isArray(msgs)) form.setError(field as keyof RoleFormValues, { message: msgs[0] })
        })
        return
      }
      const m = e.response?.data?.message
      toast.error(typeof m === 'string' ? m : 'Erro ao gravar')
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar perfil' : 'Novo perfil'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="ex: secretaria" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={mutation.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? 'Guardar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
