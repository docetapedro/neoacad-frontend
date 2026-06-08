import { useQuery } from '@tanstack/react-query'
import { api, type ApiResponse } from '@/lib/api'

export type LookupItem<Extra = Record<string, unknown>> = {
  id: number
  label?: string
  [key: string]: unknown
} & Extra

async function fetchLookup<T>(path: string, params?: Record<string, unknown>): Promise<T[]> {
  const { data } = await api.get<ApiResponse<T[]>>(path, { params })
  return (data.dados ?? []) as T[]
}

export type EstudanteLookup = { id: number; label: string; num_processo: string; nome: string }
export type CtaaLookup = {
  id: number
  label: string
  curso_id: number
  turno_id: number
  ano_academico_id: number
}
export type ClasseLookup = { id: number; designacao: string; tipo: string | null; ordem: number | null }
export type CursoLookup = { id: number; nome: string; sigla: string; departamento_id: number | null }
export type TurnoLookup = { id: number; nome: string; sigla: string }
export type DepartamentoLookup = { id: number; nome: string; sigla: string }
export type AnoLookup = { id: number; ano: number; activo: boolean | 0 | 1 }
export type PeriodoLectivoLookup = {
  id: number
  label: string
  ano_academico_id: number
  periodo_lectivo_id: number
  numero: number | null
}
export type CodigoAvaliacaoLookup = { id: number; codigo: string | null; descricao: string | null }
export type DisciplinaLookup = { id: number; nome: string; sigla: string }
export type GrelhaLookup = { id: number; nome: string; curso_id: number | null }

export function useEstudantesLookup(q?: string, enabled = true) {
  return useQuery({
    queryKey: ['lookup', 'estudantes', q],
    queryFn: () => fetchLookup<EstudanteLookup>('/lookup/estudantes', q ? { q } : undefined),
    enabled,
    staleTime: 30 * 1000,
  })
}

export function useCtaaLookup(enabled = true) {
  return useQuery({
    queryKey: ['lookup', 'ctaa'],
    queryFn: () => fetchLookup<CtaaLookup>('/lookup/curso-turno-ano'),
    enabled,
    staleTime: 5 * 60 * 1000,
  })
}

export function useClassesByCursoLookup(cursoId: number | null | undefined) {
  return useQuery({
    queryKey: ['lookup', 'classes', cursoId],
    queryFn: () => fetchLookup<ClasseLookup>(`/lookup/classes-por-curso/${cursoId}`),
    enabled: !!cursoId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCursosLookup(enabled = true) {
  return useQuery({
    queryKey: ['lookup', 'cursos'],
    queryFn: () => fetchLookup<CursoLookup>('/lookup/cursos'),
    enabled,
    staleTime: 5 * 60 * 1000,
  })
}

export function useTurnosLookup(enabled = true) {
  return useQuery({
    queryKey: ['lookup', 'turnos'],
    queryFn: () => fetchLookup<TurnoLookup>('/lookup/turnos'),
    enabled,
    staleTime: 5 * 60 * 1000,
  })
}

export function useDepartamentosLookup(enabled = true) {
  return useQuery({
    queryKey: ['lookup', 'departamentos'],
    queryFn: () => fetchLookup<DepartamentoLookup>('/lookup/departamentos'),
    enabled,
    staleTime: 5 * 60 * 1000,
  })
}

export function useAnosAcademicosLookup(enabled = true) {
  return useQuery({
    queryKey: ['lookup', 'anos-academicos'],
    queryFn: () => fetchLookup<AnoLookup>('/lookup/anos-academicos'),
    enabled,
    staleTime: 5 * 60 * 1000,
  })
}

export function usePeriodosLectivosLookup(anoAcademicoId?: number | null, enabled = true) {
  return useQuery({
    queryKey: ['lookup', 'periodos', anoAcademicoId],
    queryFn: () =>
      fetchLookup<PeriodoLectivoLookup>('/lookup/periodos-lectivos', {
        ano_academico_id: anoAcademicoId ?? undefined,
      }),
    enabled,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCodigosAvaliacaoLookup(enabled = true) {
  return useQuery({
    queryKey: ['lookup', 'codigos-avaliacao'],
    queryFn: () => fetchLookup<CodigoAvaliacaoLookup>('/lookup/codigos-avaliacao'),
    enabled,
    staleTime: 5 * 60 * 1000,
  })
}

export function useDisciplinasLookup(enabled = true) {
  return useQuery({
    queryKey: ['lookup', 'disciplinas'],
    queryFn: () => fetchLookup<DisciplinaLookup>('/lookup/disciplinas'),
    enabled,
    staleTime: 5 * 60 * 1000,
  })
}

export function useGrelhasCurricularesLookup(cursoId?: number | null, enabled = true) {
  return useQuery({
    queryKey: ['lookup', 'grelhas-curriculares', cursoId],
    queryFn: () =>
      fetchLookup<GrelhaLookup>('/lookup/grelhas-curriculares', {
        curso_id: cursoId ?? undefined,
      }),
    enabled,
    staleTime: 5 * 60 * 1000,
  })
}

export type TipoAvaliacaoLookup = {
  id: number
  label: string
  natureza: string | null
}

export function useTiposAvaliacoesLookup(anoAcademicoId?: number | null, enabled = true) {
  return useQuery({
    queryKey: ['lookup', 'tipos-avaliacoes', anoAcademicoId],
    queryFn: () =>
      fetchLookup<TipoAvaliacaoLookup>('/lookup/tipos-avaliacoes', {
        ano_academico_id: anoAcademicoId ?? undefined,
      }),
    enabled,
    staleTime: 5 * 60 * 1000,
  })
}

export type TurmaLookup = {
  id: number
  label: string
}

/**
 * Lista turmas filtradas por CTAA (curso_turno_ano_academico_id). Se `ctaaId`
 * é null, devolve todas (mas a query fica disabled até haver um valor).
 */
export function useTurmasPorCtaaLookup(
  ctaaId: number | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: ['lookup', 'turmas', ctaaId],
    queryFn: () =>
      fetchLookup<TurmaLookup>('/lookup/turmas', {
        ctaa_id: ctaaId ?? undefined,
      }),
    enabled: enabled && !!ctaaId,
    staleTime: 60 * 1000,
  })
}

export type InscricaoTurmaLookup = {
  id: number
  label: string
}

export function useInscricoesTurmaLookup(
  params: { turma_id?: number | null; estudante_id?: number | null } = {},
  enabled = true,
) {
  return useQuery({
    queryKey: ['lookup', 'inscricoes-turma', params.turma_id, params.estudante_id],
    queryFn: () =>
      fetchLookup<InscricaoTurmaLookup>('/lookup/inscricoes-turma', {
        turma_id: params.turma_id ?? undefined,
        estudante_id: params.estudante_id ?? undefined,
      }),
    enabled,
    staleTime: 60 * 1000,
  })
}

export type InscricaoLookup = {
  id: number
  label: string
}

export function useInscricoesPorEstudanteLookup(
  estudanteId: number | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: ['lookup', 'inscricoes-por-estudante', estudanteId],
    queryFn: () =>
      fetchLookup<InscricaoLookup>(`/lookup/inscricoes-por-estudante/${estudanteId}`),
    enabled: enabled && !!estudanteId,
    staleTime: 60 * 1000,
  })
}
