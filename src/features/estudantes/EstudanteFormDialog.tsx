import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { AxiosError } from 'axios'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/shared/DatePicker'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createEstudante, listPaises, updateEstudante } from './api'
import type { EstudanteRow } from './types'

const schema = z.object({
  nome: z.string().min(5, 'Nome deve ter pelo menos 5 caracteres'),
  email: z.string().email('Email inválido'),
  pais: z.number().int().positive('País é obrigatório'),
  genero: z.enum(['M', 'F']),
  estado_civil: z.string().min(1, 'Estado civil é obrigatório'),
  data_nascimento: z.string().min(1, 'Data de nascimento é obrigatória'),
  num_bi: z.string().min(1, 'BI é obrigatório'),
  nif: z.string().min(1, 'NIF é obrigatório'),
  email_faturacao: z.string().email('Email de faturação inválido'),
  telefone: z.string().min(1, 'Telefone é obrigatório'),
  telefone_faturacao: z.string().min(1, 'Telefone de faturação é obrigatório'),
  telefone_responsavel: z.string().min(1, 'Telefone do responsável é obrigatório'),
  nome_pai: z.string().min(1, 'Nome do pai é obrigatório'),
  nome_mae: z.string().min(1, 'Nome da mãe é obrigatório'),
  endereco: z.string().optional(),
  observacao: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  estudante?: EstudanteRow | null
}

const ESTADO_CIVIL_OPTIONS = [
  { value: 'Solteiro', label: 'Solteiro(a)' },
  { value: 'Casado', label: 'Casado(a)' },
  { value: 'Divorciado', label: 'Divorciado(a)' },
  { value: 'Viuvo', label: 'Viúvo(a)' },
  { value: 'Uniao de Facto', label: 'União de Facto' },
]

export function EstudanteFormDialog({ open, onOpenChange, estudante }: Props) {
  const queryClient = useQueryClient()
  const isEdit = !!estudante

  const paisesQuery = useQuery({
    queryKey: ['paises'],
    queryFn: listPaises,
    staleTime: 5 * 60 * 1000,
    enabled: open,
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues(),
  })

  useEffect(() => {
    if (open) {
      if (estudante) {
        form.reset({
          nome: estudante.user?.name ?? '',
          email: estudante.user?.email ?? '',
          pais: estudante.pais?.id ?? 0,
          genero: (estudante.genero ?? 'M') as 'M' | 'F',
          estado_civil: estudante.estado_civil ?? 'Solteiro',
          data_nascimento: parseDateToISO(estudante.data_nascimento),
          num_bi: estudante.num_bi ?? '',
          nif: estudante.nif ?? '',
          email_faturacao: estudante.email_faturacao ?? '',
          telefone: estudante.contactos ?? '',
          telefone_faturacao: estudante.telefone_faturacao ?? '',
          telefone_responsavel: estudante.telefone_responsavel ?? '',
          nome_pai: estudante.nome_pai ?? '',
          nome_mae: estudante.nome_mae ?? '',
          endereco: estudante.endereco ?? '',
          observacao: estudante.observacao ?? '',
        })
      } else {
        form.reset(emptyValues())
      }
    }
  }, [open, estudante, form])

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      isEdit ? updateEstudante(estudante!.id, values) : createEstudante(values),
    onSuccess: () => {
      toast.success(isEdit ? 'Estudante actualizado' : 'Estudante registado')
      queryClient.invalidateQueries({ queryKey: ['estudantes'] })
      onOpenChange(false)
    },
    onError: (error: AxiosError<{ message?: unknown; errors?: Record<string, string[]> }>) => {
      const errors = error.response?.data?.errors
      if (errors) {
        Object.entries(errors).forEach(([field, messages]) => {
          form.setError(field as keyof FormValues, { message: messages[0] })
        })
        return
      }
      const message = error.response?.data?.message
      toast.error(typeof message === 'string' ? message : 'Erro ao gravar estudante')
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar estudante' : 'Novo estudante'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Actualizar dados do estudante' : 'Registar um novo estudante no sistema'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Nome completo</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
              <FormField
                control={form.control}
                name="data_nascimento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de nascimento</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="genero"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Género</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="M">Masculino</SelectItem>
                        <SelectItem value="F">Feminino</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="estado_civil"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado civil</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ESTADO_CIVIL_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
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
                name="pais"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>País</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(Number(v))}
                      value={field.value ? String(field.value) : ''}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar país" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {paisesQuery.data?.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.nome}
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
                name="num_bi"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nº BI</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nif"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NIF</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="telefone_responsavel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone do responsável</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email_faturacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email de faturação</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="telefone_faturacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone de faturação</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nome_pai"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do pai</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nome_mae"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da mãe</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endereco"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Endereço</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                {isEdit ? 'Guardar alterações' : 'Registar estudante'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function emptyValues(): FormValues {
  return {
    nome: '',
    email: '',
    pais: 0,
    genero: 'M',
    estado_civil: 'Solteiro',
    data_nascimento: '',
    num_bi: '',
    nif: '',
    email_faturacao: '',
    telefone: '',
    telefone_faturacao: '',
    telefone_responsavel: '',
    nome_pai: '',
    nome_mae: '',
    endereco: '',
    observacao: '',
  }
}

function parseDateToISO(value: string | null | undefined): string {
  if (!value) return ''
  // backend devolve dd/MM/yyyy via AppHelper::converteYmd2dmY
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (match) {
    const [, d, m, y] = match
    return `${y}-${m}-${d}`
  }
  return value
}
