export type ListQueryParams = {
  page?: number
  quantidade?: number
  order?: string
  ordem?: 'asc' | 'desc'
  [key: string]: string | number | undefined
}
