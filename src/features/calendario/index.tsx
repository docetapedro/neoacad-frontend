import { useQuery } from '@tanstack/react-query'
import { Calendar, CheckCircle2, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/shared/PageHeader'
import { api, type ApiResponse } from '@/lib/api'

type Periodo = {
  id: number
  periodo_lectivo_id: number
  inicio_periodo: string | null
  fim_periodo: string | null
  inicio_avaliacao: string | null
  fim_avaliacao: string | null
  avaliacao_fechada: boolean
}

type AnoCalendario = {
  id: number
  ano: number
  activo: boolean
  inicio: string | null
  fim: string | null
  periodos: Periodo[]
}

async function fetchCalendario(): Promise<AnoCalendario[]> {
  const { data } = await api.get<ApiResponse<AnoCalendario[]>>('/calendario')
  return (data.dados ?? []) as AnoCalendario[]
}

export function CalendarioPage() {
  const query = useQuery({ queryKey: ['calendario'], queryFn: fetchCalendario })

  return (
    <div>
      <PageHeader
        title="Calendário Escolar"
        description="Linha de tempo dos anos académicos, períodos lectivos e janelas de avaliação"
      />

      {query.isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : query.data && query.data.length > 0 ? (
        <div className="space-y-6">
          {query.data.map((ano) => (
            <Card key={ano.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Ano académico {ano.ano}
                      {ano.activo && (
                        <Badge className="bg-emerald-600 hover:bg-emerald-600">Activo</Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {ano.inicio ?? '—'} até {ano.fim ?? '—'}
                    </CardDescription>
                  </div>
                  <Badge variant="outline">
                    {ano.periodos.length} período{ano.periodos.length === 1 ? '' : 's'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {ano.periodos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Sem períodos lectivos definidos.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {ano.periodos.map((p, idx) => (
                      <div key={p.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                              p.avaliacao_fechada
                                ? 'bg-muted text-muted-foreground'
                                : 'bg-primary text-primary-foreground'
                            }`}
                          >
                            {idx + 1}
                          </div>
                          {idx < ano.periodos.length - 1 && (
                            <div className="w-px flex-1 bg-border mt-1" style={{ minHeight: 40 }} />
                          )}
                        </div>
                        <div className="flex-1 pb-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-semibold">{idx + 1}º Período</h4>
                            {p.avaliacao_fechada ? (
                              <Badge variant="secondary" className="text-[10px]">
                                <CheckCircle2 className="mr-1 h-3 w-3" /> Avaliação fechada
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px]">
                                <Clock className="mr-1 h-3 w-3" /> Em curso
                              </Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 text-sm">
                            <div>
                              <span className="text-xs text-muted-foreground">Período</span>
                              <p className="font-mono">
                                {p.inicio_periodo ?? '—'} → {p.fim_periodo ?? '—'}
                              </p>
                            </div>
                            <div>
                              <span className="text-xs text-muted-foreground">Avaliação</span>
                              <p className="font-mono">
                                {p.inicio_avaliacao ?? '—'} → {p.fim_avaliacao ?? '—'}
                              </p>
                            </div>
                          </div>
                          {idx < ano.periodos.length - 1 && <Separator className="mt-3" />}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Calendar className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>Sem anos académicos definidos.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
