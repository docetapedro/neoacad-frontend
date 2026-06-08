import { useMemo, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, CheckCircle2, Delete, Eraser } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api, type ApiResponse } from '@/lib/api'
import { cn } from '@/lib/utils'

type TokensPayload = { tokens: string[]; operadores: string[]; exemplo: string }

async function fetchTokens(anoAcademicoId?: number | null): Promise<TokensPayload> {
  const { data } = await api.get<ApiResponse<TokensPayload>>('/lookup/formula-tokens', {
    params: anoAcademicoId ? { ano_academico_id: anoAcademicoId } : undefined,
  })
  return (data.dados ?? { tokens: [], operadores: [], exemplo: '' }) as TokensPayload
}

const OPERADORES = ['+', '-', '*', '/', '(', ')']

type Props = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Filtra tokens disponíveis por ano académico (opcional) */
  anoAcademicoId?: number | null
  /** Permite passar tokens manualmente — bypass do fetch */
  tokensOverride?: string[]
  /** Hide tokens row (ex.: quando ainda não há tipos definidos) */
  hideTokens?: boolean
  /** Mostrar validação (pills com tokens válidos/inválidos detectados na expressão) */
  showValidation?: boolean
  className?: string
}

/**
 * Validação client-side da fórmula (mesmas regras do backend FormulaValidator).
 */
function validar(
  expressao: string,
  tokensPermitidos: string[],
): { ok: boolean; mensagem?: string; tokensUsados: string[]; tokensInvalidos: string[] } {
  if (!expressao.trim()) {
    return { ok: true, tokensUsados: [], tokensInvalidos: [] }
  }
  if (!/^[A-Za-z0-9_+\-*\/().\s]+$/.test(expressao)) {
    return {
      ok: false,
      mensagem: 'Caracteres não permitidos. Use apenas tokens, números e + - * / ( ) .',
      tokensUsados: [],
      tokensInvalidos: [],
    }
  }
  const abertos = (expressao.match(/\(/g) ?? []).length
  const fechados = (expressao.match(/\)/g) ?? []).length
  if (abertos !== fechados) {
    return {
      ok: false,
      mensagem: `Parênteses desbalanceados (${abertos} abertos vs ${fechados} fechados).`,
      tokensUsados: [],
      tokensInvalidos: [],
    }
  }
  if (/[+\-*\/]{2,}/.test(expressao.replace(/\s+/g, ''))) {
    return {
      ok: false,
      mensagem: 'Operadores duplicados detectados.',
      tokensUsados: [],
      tokensInvalidos: [],
    }
  }
  const usados = Array.from(new Set(expressao.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? []))
  const invalidos = usados.filter((t) => !tokensPermitidos.includes(t))
  if (invalidos.length > 0) {
    return {
      ok: false,
      mensagem: `Tokens não reconhecidos: ${invalidos.join(', ')}`,
      tokensUsados: usados,
      tokensInvalidos: invalidos,
    }
  }
  return { ok: true, tokensUsados: usados, tokensInvalidos: [] }
}

export function FormulaInput({
  value,
  onChange,
  placeholder,
  anoAcademicoId,
  tokensOverride,
  hideTokens = false,
  showValidation = true,
  className,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const tokensQuery = useQuery({
    queryKey: ['formula-tokens', anoAcademicoId ?? null],
    queryFn: () => fetchTokens(anoAcademicoId ?? undefined),
    enabled: !tokensOverride,
    staleTime: 5 * 60 * 1000,
  })

  const tokens = tokensOverride ?? tokensQuery.data?.tokens ?? []
  const exemplo = tokensQuery.data?.exemplo

  const inserir = (txt: string, espaco = true) => {
    const input = inputRef.current
    if (!input) {
      onChange((value || '') + (espaco ? ` ${txt} ` : txt))
      return
    }
    const start = input.selectionStart ?? value.length
    const end = input.selectionEnd ?? value.length
    const before = value.slice(0, start)
    const after = value.slice(end)
    const novoTxt = espaco ? `${before}${txt}${after}` : `${before}${txt}${after}`
    onChange(novoTxt)
    // Reposicionar cursor após inserção (assíncrono para o React aplicar o value)
    setTimeout(() => {
      input.focus()
      const novaPos = start + txt.length
      input.setSelectionRange(novaPos, novaPos)
    }, 0)
  }

  const apagarUltimo = () => {
    const trimmed = value.trimEnd()
    if (!trimmed) return
    // Tenta apagar o último token ou operador (palavra ou um carácter)
    const m = trimmed.match(/[A-Za-z_][A-Za-z0-9_]*$|[+\-*\/().0-9]$/)
    if (m) {
      onChange(trimmed.slice(0, trimmed.length - m[0].length).trimEnd())
    } else {
      onChange(trimmed.slice(0, -1))
    }
  }

  const validacao = useMemo(() => validar(value, tokens), [value, tokens])

  return (
    <div className={cn('space-y-2', className)}>
      {!hideTokens && tokens.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">Tokens disponíveis (clique para inserir)</p>
          <div className="flex flex-wrap gap-1">
            {tokens.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => inserir(t)}
                className="px-2 py-1 text-xs font-mono rounded border bg-background hover:bg-muted transition-colors"
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-xs text-muted-foreground mb-1">Operadores</p>
        <div className="flex flex-wrap gap-1">
          {OPERADORES.map((op) => (
            <button
              key={op}
              type="button"
              onClick={() => inserir(op, op === '(' || op === ')')}
              className="px-3 py-1 text-sm font-mono rounded border bg-background hover:bg-primary/10 hover:border-primary transition-colors"
            >
              {op}
            </button>
          ))}
          <button
            type="button"
            onClick={apagarUltimo}
            className="px-2 py-1 text-xs rounded border bg-background hover:bg-amber-50 hover:border-amber-300 dark:hover:bg-amber-950/20 transition-colors flex items-center gap-1"
            title="Apagar último"
          >
            <Delete className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onChange('')}
            className="px-2 py-1 text-xs rounded border bg-background hover:bg-rose-50 hover:border-rose-300 dark:hover:bg-rose-950/20 transition-colors flex items-center gap-1"
            title="Limpar tudo"
          >
            <Eraser className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? exemplo ?? '(AC1 + AC2) / 2'}
        className={cn(
          'font-mono',
          !validacao.ok && 'border-destructive focus-visible:ring-destructive',
        )}
      />

      {showValidation && value.trim() && (
        validacao.ok ? (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Fórmula válida
            {validacao.tokensUsados.length > 0 && (
              <span className="ml-2 text-muted-foreground">
                · usa: {validacao.tokensUsados.map((t) => (
                  <Badge key={t} variant="outline" className="ml-1 font-mono text-xs">{t}</Badge>
                ))}
              </span>
            )}
          </p>
        ) : (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {validacao.mensagem}
          </p>
        )
      )}

      {!hideTokens && tokens.length === 0 && tokensQuery.isFetched && !tokensOverride && (
        <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Ainda não há tipos de avaliação definidos — crie-os antes em /tipos-avaliacoes.
        </p>
      )}
    </div>
  )
}
