import { Construction } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from './PageHeader'

type Props = {
  title: string
  description?: string
}

export function PlaceholderPage({ title, description }: Props) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-4">
            <Construction className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">Módulo em desenvolvimento</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            Este módulo será implementado numa próxima fase. A estrutura de menu já está alinhada
            com a versão anterior.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
