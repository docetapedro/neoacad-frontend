import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { AxiosError } from 'axios'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FormulaInput } from '@/components/shared/FormulaInput'
import { DatePicker } from '@/components/shared/DatePicker'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/shared/PageHeader'
import { api, type ApiResponse } from '@/lib/api'

type Instituicao = {
  id?: number
  sigla?: string | null
  nome?: string | null
  nif?: string | null
  telefone?: string | null
  email?: string | null
  fax?: string | null
  endereco?: string | null
  lema?: string | null
  fundacao?: string | null
  formula_media_final?: string | null
  tipo?: string | null
}

const schema = z.object({
  sigla: z.string().min(1, 'Sigla é obrigatória'),
  nome: z.string().min(3, 'Nome é obrigatório'),
  nif: z.string().optional().nullable(),
  telefone: z.string().optional().nullable(),
  email: z.string().email('Email inválido').or(z.literal('')).optional().nullable(),
  endereco: z.string().optional().nullable(),
  lema: z.string().optional().nullable(),
  fax: z.string().optional().nullable(),
  fundacao: z.string().optional().nullable(),
  formula_media_final: z.string().optional().nullable(),
  tipo: z.string().optional().nullable(),
})
type FormValues = z.infer<typeof schema>

async function fetchParametros(): Promise<Instituicao | null> {
  const { data } = await api.get<ApiResponse<Instituicao | null>>('/parametros')
  return data.dados ?? null
}

async function updateParametros(payload: FormValues): Promise<void> {
  await api.put('/parametros', payload)
}

export function ParametrosPage() {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['parametros'], queryFn: fetchParametros })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues(),
  })

  useEffect(() => {
    if (query.data) {
      form.reset({
        sigla: query.data.sigla ?? '',
        nome: query.data.nome ?? '',
        nif: query.data.nif ?? '',
        telefone: query.data.telefone ?? '',
        email: query.data.email ?? '',
        endereco: query.data.endereco ?? '',
        lema: query.data.lema ?? '',
        fax: query.data.fax ?? '',
        fundacao: parseDate(query.data.fundacao ?? null),
        formula_media_final: query.data.formula_media_final ?? '',
        tipo: query.data.tipo ?? 'S',
      })
    }
  }, [query.data, form])

  const mutation = useMutation({
    mutationFn: updateParametros,
    onSuccess: () => {
      toast.success('Parâmetros guardados com sucesso')
      queryClient.invalidateQueries({ queryKey: ['parametros'] })
    },
    onError: (error: AxiosError<{ message?: unknown; errors?: Record<string, string[]> }>) => {
      const errors = error.response?.data?.errors
      if (errors && typeof errors === 'object') {
        Object.entries(errors).forEach(([field, messages]) => {
          if (Array.isArray(messages)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            form.setError(field as any, { message: messages[0] })
          }
        })
        return
      }
      const message = error.response?.data?.message
      toast.error(typeof message === 'string' ? message : 'Erro ao guardar parâmetros')
    },
  })

  return (
    <div>
      <PageHeader
        title="Parâmetros do Sistema"
        description="Configuração da instituição"
      />

      <Card>
        <CardHeader>
          <CardTitle>Dados da instituição</CardTitle>
          <CardDescription>
            Esta informação é usada em documentos PDF e impressões oficiais.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {query.isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="sigla"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sigla</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ''} />
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
                          <Input {...field} value={field.value ?? ''} />
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
                          <Input type="email" {...field} value={field.value ?? ''} />
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
                          <Input {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="fax"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fax</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ''} />
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
                          <Input {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lema"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Lema</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="fundacao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de fundação</FormLabel>
                        <FormControl>
                          <DatePicker value={field.value ?? ''} onChange={field.onChange} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div>
                  <FormField
                    control={form.control}
                    name="formula_media_final"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fórmula da média final (global)</FormLabel>
                        <FormControl>
                          <FormulaInput
                            value={field.value ?? ''}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <Button type="submit" disabled={mutation.isPending}>
                    {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Guardar alterações
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function emptyValues(): FormValues {
  return {
    sigla: '',
    nome: '',
    nif: '',
    telefone: '',
    email: '',
    endereco: '',
    lema: '',
    fax: '',
    fundacao: '',
    formula_media_final: '',
    tipo: 'S',
  }
}

function parseDate(value: string | null | undefined): string {
  if (!value) return ''
  const m = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  return value
}
