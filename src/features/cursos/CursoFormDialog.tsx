import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { AxiosError } from 'axios'
import { Button } from '@/components/ui/button'
import { FormulaInput } from '@/components/shared/FormulaInput'
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
import { createCurso, listDepartamentos, updateCurso } from './api'
import type { CursoRow } from './types'

const schema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  sigla: z.string().min(2, 'Sigla deve ter pelo menos 2 caracteres'),
  departamento: z.number().int().positive('Departamento é obrigatório'),
  num_etapas: z.number().int().min(1, 'Deve ter pelo menos 1 etapa'),
  descricao: z.string().optional(),
  formula_media_final: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  curso?: CursoRow | null
}

export function CursoFormDialog({ open, onOpenChange, curso }: Props) {
  const queryClient = useQueryClient()
  const isEdit = !!curso

  const departamentosQuery = useQuery({
    queryKey: ['departamentos'],
    queryFn: listDepartamentos,
    staleTime: 5 * 60 * 1000,
    enabled: open,
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: '',
      sigla: '',
      departamento: 0,
      num_etapas: 4,
      descricao: '',
      formula_media_final: '',
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        nome: curso?.nome ?? '',
        sigla: curso?.sigla ?? '',
        departamento: curso?.departamento_id != null ? Number(curso.departamento_id) : 0,
        num_etapas: curso?.num_etapas != null ? Number(curso.num_etapas) : 4,
        descricao: curso?.descricao ?? '',
        formula_media_final: curso?.formula_media_final ?? '',
      })
    }
  }, [open, curso, form])

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      isEdit ? updateCurso(curso!.id, values) : createCurso(values),
    onSuccess: () => {
      toast.success(isEdit ? 'Curso actualizado' : 'Curso criado')
      queryClient.invalidateQueries({ queryKey: ['cursos'] })
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
      toast.error(typeof message === 'string' ? message : 'Erro ao gravar curso')
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar curso' : 'Novo curso'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Actualizar dados do curso' : 'Criar um novo curso no sistema'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do curso</FormLabel>
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
                name="sigla"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sigla</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="num_etapas"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nº de anos / etapas</FormLabel>
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
            </div>
            <FormField
              control={form.control}
              name="departamento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Departamento</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(Number(v))}
                    value={field.value ? String(field.value) : ''}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar departamento" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {departamentosQuery.data?.map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>
                          {d.nome}
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
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="formula_media_final"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fórmula da média final</FormLabel>
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
                {isEdit ? 'Guardar alterações' : 'Criar curso'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
