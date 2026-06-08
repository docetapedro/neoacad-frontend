import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import {
  Download,
  Eye,
  File,
  FileImage,
  FileText,
  Loader2,
  Trash2,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { api, type ApiResponse } from '@/lib/api'

type Documento = {
  id: number
  file_name: string
  mime_type: string | null
  size: number | null
  collection_name: string
  url: string
  thumb_url: string | null
  created_at: string | null
}

type DocumentosPayload = {
  candidato_id: number
  colecoes: Record<string, string>
  documentos: Record<string, Documento[]>
}

async function fetchDocumentos(candidatoId: number): Promise<DocumentosPayload> {
  const { data } = await api.get<ApiResponse<DocumentosPayload>>(
    `/candidatos/${candidatoId}/documentos`,
  )
  return data.dados as DocumentosPayload
}

async function uploadDocumento(
  candidatoId: number,
  collection: string,
  file: File,
): Promise<void> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('collection', collection)
  await api.post(`/candidatos/${candidatoId}/documentos`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

async function deleteDocumento(candidatoId: number, mediaId: number): Promise<void> {
  await api.delete(`/candidatos/${candidatoId}/documentos/${mediaId}`)
}

function formatSize(bytes: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileIcon(mime: string | null) {
  if (!mime) return File
  if (mime.startsWith('image/')) return FileImage
  if (mime === 'application/pdf') return FileText
  return File
}

export function DocumentosDialog({
  candidatoId,
  candidatoNome,
  open,
  onOpenChange,
}: {
  candidatoId: number | null
  candidatoNome: string | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [confirmDelete, setConfirmDelete] = useState<Documento | null>(null)

  const query = useQuery({
    queryKey: ['candidato-docs', candidatoId],
    queryFn: () => fetchDocumentos(candidatoId!),
    enabled: !!candidatoId && open,
  })

  const deleteMutation = useMutation({
    mutationFn: (mediaId: number) => deleteDocumento(candidatoId!, mediaId),
    onSuccess: () => {
      toast.success('Documento eliminado')
      queryClient.invalidateQueries({ queryKey: ['candidato-docs', candidatoId] })
      setConfirmDelete(null)
    },
    onError: (e: AxiosError<{ message?: unknown }>) =>
      toast.error(
        typeof e.response?.data?.message === 'string'
          ? e.response.data.message
          : 'Não foi possível eliminar',
      ),
  })

  if (!candidatoId) return null

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Documentos — {candidatoNome ?? `Candidato #${candidatoId}`}</DialogTitle>
            <DialogDescription>
              Carregue BI, certificado, fotografia e outros documentos do candidato.
              Tamanho máximo: 10 MB por ficheiro.
            </DialogDescription>
          </DialogHeader>

          {query.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full" />
              ))}
            </div>
          ) : query.data ? (
            <div className="space-y-4">
              {Object.entries(query.data.colecoes).map(([col, label]) => (
                <ColecaoCard
                  key={col}
                  collection={col}
                  label={label}
                  candidatoId={candidatoId}
                  documentos={query.data!.documentos[col] ?? []}
                  onDelete={(doc) => setConfirmDelete(doc)}
                />
              ))}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {confirmDelete && (
        <ConfirmDialog
          open={!!confirmDelete}
          onOpenChange={(o) => !o && setConfirmDelete(null)}
          title="Eliminar documento"
          description={`Eliminar "${confirmDelete.file_name}"? Esta acção não pode ser revertida.`}
          confirmLabel="Eliminar"
          variant="destructive"
          isLoading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(confirmDelete.id)}
        />
      )}
    </>
  )
}

function ColecaoCard({
  collection,
  label,
  candidatoId,
  documentos,
  onDelete,
}: {
  collection: string
  label: string
  candidatoId: number
  documentos: Documento[]
  onDelete: (doc: Documento) => void
}) {
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const isSingle = collection !== 'outros'

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadDocumento(candidatoId, collection, file),
    onSuccess: () => {
      toast.success(`${label} carregado`)
      queryClient.invalidateQueries({ queryKey: ['candidato-docs', candidatoId] })
      if (inputRef.current) inputRef.current.value = ''
    },
    onError: (e: AxiosError<{ message?: unknown; errors?: Record<string, string[]> }>) => {
      const data = e.response?.data
      if (data?.errors) {
        const first = Object.values(data.errors)[0]
        if (Array.isArray(first) && first[0]) {
          toast.error(first[0])
          return
        }
      }
      toast.error(typeof data?.message === 'string' ? data.message : 'Falha no upload')
    },
  })

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    uploadMutation.mutate(file)
  }

  const podeAdicionarMais = !isSingle || documentos.length === 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>{label}</span>
          <div className="flex items-center gap-2">
            {documentos.length > 0 && (
              <Badge variant="outline">{documentos.length}</Badge>
            )}
            {isSingle && documentos.length > 0 && (
              <Badge variant="secondary" className="text-xs">único</Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {documentos.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Sem documento carregado.</p>
        ) : (
          documentos.map((d) => {
            const Icon = fileIcon(d.mime_type)
            return (
              <div
                key={d.id}
                className="flex items-center gap-3 rounded-md border p-2 hover:bg-muted/30"
              >
                {d.thumb_url ? (
                  <img
                    src={d.thumb_url}
                    alt={d.file_name}
                    className="h-12 w-12 rounded object-cover border"
                  />
                ) : (
                  <div className="h-12 w-12 rounded border bg-muted/40 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" title={d.file_name}>
                    {d.file_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatSize(d.size)}
                    {d.created_at && ` • ${d.created_at}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted"
                    title="Abrir / Ver"
                  >
                    <Eye className="h-4 w-4" />
                  </a>
                  <a
                    href={d.url}
                    download={d.file_name}
                    className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted"
                    title="Descarregar"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => onDelete(d)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )
          })
        )}

        {podeAdicionarMais && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept={collection === 'fotografia' ? 'image/*' : '.pdf,image/*,.doc,.docx'}
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              disabled={uploadMutation.isPending}
              onClick={() => inputRef.current?.click()}
            >
              {uploadMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {isSingle && documentos.length > 0
                ? `Substituir ${label.toLowerCase()}`
                : `Carregar ${label.toLowerCase()}`}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
