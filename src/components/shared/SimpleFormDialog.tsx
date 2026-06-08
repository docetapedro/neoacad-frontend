import { useEffect } from 'react'
import { useForm, type DefaultValues, type FieldValues } from 'react-hook-form'
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
import { Form } from '@/components/ui/form'

type Props<TValues extends FieldValues> = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  defaultValues: DefaultValues<TValues>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resolver: any
  isEdit: boolean
  submitFn: (values: TValues) => Promise<void>
  invalidateKey: string
  children: (form: ReturnType<typeof useForm<TValues>>) => React.ReactNode
  submitLabel?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const SIZE_CLASS = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
}

export function SimpleFormDialog<TValues extends FieldValues>({
  open,
  onOpenChange,
  title,
  description,
  defaultValues,
  resolver,
  isEdit,
  submitFn,
  invalidateKey,
  children,
  submitLabel,
  size = 'md',
}: Props<TValues>) {
  const queryClient = useQueryClient()
  const form = useForm<TValues>({ resolver, defaultValues })

  useEffect(() => {
    if (open) form.reset(defaultValues)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const mutation = useMutation({
    mutationFn: submitFn,
    onSuccess: () => {
      toast.success(isEdit ? 'Registo atualizado' : 'Registo criado')
      queryClient.invalidateQueries({ queryKey: [invalidateKey] })
      onOpenChange(false)
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
      toast.error(typeof message === 'string' ? message : 'Erro ao gravar')
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${SIZE_CLASS[size]} max-h-[90vh] overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
            className="space-y-4"
          >
            {children(form)}

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
                {submitLabel ?? (isEdit ? 'Guardar alterações' : 'Criar')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
