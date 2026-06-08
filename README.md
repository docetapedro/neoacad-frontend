# NeoAcad Frontend

Frontend ReactJS da plataforma de gestão académica **NeoAcad**, consumindo a API Laravel em
`C:\xampp\htdocs\neoacad`.

## Stack

- **Vite** + **React 19** + **TypeScript**
- **Tailwind CSS v4** + **shadcn/ui** (style: new-york, base: neutral)
- **TanStack Query** (data fetching, cache)
- **React Router** v7
- **Zustand** (estado global + persist do auth)
- **React Hook Form** + **Zod** (formulários + validação)
- **Axios** (HTTP client com Bearer token automático)
- **Sonner** (toasts)

## Estrutura

```
src/
├── components/
│   ├── layout/        # AppShell, Sidebar, Topbar
│   ├── shared/        # PageHeader, DataTablePagination, ConfirmDialog
│   └── ui/            # shadcn/ui primitives
├── features/
│   ├── auth/          # LoginPage, ProtectedRoute, api
│   ├── dashboard/     # DashboardPage
│   ├── users/         # CRUD utilizadores
│   ├── estudantes/    # CRUD estudantes
│   └── cursos/        # CRUD cursos
├── lib/               # api.ts (axios), query-client.ts, utils.ts (cn)
├── stores/            # auth-store.ts
└── types/             # auth, common
```

## Como correr

### 1. Backend (API Laravel)

```bash
cd C:\xampp\htdocs\neoacad
php artisan serve   # http://localhost:8000
```

### 2. Frontend

```bash
cd C:\xampp\htdocs\neoacad-frontend
npm install
npm run dev         # http://localhost:5173
```

Abre [http://localhost:5173](http://localhost:5173) e faz login com as credenciais da API.

## Variáveis de ambiente

`.env`:

```
VITE_API_URL=http://localhost:8000/api
VITE_APP_NAME=NeoAcad
```

## Convenções

### Resposta paginada da API

Todos os `index` da API devolvem este shape:

```ts
{
  statusCode: 200,
  message: "Sucesso",
  dados: {
    items: T[],
    paginacao: {
      total: number,
      por_pagina: number,
      pagina_actual: number,
      ultima_pagina: number
    }
  }
}
```

Helpers em `src/lib/api.ts`: `ApiResponse<T>` e `Paginated<T>`.

### Autenticação

Login devolve token Sanctum guardado em localStorage via `useAuthStore`. O interceptor axios
adiciona `Authorization: Bearer <token>` a todos os pedidos e faz redirect para `/login`
em respostas 401.

### Adicionar um novo módulo

1. Criar `src/features/<modulo>/` com `types.ts`, `api.ts`, `<Modulo>Page.tsx`, `<Modulo>FormDialog.tsx`.
2. Registar rota em `src/App.tsx`.
3. Adicionar entrada na `Sidebar.tsx`.
4. Backend: criar `Controller@index` seguindo o padrão `filtros->ordenar->paginacao` (model precisa do trait `IndexableScope`).

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Dev server com HMR (porta 5173) |
| `npm run build` | Build de produção em `dist/` |
| `npm run preview` | Servir o build |
| `npm run lint` | ESLint |
| `npx tsc -b` | Typecheck |
