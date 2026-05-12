# AGENTS.md — Forgotten Branches

Guía de referencia para agentes de IA que trabajen en este proyecto.
Lee este fichero antes de tocar cualquier cosa.

---

## Descripción del proyecto

**Forgotten Branches** es una herramienta CLI + interfaz web local que escanea repositorios git y clasifica las ramas locales según su estado (activa, olvidada, huérfana, mergeada, abandonada). Todo ocurre en local; no hay servidor externo, base de datos ni autenticación.

Stack: TypeScript · Node.js 22 · Express 4 · React 18 · Vite 6 · Git CLI

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
│   │   ├── types/              # Tipos TypeScript compartidos cliente
│   │   └── main.tsx            # Entrada de la SPA
│   ├── index.html
│   └── vite.config.ts
├── server/                     # Backend Express
│   ├── src/
│   │   ├── routes/             # Endpoints REST
│   │   ├── services/           # Lógica de negocio (git CLI)
│   │   └── index.ts            # Entrada del servidor
│   └── tsconfig.json
├── .agents/
│   └── skills/                 # Skills disponibles para agentes IA
├── AGENTS.md                   # Este fichero
├── opencode.jsonc              # Plantilla de configuración OpenCode (commiteable)
├── opencode.json               # Config local con secrets (en .gitignore)
├── package.json                # Scripts raíz (dev, build, install:all)
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
./install.sh          # Instalación global (registra el comando `forgottenbranches`)
./update.sh           # Actualiza dependencias y recompila
```

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
