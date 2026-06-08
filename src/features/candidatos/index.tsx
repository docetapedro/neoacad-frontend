import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, FolderOpen, UserCheck, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { AxiosError } from 'axios'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  SimpleCrudPage,
  type ColumnDef,
} from '@/components/shared/SimpleCrudPage'
import { createCrudClient } from '@/lib/crud'
import { api } from '@/lib/api'
import { CandidatoFormDialog } from './CandidatoFormDialog'
import { DocumentosDialog } from './DocumentosDialog'
import type { Candidato } from './types'

const client = createCrudClient<Candidato>('candidatos')

const TODOS = '__all__'

const ESTADO_OPTIONS = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'aprovado', label: 'Aprovado' },
  { value: 'rejeitado', label: 'Rejeitado' },
]

const ESTADO_COLOR: Record<string, string> = {
  pendente: 'bg-amber-600 hover:bg-amber-600',
  aprovado: 'bg-emerald-600 hover:bg-emerald-600',
  rejeitado: 'bg-red-600 hover:bg-red-600',
}

const columns: ColumnDef<Candidato>[] = [
  {
    header: 'Nº',
    cell: (r) => <span className="font-mono">{r.numero}</span>,
  },
  {
    header: 'Nome',
    cell: (r) => <span className="font-medium">{r.nome_completo}</span>,
  },
  {
    header: 'Curso',
    cell: (r) => r.curso?.nome ?? '—',
  },
  {
    header: 'Turno',
    cell: (r) => r.turno?.nome ?? '—',
  },
  {
    header: 'Ano',
    cell: (r) => <span className="font-mono">{r.ano_academico?.ano ?? '—'}</span>,
  },
  {
    header: 'Estado',
    cell: (r) => (
      <div className="flex items-center gap-2">
        <Badge className={r.estado ? ESTADO_COLOR[r.estado] ?? '' : ''}>{r.estado ?? '—'}</Badge>
        {r.estudante_id && (
          <Badge variant="outline" className="gap-1 text-emerald-700 border-emerald-300">
            <UserCheck className="h-3 w-3" />
            Convertido
          </Badge>
        )}
      </div>
    ),
  },
]

type ConversaoInfo = {
  estudante_id: number
  user_id: number
  num_processo: string
  username: string | null
  senha_temporaria: string | null
}

type AlterarEstadoResult = {
  message: string
  conversao?: ConversaoInfo
}

async function alterarEstadoApi(
  id: number,
  estado: 'aprovado' | 'rejeitado',
): Promise<AlterarEstadoResult> {
  const { data } = await api.patch(`/candidatos/${id}/estado`, { estado })
  return {
    message: typeof data?.message === 'string' ? data.message : 'Estado actualizado',
    conversao: data?.dados?.conversao,
  }
}

export function CandidatosPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Candidato | null>(null)
  const [estado, setEstado] = useState<string>(TODOS)
  const [docsCandidato, setDocsCandidato] = useState<Candidato | null>(null)

  const estadoMutation = useMutation({
    mutationFn: ({ id, novoEstado }: { id: number; novoEstado: 'aprovado' | 'rejeitado' }) =>
      alterarEstadoApi(id, novoEstado),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['candidatos'] })

      if (result.conversao) {
        const { num_processo, username, senha_temporaria, estudante_id } = result.conversao
        // Toast persistente com credenciais — secretário precisa copiar antes de fechar
        toast.success(
          `Convertido em estudante (${num_processo}). Username: ${username ?? '—'} · Senha temporária: ${senha_temporaria ?? '—'}`,
          {
            duration: 30000,
            action: estudante_id
              ? { label: 'Ver estudante', onClick: () => navigate(`/estudantes/${estudante_id}`) }
              : undefined,
          },
        )
      } else {
        toast.success(result.message)
      }
    },
    onError: (e: AxiosError<{ message?: string }>) =>
      toast.error(
        typeof e.response?.data?.message === 'string'
          ? e.response.data.message
          : 'Erro ao alterar estado',
      ),
  })

  return (
    <>
      <SimpleCrudPage<Candidato>
        title="Candidatos / Inscrições"
        description="Pré-matrículas pendentes de aprovação"
        queryKey="candidatos"
        searchKey="nome_completo"
        searchPlaceholder="Pesquisar por nome..."
        listFn={(params) => client.list(params)}
        deleteFn={client.remove}
        getRowId={(r) => r.id}
        getDeleteLabel={(r) => r.nome_completo}
        columns={columns}
        newLabel="Novo candidato"
        onNew={() => {
          setEditing(null)
          setFormOpen(true)
        }}
        onEdit={(r) => {
          setEditing(r)
          setFormOpen(true)
        }}
        extraFilters={{ estado: estado === TODOS ? undefined : estado }}
        filterBar={
          <Select value={estado} onValueChange={setEstado}>
            <SelectTrigger className="sm:w-44">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos os estados</SelectItem>
              {ESTADO_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
        extraActions={(row) => (
          <>
            <DropdownMenuItem onClick={() => setDocsCandidato(row)}>
              <FolderOpen className="mr-2 h-4 w-4" />
              Documentos
            </DropdownMenuItem>
            {row.estado !== 'aprovado' && (
              <DropdownMenuItem
                onClick={() => estadoMutation.mutate({ id: row.id, novoEstado: 'aprovado' })}
                className="text-emerald-700 focus:text-emerald-700"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Aprovar
              </DropdownMenuItem>
            )}
            {row.estado !== 'rejeitado' && (
              <DropdownMenuItem
                onClick={() => estadoMutation.mutate({ id: row.id, novoEstado: 'rejeitado' })}
                className="text-red-700 focus:text-red-700"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Rejeitar
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
          </>
        )}
      />

      <CandidatoFormDialog open={formOpen} onOpenChange={setFormOpen} candidato={editing} />

      <DocumentosDialog
        candidatoId={docsCandidato?.id ?? null}
        candidatoNome={docsCandidato?.nome_completo ?? null}
        open={!!docsCandidato}
        onOpenChange={(o) => !o && setDocsCandidato(null)}
      />
    </>
  )
}
