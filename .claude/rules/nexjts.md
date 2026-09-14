---
trigger: always_on
---

# Next.js Conventions (apps/dashboard_client_web)

Repo facts (stack versions, directory tree, commands) live in root `CLAUDE.md` — this file holds
the normative conventions only.

## 1. Naming & Imports

- **React Components:** PascalCase for component files (e.g., `TableOfContents.tsx`); lower-case kebab-case acceptable for highly generic UI atoms (e.g., `nav-main.tsx`). Check the domain before deciding.
- **Server/client split:** `Foo.server.tsx` / `Foo.client.tsx` when ambiguity matters.
- **Hooks:** camelCase with `.hook.ts` suffix (e.g., `useIsMobile.hook.ts`).
- **React Query clients:** `.query.client.ts` suffix (e.g., `useLogStream.query.client.ts`).
- **API fetchers:** `.api.ts` suffix, **camelCase** `[method][Name]` (e.g., `getPosts.api.ts`, `toggleLike.api.ts` — owner-decided convention; the 26-file majority); mock: `*.mock.api.ts`. (A few `log` fetchers still use kebab — legacy outliers, not the standard.)
- **Env vars:** explicitly mapped and validated via `env.schema.ts` (zod).
- **TypeScript imports: no file extension.**
- **Path aliasing:** always `@/*` from app root; never long relative paths. Cross-workspace: `@repo/*`.

## 2. Component Rules

- Default to **Server Components**. Only use `"use client"` when interactivity (hooks, state, browser APIs) or client-side libraries strictly require it.
- Do not bloat Server Components with blocking API requests; use `Suspense` boundaries for data fetching.
- Client fetching goes through custom hooks in `hooks/` wrapping React Query `useQuery`/`useMutation`; fetchers live in `apis/` (native fetch wrappers `http.{core,client,server}.ts` — axios is retired).
- Jotai is available for client shared state where Context is too heavy; keep atoms small and segmented.

## 3. Styling Rules

- Tailwind CSS v4 patterns; UI atoms follow the shadcn approach in `components/ui/` (Radix primitives + `lucide-react`).
- Merge classes with the `cn` utility from `@/lib/utils`.
- Rely on CSS variables in `@/styles/globals.css` for semantic themes, dark mode via `darkMode: 'class'`.

## 4. Formatting

- **Dates DISPLAY as `YYYY/MM/DD`** everywhere (user rule). Stored/DTO dates stay ISO (`YYYY-MM-DD`); format ONLY at display via the single shared helper `formatDate` in `lib/dueDates.ts` (`null`/empty → `—`). Never hand-format dates in a component.
