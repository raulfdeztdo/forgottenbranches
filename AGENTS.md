# AGENTS.md — Forgotten Branches

Guía de referencia para agentes de IA que trabajen en este proyecto.
Lee este fichero antes de tocar cualquier cosa.

---

## Descripción del proyecto

**Forgotten Branches** es una herramienta CLI + interfaz web local que escanea repositorios git y clasifica las ramas locales según su estado (activa, olvidada, huérfana, mergeada, abandonada). Todo ocurre en local; no hay servidor externo, base de datos ni autenticación.

Stack: TypeScript · Node.js 22 · Express 4 · React 18 · Vite 6 · Vitest 4 · Playwright · Git CLI

---

## Estructura de ficheros

```
forgottenbranches/
├── bin/
│   └── cli.js                  # Punto de entrada CLI (registrado como comando global)
├── client/                     # Frontend React + Vite
│   ├── src/
│   │   ├── components/         # Componentes React reutilizables
│   │   ├── hooks/              # Custom hooks
│   │   └── main.tsx            # Entrada de la SPA
│   ├── index.html
│   └── vite.config.ts
├── server/                     # Backend Express
│   ├── src/
│   │   ├── app.ts              # Rutas REST y middleware Express
│   │   ├── git.ts              # Lógica de negocio (git CLI)
│   │   ├── cli.ts              # Entry point producción
│   │   └── index.ts            # Entry point desarrollo
│   └── tsconfig.json
├── shared/                     # Tipos TypeScript compartidos
│   └── src/
│       └── index.ts            # BranchInfo, BranchesResult, etc.
├── e2e/                        # Tests end-to-end con Playwright
├── .agents/
│   └── skills/                 # Skills disponibles para agentes IA
├── AGENTS.md                   # Este fichero
├── opencode.jsonc              # Plantilla de configuración OpenCode (commiteable)
├── opencode.json               # Config local con secrets (en .gitignore)
├── package.json                # Scripts raíz (dev, build, test, install:all)
├── install.sh                  # Instalador global
└── update.sh                   # Actualizador
```

---

## Arquitectura

```
┌─────────────┐     ┌──────────────┐     ┌───────────┐
│  React UI   │────▶│  Express API │────▶│  git CLI  │
│  (Vite)     │◀────│  (Node.js)   │◀────│  (local)  │
└─────────────┘     └──────────────┘     └───────────┘
```

- El backend ejecuta comandos `git` vía `child_process` sobre rutas locales del usuario.
- En desarrollo: Express en `:3001`, Vite en `:5173` con proxy hacia la API.
- En producción: un único proceso Node.js sirve la API y el frontend compilado.

---

## Comandos principales

```bash
npm run dev           # Levanta Express + Vite en modo desarrollo
npm run build         # Compila cliente y servidor
npm run install:all   # Instala dependencias de server/ y client/
npm test              # Unit tests + integration tests (Vitest)
npm run test:watch    # Tests en modo watch
npm run test:ui       # UI visual de Vitest
npm run test:coverage # Tests con reporte de cobertura
npm run test:e2e      # Tests end-to-end (Playwright)
npm run test:all      # Todos los tests (unit + integration + e2e)
./install.sh          # Instalación global (registra el comando `forgottenbranches`)
./update.sh           # Actualiza dependencias y recompila
```

---

## Testing — obligatorio

**En cada PR con cambios de código deben añadirse tests.** Sin excepción.

### Antes de empezar a desarrollar

1. Carga la skill `testing` para conocer los patrones y convenciones.
2. Lee los tests existentes relacionados con el código que vas a tocar.
3. Ejecuta `pnpm test` para ver el estado actual.

### Durante el desarrollo

1. Escribe tests **antes** de implementar el cambio (TDD cuando sea posible).
2. Si tocas `git.ts` → añade tests en `server/src/git.test.ts`.
3. Si tocas `app.ts` → añade tests en `server/src/app.test.ts`.
4. Si creas o modificas un componente React → añade tests en `client/src/components/Nombre.test.tsx`.
5. Si añades un nuevo flujo de UI → añade un test e2e en `e2e/`.

### Antes de commitear o abrir PR

```bash
pnpm run build        # Verifica que compila sin errores
pnpm test             # Todos los tests deben pasar (unit + integration)
pnpm test:e2e         # Tests end-to-end deben pasar
```

**Un PR no puede mergearse si algún test falla o si no incluye tests para el nuevo código.**

### Stack de testing

| Herramienta | Uso |
|---|---|
| **Vitest 4** | Unit + integration runner |
| **@testing-library/react** | Tests de componentes React |
| **supertest** | Tests HTTP de la API Express |
| **Playwright** | Tests end-to-end (Chromium) |

### Patrón de archivos

- `server/src/*.test.ts` — Tests de backend (entorno node)
- `client/src/**/*.test.tsx` — Tests de componentes React (entorno jsdom)
- `e2e/*.spec.ts` — Tests end-to-end con Playwright
- Los test files están excluidos de la compilación TypeScript (`tsconfig.json` → `exclude`)

---

## Convenciones de código

### General
- TypeScript estricto en ambos paquetes (server y client).
- Sin dependencias externas innecesarias; la herramienta debe funcionar offline.
- Todos los comandos git se ejecutan con `child_process.execFile` (no `exec` con string), para evitar inyección.

### Backend (server/)
- Organización por capas: `routes/` → `services/` (lógica git).
- Manejo de errores centralizado con middleware Express al final.
- Los errores de `git` se convierten en respuestas HTTP estructuradas con código y mensaje legible.
- Usa la skill `nodejs-backend-patterns` y `nodejs-best-practices` para decisiones de arquitectura.
- Usa la skill `bash-defensive-patterns` al escribir scripts shell (`install.sh`, `update.sh`).

### Frontend (client/)
- React funcional con hooks; sin clases.
- Tema visual: One Dark Pro. Paleta coherente con CSS variables.
- Los estados de rama (`Active`, `Forgotten`, `Orphan`, `Merged`, `Abandoned`) tienen colores fijos; no los cambies sin consenso.
- Usa la skill `frontend-design` para nuevos componentes o rediseños visuales.
- Usa la skill `accessibility` al añadir elementos interactivos.

### Scripts shell
- Usa la skill `bash-defensive-patterns` siempre que modifiques `install.sh` o `update.sh`.
- `set -Eeuo pipefail` al inicio de cada script.

---

## Estados de rama — referencia rápida

| Estado     | Condición                                              | Color  |
|------------|--------------------------------------------------------|--------|
| Active     | Actividad reciente, en uso                             | Verde  |
| Forgotten  | Mergeada en main + upstream eliminado del remoto       | Rojo   |
| Orphan     | Upstream eliminado del remoto, sin mergear             | Naranja|
| Merged     | Ya está en main, upstream sigue vivo                   | Amarillo|
| Abandoned  | Sin actividad en +90 días (o +60 sin upstream)         | Gris   |

---

## Skills disponibles

| Skill                     | Cuándo usarla                                                  |
|---------------------------|----------------------------------------------------------------|
| `testing`                 | Al escribir, modificar o ejecutar tests; antes de cualquier PR |
| `accessibility`           | Al añadir o modificar elementos interactivos en la UI          |
| `bash-defensive-patterns` | Al editar `install.sh`, `update.sh` o cualquier script shell   |
| `frontend-design`         | Al crear componentes nuevos o rediseñar la interfaz            |
| `git-operations`          | Al trabajar con lógica de análisis/operaciones git del backend |
| `nodejs-backend-patterns` | Al diseñar rutas, servicios o middleware Express               |
| `nodejs-best-practices`   | Al tomar decisiones de arquitectura Node.js                    |
| `typescript-react-patterns`| Al escribir componentes, hooks o tipos TypeScript en el cliente|

---

## Lo que NO debes hacer

- No añadir dependencias de servidor externo (bases de datos, auth, cloud).
- No usar `exec()` con strings para ejecutar git; usa `execFile()` con arrays de argumentos.
- No exponer rutas de ficheros del usuario en logs o respuestas de error en producción.
- No modificar el tema visual sin revisar la paleta One Dark Pro existente.
- No commitear `opencode.json` (contiene API keys); está en `.gitignore`.

---

## MCP disponible

- **Context7** — Documentación actualizada de librerías. Úsalo para consultar APIs de React, Express, Vite, Node.js, etc. antes de escribir código.
