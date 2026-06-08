import * as React from 'react'
import { format, isValid, parse } from 'date-fns'
import { Calendar as CalendarIcon, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

/**
 * Picker de data com calendário (substitui <Input type="date" />).
 *
 * Aceita e devolve strings ISO `yyyy-MM-dd` — mesmo formato que o backend
 * usa nos endpoints REST. Internamente converte para Date para o calendário.
 */
type Props = {
  value: string | null | undefined // 'yyyy-MM-dd'
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  /** Mostrar botão de limpar quando há valor. */
  clearable?: boolean
  className?: string
  /** Restringe a navegação/dropdowns de ano. */
  startMonth?: Date
  endMonth?: Date
  id?: string
  name?: string
}

function parseISO(value?: string | null): Date | undefined {
  if (!value) return undefined
  // Aceita 'yyyy-MM-dd' (ISO curto) ou 'dd/MM/yyyy' (formato API legado)
  const iso = parse(value, 'yyyy-MM-dd', new Date())
  if (isValid(iso)) return iso
  const dmy = parse(value, 'dd/MM/yyyy', new Date())
  if (isValid(dmy)) return dmy
  return undefined
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Seleccionar data',
  disabled,
  clearable = true,
  className,
  startMonth,
  endMonth,
  id,
  name,
}: Props) {
  const [open, setOpen] = React.useState(false)
  const date = parseISO(value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          name={name}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal',
            !date && 'text-muted-foreground',
            className,
          )}
        >
          <span className="flex items-center gap-2 truncate">
            <CalendarIcon className="h-4 w-4 shrink-0" />
            {date ? format(date, 'yyyy-MM-dd') : placeholder}
          </span>
          {clearable && date && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                onChange('')
              }}
              className="ml-1 rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted"
              aria-label="Limpar data"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          defaultMonth={date}
          onSelect={(d) => {
            if (d) {
              onChange(format(d, 'yyyy-MM-dd'))
              setOpen(false)
            } else {
              onChange('')
            }
          }}
          startMonth={startMonth}
          endMonth={endMonth}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}
