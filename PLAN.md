# PLAN — v1.0.2

## Visión general

La v1.0.2 añade tres pilares al proyecto: **tests automatizados** (Vitest + Playwright), **distribución vía npm** (instalable como dependencia en cualquier proyecto), y **Terminal UI** (interfaz interactiva en terminal con Ink). Se implementarán en 3 PRs independientes.

### Estado

| PR | Rama | Estado |
|---|---|---|
| **#1** Test Suite + Shared Types | `feat/tests` | ✅ Completado ([PR #2](https://github.com/raulfdeztdo/forgottenbranches/pull/2)) |
| **#2** npm Package | `feat/npm-package` | ⬜ Pendiente |
| **#3** Terminal UI | `feat/terminal-ui` | ✅ Completado ([PR #3](https://github.com/raulfdeztdo/forgottenbranches/pull/3)) |

---

## PR #1 — Test Suite + Shared Types

> Rama sugerida: `feat/tests`

### Objetivo

Cobertura completa de tests: unitarios (lógica de git), integración (API Express), componentes React, y end-to-end (Playwright). Además, se crea un workspace `shared/` (`@forgottenbranches/types`) para resolver la duplicación de tipos entre server y client.

### Workspace `shared/` — Tipos compartidos

Crear `shared/` como workspace en `pnpm-workspace.yaml`:

```yaml
packages:
  - "server"
  - "client"
  - "shared"
```

**`shared/package.json`**:
```json
{
  "name": "@forgottenbranches/types",
  "version": "1.0.2",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts"
}
```

**`shared/src/index.ts`** — tipos consolidados:
```ts
export interface MergeInfo { ... }
export interface BranchInfo { ... }
export interface BranchesResult { ... }
export interface ArchivedBranch { ... }
export type BranchStatus = 'active' | 'forgotten' | 'merged' | 'orphan' | 'abandoned';
```

- **Server** (`server/package.json`): añadir `"@forgottenbranches/types": "workspace:*"` como dependencia.
- **Client** (`client/package.json`): añadir `"@forgottenbranches/types": "workspace:*"` como dependencia.
- Eliminar `client/src/types.ts`.
- Actualizar imports en `server/src/git.ts`, `server/src/app.ts`, y todos los componentes del cliente.

### Dependencias a añadir (tests)

| Paquete | Workspace | Propósito |
|---|---|---|
| `vitest` | root (dev) | Test runner principal |
| `@vitest/ui` | root (dev) | UI visual para desarrollo |
| `@vitest/coverage-v8` | root (dev) | Cobertura de código |
| `supertest` | server (dev) | Tests HTTP de integración |
| `@types/supertest` | server (dev) | Tipos para supertest |
| `@testing-library/react` | client (dev) | Renderizado de componentes React |
| `@testing-library/jest-dom` | client (dev) | Matchers DOM (toBeInTheDocument, etc.) |
| `@testing-library/user-event` | client (dev) | Simulación de eventos de usuario |
| `jsdom` | client (dev) | Entorno DOM para tests de React |
| `playwright` | root (dev) | Tests end-to-end |
| `@playwright/test` | root (dev) | Runner de Playwright |

### Configuración

#### Vitest workspace (root `vitest.config.ts`)

- Definir un [Vitest workspace](https://vitest.dev/guide/workspace.html) con dos proyectos:
  - `server/vitest.config.ts` → entorno `node`, tests en `server/src/**/*.test.ts`
  - `client/vitest.config.ts` → entorno `jsdom`, tests en `client/src/**/*.test.tsx`

#### Playwright (`playwright.config.ts` en raíz)

- Navegador `chromium`
- `webServer` apuntando a `pnpm run dev` (Express :3001 + Vite :5173)
- Tests en `e2e/`

### Scripts a añadir en `package.json` raíz

```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:ui": "vitest --ui",
  "test:coverage": "vitest run --coverage",
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui",
  "test:all": "vitest run && playwright test"
}
```

### Tests a implementar

#### A. Backend — Unit tests (`server/src/git.test.ts`)

Funciones a testear de `git.ts`:

| Función | Qué se testea |
|---|---|
| `detectMainBranch()` | Devuelve `main`, `master`, o fallback; repuesta correcta ante repo sin ramas |
| `getMergedBranches()` | Detecta ramas mergeadas en main; repo sin mergeados |
| `getMergeInfo()` | Commit de merge correcto (hash, mensaje, fecha) |
| `getCheckoutDates()` | Parsea reflog correctamente; múltiples checkouts |
| `computeStatus()` | Clasifica cada estado (forgotten, orphan, merged, abandoned, active) según condiciones |
| `deleteBranch()` | Protege main/master; safe delete vs force delete |
| `archiveBranch()` | Crea tag `archive/<name>` y borra rama |
| `restoreArchivedBranch()` | Recrea rama desde tag, borra el tag |
| `getArchivedBranches()` | Lista tags `archive/*` con metadatos |

**Estrategia de mocking**: como `git.ts` ejecuta `git` real vía `execFile`, para tests unitarios hay que hacer mock de la función `git()` wrapper (devuelve strings simulados como la salida de `git for-each-ref`, `git branch --merged`, etc.). Se usarán fixtures de texto plano con snapshots de salidas reales de git.

#### B. Backend — Integration tests (`server/src/app.test.ts`)

Endpoints a testear con `supertest`:

| Endpoint | Casos |
|---|---|
| `GET /api/branches` | Repo válido, repo sin .git, path inexistente, sin parámetro `path` |
| `DELETE /api/branches` | Borrado safe, force, main branch protegida, rama inexistente |
| `POST /api/branches/bulk-delete` | Bulk safe (todo ok), bulk con ramas no mergeadas (fallo parcial), bulk force |
| `POST /api/branches/archive` | Archivar una rama, archivar varias, rama protegida |
| `GET /api/branches/archived` | Lista archivos, repo sin archivos |
| `POST /api/branches/unarchive` | Restaurar archivo, tag inexistente |
| `DELETE /api/branches/archived` | Borrar archivo permanente, tag inexistente |

**Estrategia**: se necesita un repo git real de prueba. Dos opciones:
1. Crear un repo temporal con `tmpdir()` y ejecutar `git init` + commits + ramas en `beforeAll`, limpiar en `afterAll`.
2. Usar un repo fixture predefinido en `server/test-fixtures/`.

**Recomendación**: opción 1 para integration tests (más realista), opción 2 para unit tests (más rápido y predecible).

#### C. Frontend — Component tests

Componentes a testear (`client/src/components/`):

| Componente | Tests |
|---|---|
| `BranchTable` | Renderiza filas, ordenación, filtro de texto, filtros de estado, checkboxes, bulk bar, skeleton loading |
| `BranchDetail` | Expandir/colapsar panel, información de commit, info de merge, botón archivar (confirma tag name), botón borrar (safe/force) |
| `ArchivedTable` | Renderiza filas, expandir detalle, checkboxes, restaurar, borrar permanente |
| `ForceDeleteModal` | Modal visible/oculto, lista de ramas, selección, botón force delete, cierre con backdrop |
| `ToastContext` | Muestra toast success/error/info, auto-dismiss, múltiples toasts |

#### D. End-to-End (`e2e/`)

Flujos con Playwright:

| Flujo | Pasos |
|---|---|
| Escaneo de repo | Abrir app, escribir path, click Scan, ver tabla de ramas |
| Borrado de una rama | Seleccionar rama mergeada, click Delete, confirmar, ver toast success |
| Bulk delete con force | Seleccionar varias (alguna no mergeada), Delete, aparece ForceDeleteModal, confirmar Force, ver toast |
| Archivar y restaurar | Archivar rama, cambiar a tab Archived, ver rama, Restaurar, ver toast success |
| Filtros y ordenación | Probar filtro de texto, filtro de estado, ordenar por fecha |
| Recent projects | Escanear un repo, refrescar página, ver repo en dropdown de recientes |

### Estructura de ficheros resultante

```
forgottenbranches/
├── vitest.config.ts              # Workspace root config
├── playwright.config.ts          # E2E config
├── e2e/
│   ├── branches.spec.ts
│   ├── archive.spec.ts
│   └── filters.spec.ts
├── server/
│   ├── vitest.config.ts
│   ├── src/
│   │   ├── git.test.ts
│   │   └── app.test.ts
│   └── test-fixtures/
│       └── git-outputs/          # Snapshots de salidas git para unit tests
└── client/
    ├── vitest.config.ts
    └── src/
        ├── setupTests.ts         # jsdom + @testing-library/jest-dom setup
        └── components/
            ├── BranchTable.test.tsx
            ├── BranchDetail.test.tsx
            ├── ArchivedTable.test.tsx
            ├── ForceDeleteModal.test.tsx
            └── ToastContext.test.tsx
```

### Riesgos / Consideraciones

- **Tests de git.ts**: el comportamiento real de git puede diferir entre versiones. Usar fixtures de salidas reales capturadas en el entorno de CI.
- **Integration tests con repo temporal**: necesidad de `git` instalado en CI. Añadir `git` a la matriz de CI.
- **Playwright**: requiere instalar navegadores (`npx playwright install chromium`). Añadir paso en CI.
- **jsdom**: no soporta `localStorage` para los tests de `App.tsx` (recent projects). Necesita polyfill o mock.

---

## PR #2 — Distribución vía npm

> Rama sugerida: `feat/npm-package`

### Objetivo

Que `forgottenbranches` sea instalable como dependencia en cualquier proyecto vía `npm install forgottenbranches` (o bun/pnpm/yarn), y ejecutable dentro del proyecto sin recurrir al script `install.sh`.

### Investigación: ¿npm, bun o pnpm?

| Opción | Pros | Contras |
|---|---|---|
| **npm (registry oficial)** | Mayor alcance, `npx forgottenbranches`, estándar de facto, compatible con bun/pnpm/yarn. | Hay que publicar y mantener el paquete en npmjs.com |
| **bun** | Rápido, puede publicarse en npm igualmente. | Ecosistema más pequeño, menos usuarios |
| **pnpm** | Ya se usa en el proyecto, pública en npm registry igual. | No aporta ventajas diferenciales para distribución |

**Decisión: npm registry** como destino de publicación. El paquete se publica una sola vez en npmjs.org y es consumible desde cualquier gestor (npm, bun, pnpm, yarn). El proyecto sigue usando pnpm internamente para desarrollo.

### Cambios necesarios

#### 1. `package.json` raíz — hacerlo publicable

```jsonc
{
  "private": false,                     // Era true
  "main": "./server/dist/cli.js",
  "bin": {
    "forgottenbranches": "./bin/cli.js"
  },
  "files": [
    "bin/",
    "server/dist/",
    "client/dist/"
  ],
  "keywords": ["git", "branches", "cleanup", "cli"],
  "repository": {
    "type": "git",
    "url": "https://github.com/raulfdeztdo/forgottenbranches"
  },
  "license": "MIT",
  "engines": {
    "node": ">=18"
  }
}
```

#### 2. Nuevo entry point: API programática

Crear `server/src/api.ts` que exporte las funciones core como API pública:

```ts
export { getBranches, deleteBranch, archiveBranch, restoreArchivedBranch, /* ... */ }
```

Esto permite que, instalado como dependencia, se pueda hacer:

```ts
import { getBranches } from 'forgottenbranches';
const result = await getBranches('/path/to/repo');
```

#### 3. `bin/cli.js` — compatibilidad con instalación local

Actualmente hace `require('../server/dist/cli.js')`. Debe funcionar tanto si se instaló global (`npm i -g`) como local (`npm i forgottenbranches`). Ajustar la resolución de rutas.

#### 4. Bundle con tsup

Añadir `tsup` como devDependency en raíz. Script de build para producción:

```json
"build:dist": "tsup server/src/cli.ts --format cjs --bundle --external git --out-dir dist"
```

Esto genera un solo archivo `dist/cli.js` con express, cors, react, ink, etc. incluidos. El consumidor solo necesita Node.js y git instalados. Sin `node_modules` extra.

#### 5. Documentación

- Actualizar `README.md` con instrucciones de instalación vía npm/bun/pnpm.
- Actualizar `CONTRIBUTING.md`.
- Mantener `install.sh` como alternativa legacy.

#### 6. CI/CD de publicación

- GitHub Action que publique en npm al pushear un tag `v*`.
- Usar `npm publish` con token desde secrets.

### Scripts y comandos resultantes

```bash
# Instalación global (como hasta ahora)
npm install -g forgottenbranches
forgottenbranches

# Instalación local en un proyecto
npm install forgottenbranches
npx forgottenbranches

# Uso programático
import { getBranches } from 'forgottenbranches';
```

### Riesgos / Consideraciones

- **Nombre en npm**: verificar que `forgottenbranches` no esté ya ocupado en npmjs.org.
- **Build artifacts**: `server/dist/` y `client/dist/` deben estar incluidos en el paquete publicado (campo `files`). Hay que asegurarse de que `prepublishOnly` los genere.
- **Dependencias de producción**: el paquete publicado usará **bundle único** generado con `tsup` (basado en esbuild). Un solo archivo JS con todo incluido (express, cors, react, ink, etc.), sin dependencias externas para el consumidor, compatible offline. Se añade `tsup` como devDependency en raíz.

---

## PR #3 — Terminal UI (Ink)

> Rama sugerida: `feat/terminal-ui`

### Objetivo

Ofrecer una interfaz de terminal alternativa a la web UI, usando **Ink** (React para terminal). Al ejecutar `forgottenbranches` sin flags, se muestra un prompt de selección: Web UI o Terminal UI. Con flags `--tui` / `--web` se salta el prompt.

### Dependencias a añadir

| Paquete | Workspace | Propósito |
|---|---|---|
| `ink` | server | Framework React para terminal |
| `react` | server | Peer dependency de Ink |
| `@types/react` | server (dev) | Tipos para React en server |
| `ink-text-input` | server | Input de texto estilizado en terminal |
| `ink-select-input` | server | Selector de opciones en terminal |
| `ink-spinner` | server | Spinner de carga en terminal |
| `ink-gradient` (opcional) | server | Texto con gradiente para estética |

### Arquitectura

```
bin/cli.js
  └─ server/dist/cli.js  (entry point existente, renombrado a server/dist/start.js o similar)
       ├─ Sin flags → prompt de selección (readline)
       ├─ --web       → servidor Express + abre navegador (comportamiento actual)
       └─ --tui       → Ink TUI (nuevo)
            └─ server/src/tui/app.tsx
                 ├─ components/TuiDashboard.tsx
                 ├─ components/TuiBranchList.tsx
                 ├─ components/TuiBranchDetail.tsx
                 ├─ components/TuiActions.tsx
                 ├─ components/TuiConfirmDialog.tsx
                 ├─ components/TuiHelpBar.tsx
                 └─ hooks/useGitData.ts        (hook que llama a git.ts directamente)
```

### Prompt de selección

Al ejecutar sin flags se muestra un prompt con `readline` nativo de Node (0 dependencias):

```
┌────────────────────────────────────────────┐
│                                            │
│         Forgotten Branches v1.0.2          │
│                                            │
│  How would you like to proceed?            │
│                                            │
│    1. Web UI    (opens in your browser)    │
│    2. Terminal  (interactive TUI)          │
│                                            │
│  Enter 1 or 2: _                           │
│                                            │
└────────────────────────────────────────────┘
```

Flags: `--tui` / `--web` saltan el prompt.

### Diseño de la TUI

```
┌─ Forgotten Branches ── [/Users/raulfdez/project] ── [Scan] ────────────────────┐
│                                                                                  │
│  ┌─ Stats ──────────────────────────────────────────────────────────────────┐   │
│  │  Local: 24  ❌ Forgotten: 5  ⚠ Orphan: 2  📦 Archived: 3  Main: main    │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌─ Filters ── [Search: ________] [Status: All ▾] [Sort: Status ▾] ─────────┐  │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌─ Branches ───────────────────────────────────────────────────────────────┐   │
│  │ ☐ feature/login     gone  Add login page        2 months ago    forgotten │   │
│  │ ☐ fix/typo          gone  Fix typo in README    5 months ago    orphan    │   │
│  │ ☐ feat/api-v2              Refactor API layer   1 week ago      active    │   │
│  │ ☐ chore/deps       main   Update dependencies   3 days ago      merged    │   │
│  │ ▼ fix/navbar               Fix navbar overlap   3 months ago    abandon.  │   │
│  │   ┌─ Detail ──────────────────────────────────────────────────────────┐   │   │
│  │   │  Commit: a1b2c3d  Author: dev  Date: Jan 15, 2026                 │   │   │
│  │   │  Message: Fix navbar overlap on mobile                            │   │   │
│  │   │  Upstream: (none)  Last checkout: Oct 10, 2025                    │   │   │
│  │   │  Status: Abandoned (90+ days without activity)                    │   │   │
│  │   │  ┌────────────────────────────────────────────────────────────┐   │   │   │
│  │   │  │  [Archive]  [Delete]                                       │   │   │   │
│  │   │  └────────────────────────────────────────────────────────────┘   │   │   │
│  │   └──────────────────────────────────────────────────────────────────┘   │   │
│  │ ☐ feat/testing            Add test suite        2 hours ago     active    │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌─ Help ────────────────────────────────────────────────────────────────────┐  │
│  │  ↑↓ Navigate  ↵ Select  Space Toggle  a Archive  d Delete  q Quit  ? Help│  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Componentes Ink a implementar

| Componente | Responsabilidad |
|---|---|
| `TuiApp` | Entry point, estado global (repo path, datos, UI state), orquesta el renderizado |
| `TuiHeader` | Logo/app name, input de path, botón Scan, flags de modo (--tui) |
| `TuiStatsBar` | Contadores: local branches, forgotten, orphan, archived, main branch |
| `TuiFilterBar` | Input de búsqueda (texto), select de estado, select de ordenación |
| `TuiBranchList` | Lista scrolleable de ramas con highlight de la seleccionada |
| `TuiBranchRow` | Una fila: checkbox, icono, nombre, upstream, mensaje, fecha, status badge |
| `TuiBranchDetail` | Panel expandible: commit info, merge info, fechas, botones de acción |
| `TuiConfirmDialog` | Modal de confirmación para archivar/borrar/force-delete |
| `TuiToast` | Notificación temporal success/error en la parte inferior |
| `TuiHelpBar` | Barra fija inferior con atajos de teclado |
| `useGitData` | Hook que llama a las funciones de `git.ts` y devuelve datos + loading/error |

### Navegación por teclado

| Tecla | Acción |
|---|---|
| `↑` / `↓` | Navegar entre ramas |
| `↵ Enter` | Expandir/colapsar detalle de rama seleccionada |
| `Space` | Toggle checkbox de la rama seleccionada |
| `a` | Archivar rama(s) seleccionada(s) |
| `d` | Borrar rama(s) seleccionada(s) |
| `f` | Activar búsqueda / filtro |
| `Tab` | Cambiar foco entre secciones |
| `q` / `Esc` | Salir |
| `?` | Mostrar/ocultar help |
| `Ctrl+C` | Salir forzoso |

### Paleta de colores para la TUI

Ink soporta colores ANSI (256 colors). Mapeo desde One Dark Pro:

| Elemento | Color ANSI | Hex equivalente |
|---|---|---|
| Background | `#2c313c` (no se usa, terminal es negro) | — |
| Texto principal | `white` | `#abb2bf` |
| Texto secundario | `gray` | `#7a8290` |
| Active | `green` | `#98c379` |
| Forgotten | `red` | `#e06c75` |
| Merged | `yellow` | `#e5c07b` |
| Orphan | `#d19a66` (custom) | `#d19a66` |
| Abandoned | `#5c6370` (custom) | `#5c6370` |
| Accent (bordes, highlights) | `blue` | `#61afef` |
| Danger (delete buttons) | `red` | `#e06c75` |

Ink permite usar colores hex con `color="#e06c75"` en el prop `color` de `<Text>`.

### Entrada al servidor — refactor de `cli.ts`

`server/src/cli.ts` actual se convierte en 3 modos:

```
cli.ts
  ├── modo "prompt" (sin args): muestra selección Web/TUI
  ├── modo "web" (--web): comportamiento actual (Express + navegador)
  └── modo "tui" (--tui): importa y ejecuta el render de Ink
```

Nuevo `bin/cli.js`:

```js
#!/usr/bin/env node
const { main } = require('../server/dist/cli.js');
main(process.argv);
```

### Estructura de ficheros resultante

```
server/
├── src/
│   ├── cli.ts              # Refactorizado: 3 modos (prompt, web, tui)
│   ├── app.ts              # Sin cambios (Express API)
│   ├── git.ts              # Sin cambios (lógica git)
│   ├── tui/
│   │   ├── app.tsx         # Entry point Ink (TuiApp)
│   │   ├── components/
│   │   │   ├── Header.tsx
│   │   │   ├── StatsBar.tsx
│   │   │   ├── FilterBar.tsx
│   │   │   ├── BranchList.tsx
│   │   │   ├── BranchRow.tsx
│   │   │   ├── BranchDetail.tsx
│   │   │   ├── ConfirmDialog.tsx
│   │   │   ├── Toast.tsx
│   │   │   └── HelpBar.tsx
│   │   ├── hooks/
│   │   │   ├── useGitData.ts
│   │   │   └── useKeyboard.ts
│   │   └── colors.ts       # Mapeo de colores One Dark → Ink
│   └── index.ts            # Dev entry (sin cambios)
└── package.json             # +ink, +react
```

### Riesgos / Consideraciones

- **Ink usa JSX**: `server/tsconfig.json` necesita `"jsx": "react-jsx"`. Actualmente es CommonJS (`"module": "commonjs"`), pero Ink funciona con `require` si se compila a CJS.
- **React en servidor**: es inusual pero perfectamente válido con Ink. No hay DOM involucrado.
- **Compartir lógica con frontend**: `git.ts` se usa tal cual. Los tipos se importan de `@forgottenbranches/types` (workspace `shared/`).
- **Build**: hay que compilar los `.tsx` del TUI. `tsc` puede manejarlo si se configura `jsx`. En producción, el bundle de `tsup` incluirá el TUI compilado.
- **Performance**: Ink re-renderiza el árbol completo en cada frame. Hay que usar `React.memo` y evitar renders innecesarios.
- **Compatibilidad de terminal**: Ink funciona en la mayoría de terminales modernas (iTerm2, Terminal.app, Windows Terminal, Alacritty, Kitty). Terminales muy antiguas pueden tener problemas con colores o Unicode.
- **Sin tests automatizados del TUI**: la lógica de negocio ya está cubierta por unit tests de `git.ts`. El TUI es capa de presentación y se prueba manualmente.

---

## Orden de implementación

```
PR #1 (tests)  ──▶  PR #2 (npm)  ──▶  PR #3 (TUI)
```

**Justificación**:

1. **PR #1 primero**: los tests capturan el comportamiento actual antes de cualquier refactor. PR #2 y #3 modificarán `cli.ts`, `app.ts`, y `git.ts` — tener tests antes previene regresiones.
2. **PR #2 segundo**: la reestructuración para npm (bundling, entry points, scripts) es base para que PR #3 añada el TUI sobre una estructura de distribución ya estable.
3. **PR #3 tercero**: se construye sobre la base estable de PR #1 (tests que validan) y PR #2 (distribución ya funcional).

---

## CI/CD

Añadir un GitHub Action (`.github/workflows/ci.yml`):

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm run build
      - run: pnpm run test:all
      - run: pnpm run test:e2e
      - uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: coverage/

  publish:
    needs: test
    if: startsWith(github.ref, 'refs/tags/v')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          registry-url: 'https://registry.npmjs.org'
      - run: pnpm install
      - run: pnpm run build
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## Decisiones tomadas

1. **Bundle único con tsup/esbuild** para distribución npm. Sin dependencias externas para el consumidor, compatible offline.
2. **Workspace compartido `shared/`** (`@forgottenbranches/types`) para los tipos TypeScript. Server y client lo importan como dependencia.
3. **Ink puro** para toda la TUI. Tablas implementadas con `Box` + `flexDirection`.
4. **Sin tests automatizados para el TUI**. La lógica ya está cubierta por unit tests de `git.ts`.
5. **`readline` nativo de Node** para el prompt de selección Web/TUI. 0 dependencias extra.

---

## PR #1 — Implementación real

### Shared types
- `shared/src/index.ts` con `MergeInfo`, `BranchInfo`, `BranchStatus`, `ArchivedBranch`, `BranchesResult`
- `BranchesResult` ampliado con `currentBranch: string | null`
- `client/src/types.ts` eliminado, imports migrados a `@forgottenbranches/types`

### Tests implementados (106 total, todos pasan)

| Fichero | Tests | Capa |
|---|---|---|
| `server/src/git.test.ts` | 39 | Unit: detectMainBranch, getBranches (6 estados), deleteBranch (safe/force/protected), archiveBranch (con -f), restoreArchivedBranch, deleteArchivedBranch, getArchivedBranches, deleteBranches (bulk), edge cases |
| `server/src/app.test.ts` | 15 | Integration: todos los endpoints REST (branches, archive, bulk-delete, archived, unarchive), validación de path, manejo de errores |
| `client/src/components/ToastContext.test.tsx` | 6 | Component: success/error/info toasts, dismiss timeout/click, múltiples |
| `client/src/components/ForceDeleteModal.test.tsx` | 7 | Component: render, selección/deselección, onConfirm, onClose, singular/plural |
| `e2e/app.spec.ts` | 4 | E2E: empty state, scan repo, stats bar, legend |

### Scripts
```bash
pnpm test          # 106 tests unit + integration
pnpm test:watch    # modo watch
pnpm test:ui       # UI visual
pnpm test:coverage # cobertura
pnpm test:e2e      # Playwright
```

---

## PR #3 — Implementación real

### Stack
- **Ink 7.0.3** (React para terminal) + **React 19.2.6**
- **lucide-react 0.469.0** (compatibilidad React 19)
- **ink-text-input 6.0.0** (input de texto en terminal)
- Servidor migrado a ESM (`"type": "module"`, `module: Node16`, imports con `.js`)

### CLI (3 modos)
```bash
forgottenbranches            # prompt: 1. Web / 2. Terminal
forgottenbranches --tui      # TUI directa
forgottenbranches --web      # navegador
forgottenbranches --tui /path/repo  # TUI con path auto-cargado
```

### TUI — Estructura de ficheros
```
server/src/tui/
├── app.tsx              # Orquestador: estado global + keyboard handler
├── colors.ts            # One Dark Pro → ANSI
├── components/
│   ├── Header.tsx       # Título, input path, botón Scan
│   ├── StatsBar.tsx     # Local/Forgotten/Main/Current/Archived
│   ├── FilterBar.tsx    # Search, status filter, sort
│   ├── BranchList.tsx   # Lista filtrada/ordenada de ramas
│   ├── BranchRow.tsx    # Fila: checkbox, 🔒, nombre, status, edad
│   ├── BranchDetail.tsx # Panel expandible: commit, merge, acciones
│   ├── ArchivedList.tsx # Vista de ramas archivadas
│   ├── ConfirmDialog.tsx # Confirmación archive/delete
│   ├── Toast.tsx        # Notificaciones success/error
│   └── HelpBar.tsx      # 3 secciones: Navigation, Actions, Archived
└── hooks/
    ├── useGitData.ts    # Llama a git.ts directamente
    └── useKeyboard.ts   # Wrapper useInput
```

### Teclas
| Tecla | Acción |
|---|---|
| `↑`/`↓` | Navegar ramas / ciclar filtros |
| `←`/`→` | Ciclar campo de orden |
| `↵` | Expandir/colapsar detalle |
| `Space` | Seleccionar rama |
| `Tab` | Alternar Branches / Archived |
| `/` | Editar path |
| `f` | Foco en filtros |
| `s` | Escanear repo |
| `a` | Archivar (simple o en masa) |
| `d` | Borrar (simple o en masa) |
| `r` | Restaurar archivada (simple o en masa) |
| `D` | Borrar permanente archivada (simple o en masa) |
| `q`/`Esc` | Salir |

### Ramas protegidas (Web + TUI)
- 🔒 en `main`/`master` y rama actual
- Motivo: "main branch" o "current checked-out branch"
- Acciones bloqueadas con mensaje descriptivo

### Tests del TUI (35 nuevos, dentro de los 106)
| Fichero | Tests |
|---|---|
| `server/src/cli.test.ts` | 11: argument parsing, --web/--tui, showPrompt, getVersion |
| `server/src/tui/colors.test.ts` | 4: validación COLORS y STATUS_COLORS |
| `server/src/tui/hooks/useGitData.test.ts` | 3: fetch, error, graceful fallback |
| `server/src/tui/components/BranchRow.test.ts` | 7: formatAge, truncado 40 chars |
| `server/src/tui/components/BranchList.test.ts` | 10 + 4: filtros, ordenación, detección protegidas |

---

## PR #2 — Pendiente

### Tareas restantes
- Hacer `package.json` publicable (`private: false`, `main`, `bin`, `files`)
- Instalar `tsup` y crear config para bundle único
- Crear API programática (`server/src/api.ts`)
- Actualizar `bin/cli.js` para compatibilidad con instalación npm local
- Script `prepublishOnly` + build de distribución
- Actualizar README con instrucciones `npm install forgottenbranches`
- GitHub Action de CI/CD para publicar en npm al pushear tag `v*`

---

## Referencia de versiones

| Versión | Cambios |
|---|---|
| v1.0.0 | Lanzamiento inicial |
| v1.0.1 | Toast notifications + Force Delete modal |
| v1.0.2 | Tests + npm distribution + Terminal UI |
