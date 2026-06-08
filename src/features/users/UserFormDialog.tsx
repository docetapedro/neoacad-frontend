import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { AxiosError } from 'axios'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { createUser, updateUser } from './api'
import type { UserRow } from './types'

type Perfil = 'utilizador' | 'docente' | 'administrador' | 'superadministrador'

const PERFIL_OPTIONS: { value: Perfil; label: string; short: string; description: string }[] = [
  {
    value: 'utilizador',
    label: 'Utilizador',
    short: 'Utilizador',
    description: 'Conta básica sem permissões administrativas.',
  },
  {
    value: 'docente',
    label: 'Docente',
    short: 'Docente',
    description: 'Aparece na listagem de Docentes e pode lançar notas.',
  },
  {
    value: 'administrador',
    label: 'Administrador',
    short: 'Admin',
    description: 'Gestão de utilizadores e operações gerais.',
  },
  {
    value: 'superadministrador',
    label: 'Super-administrador',
    short: 'Super-admin',
    description: 'Acesso total ao sistema, incluindo configurações sensíveis.',
  },
]

function buildSchema(isEdit: boolean) {
  return z.object({
    name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
    username: z.string().min(3, 'Username deve ter pelo menos 3 caracteres'),
    email: z.string().email('Email inválido'),
    password: isEdit
      ? z.string().optional()
      : z.string().min(8, 'Palavra-passe deve ter pelo menos 8 caracteres'),
    telefone: z.string().optional(),
    activo: z.boolean().optional(),
    perfil: z.enum(['utilizador', 'docente', 'administrador', 'superadministrador']),
  })
}

type FormValues = {
  name: string
  username: string
  email: string
  password?: string
  telefone?: string
  activo?: boolean
  perfil: Perfil
}

function inferirPerfil(user?: UserRow | null): Perfil {
  if (!user) return 'utilizador'
  if (user.superadministrador) return 'superadministrador'
  if (user.administrador) return 'administrador'
  if (user.docente) return 'docente'
  return 'utilizador'
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  user?: UserRow | null
}

export function UserFormDialog({ open, onOpenChange, user }: Props) {
  const queryClient = useQueryClient()
  const isEdit = !!user

  const form = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(buildSchema(isEdit)) as any,
    defaultValues: {
      name: '',
      username: '',
      email: '',
      password: '',
      telefone: '',
      activo: true,
      perfil: 'utilizador',
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        name: user?.name ?? '',
        username: user?.username ?? '',
        email: user?.email ?? '',
        password: '',
        telefone: '',
        activo: user?.activo ?? true,
        perfil: inferirPerfil(user),
      })
    }
  }, [open, user, form])

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      // Perfis são mutuamente exclusivos — converter `perfil` em 3 flags '0'/'1'.
      const { perfil, ...rest } = values
      const payload = {
        ...rest,
        activo: (values.activo ? '1' : '0') as '0' | '1',
        superadministrador: (perfil === 'superadministrador' ? '1' : '0') as '0' | '1',
        administrador: (perfil === 'administrador' ? '1' : '0') as '0' | '1',
        docente: (perfil === 'docente' ? '1' : '0') as '0' | '1',
        password: isEdit && !values.password ? undefined : values.password,
      }
      return isEdit ? updateUser(user!.id, payload) : createUser(payload)
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Utilizador actualizado' : 'Utilizador criado')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      onOpenChange(false)
    },
    onError: (error: unknown) => {
      // Erros Axios (HTTP)
      if (error && typeof error === 'object' && 'isAxiosError' in error) {
        const axErr = error as AxiosError<{ message?: unknown; errors?: Record<string, string[]> }>
        const errors = axErr.response?.data?.errors
        if (errors && typeof errors === 'object') {
          Object.entries(errors).forEach(([field, messages]) => {
            if (Array.isArray(messages) && messages.length) {
              form.setError(field as keyof FormValues, { message: messages[0] })
            }
          })
          toast.error(
            typeof axErr.response?.data?.message === 'string'
              ? axErr.response.data.message
              : 'Erro(s) de validação',
          )
          return
        }
        const msg = axErr.response?.data?.message
        toast.error(typeof msg === 'string' ? msg : axErr.message || 'Erro ao gravar utilizador')
        return
      }
      // Qualquer outro Error (ex.: rede caiu, JS error...)
      toast.error(error instanceof Error ? error.message : 'Erro ao gravar utilizador')
      console.error('[UserFormDialog] erro não-axios:', error)
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar utilizador' : 'Novo utilizador'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Actualizar dados do utilizador'
              : 'Criar uma nova conta de utilizador no sistema'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome completo</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input {...field} autoComplete="off" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Palavra-passe{' '}
                      {isEdit && (
                        <span className="text-xs text-muted-foreground">
                          (em branco = manter)
                        </span>
                      )}
                    </FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="telefone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input type="tel" autoComplete="tel" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-3 rounded-md border p-3">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium">Estado e perfil de acesso</p>
                <FormField
                  control={form.control}
                  name="activo"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormLabel className="text-xs text-muted-foreground">Activo</FormLabel>
                      <FormControl>
                        <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="perfil"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="flex flex-wrap gap-1.5"
                      >
                        {PERFIL_OPTIONS.map((opt) => (
                          <Tooltip key={opt.value}>
                            <TooltipTrigger asChild>
                              <label
                                htmlFor={`perfil-${opt.value}`}
                                className="flex items-center gap-2 rounded-md border px-3 py-1.5 cursor-pointer text-sm hover:bg-muted/50 has-[input:checked]:border-primary has-[input:checked]:bg-primary/10 has-[input:checked]:text-primary transition-colors"
                              >
                                <RadioGroupItem
                                  value={opt.value}
                                  id={`perfil-${opt.value}`}
                                  className="h-3.5 w-3.5"
                                />
                                <span className="font-medium leading-none">{opt.short}</span>
                              </label>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="max-w-[220px]">
                                <p className="font-medium">{opt.label}</p>
                                <p className="text-xs opacity-80 mt-0.5">{opt.description}</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                {isEdit ? 'Guardar alterações' : 'Criar utilizador'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
