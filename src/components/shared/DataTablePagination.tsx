import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type Props = {
  total: number
  pageSize: number
  currentPage: number
  lastPage: number
  onPageChange: (page: number) => void
}

export function DataTablePagination({
  total,
  pageSize,
  currentPage,
  lastPage,
  onPageChange,
}: Props) {
  const from = total === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const to = Math.min(currentPage * pageSize, total)

  return (
    <div className="flex items-center justify-between py-3">
      <div className="text-sm text-muted-foreground">
        A mostrar {from}–{to} de {total} resultado{total === 1 ? '' : 's'}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>
        <span className="text-sm text-muted-foreground px-2">
          Página {currentPage} de {lastPage || 1}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= lastPage}
        >
          Seguinte
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
