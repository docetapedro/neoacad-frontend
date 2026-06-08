import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DayPicker, type DayPickerProps } from 'react-day-picker'
import 'react-day-picker/style.css'
import { pt } from 'date-fns/locale'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type CalendarProps = DayPickerProps

const NOW = new Date()
const DEFAULT_START = new Date(NOW.getFullYear() - 80, 0, 1)
const DEFAULT_END = new Date(NOW.getFullYear() + 20, 11, 31)

/**
 * Wrapper Tailwind do react-day-picker v10.
 *
 * - `captionLayout="dropdown"` activa dropdowns para mês e ano (configurável).
 * - `startMonth`/`endMonth` controlam o intervalo dos dropdowns de ano. Por defeito
 *   80 anos para trás e 20 para a frente (cobre data de nascimento e calendário escolar).
 */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = 'dropdown',
  startMonth = DEFAULT_START,
  endMonth = DEFAULT_END,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      locale={pt}
      showOutsideDays={showOutsideDays}
      captionLayout={captionLayout}
      startMonth={startMonth}
      endMonth={endMonth}
      className={cn('p-3', className)}
      classNames={{
        root: 'rdp-root',
        months: 'relative flex flex-col gap-4',
        month: 'flex flex-col gap-3 w-full',
        month_caption: 'flex items-center justify-center h-9 px-9 relative',
        caption_label: 'text-sm font-medium',
        dropdowns: 'flex items-center gap-1.5',
        dropdown_root: 'relative inline-flex items-center',
        dropdown:
          'absolute inset-0 z-10 opacity-0 cursor-pointer',
        nav: 'absolute inset-x-0 top-0 flex items-center justify-between px-1 h-9',
        button_previous: cn(
          buttonVariants({ variant: 'outline', size: 'icon-sm' }),
          'absolute left-1 top-1 size-7 bg-transparent p-0 opacity-70 hover:opacity-100',
        ),
        button_next: cn(
          buttonVariants({ variant: 'outline', size: 'icon-sm' }),
          'absolute right-1 top-1 size-7 bg-transparent p-0 opacity-70 hover:opacity-100',
        ),
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]',
        week: 'flex w-full mt-1',
        day: cn(
          'relative p-0 text-center text-sm focus-within:relative focus-within:z-20',
        ),
        day_button: cn(
          buttonVariants({ variant: 'ghost' }),
          'size-9 p-0 font-normal aria-selected:opacity-100',
        ),
        today: 'bg-accent text-accent-foreground rounded-md',
        selected:
          '[&_button]:bg-primary [&_button]:text-primary-foreground [&_button]:hover:bg-primary [&_button]:hover:text-primary-foreground',
        outside: 'text-muted-foreground opacity-50',
        disabled: 'text-muted-foreground opacity-40',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === 'left' ? (
            <ChevronLeft className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          ),
      }}
      {...props}
    />
  )
}

export { Calendar }
