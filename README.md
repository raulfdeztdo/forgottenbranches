<!-- PROJECT SHIELDS -->
[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Issues][issues-shield]][issues-url]
[![License][license-shield]][license-url]
[![Release][release-shield]][release-url]

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <h1>
    <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyOCIgaGVpZ2h0PSIyOCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNjNjc4ZGQiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48bGluZSB4MT0iNiIgeTE9IjMiIHgyPSI2IiB5Mj0iMTUiLz48Y2lyY2xlIGN4PSIxOCIgY3k9IjYiIHI9IjMiLz48Y2lyY2xlIGN4PSI2IiBjeT0iMTgiIHI9IjMiLz48cGF0aCBkPSJNMTggOWE5IDkgMCAwIDAtOSA5Ii8+PC9zdmc+" alt="" style="vertical-align: middle; margin-right: 4px;" />
    Forgotten Branches
  </h1>

  <p align="center">
    Encuentra y limpia ramas locales olvidadas en tus repositorios git.
    <br />
    <a href="#uso"><strong>Explorar la documentación »</strong></a>
    <br />
    <br />
    <a href="https://github.com/raulfdeztdo/forgottenbranches/issues">Reportar Bug</a>
    ·
    <a href="https://github.com/raulfdeztdo/forgottenbranches/issues">Solicitar Funcionalidad</a>
  </p>

  <p align="center">
    <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=black" alt="React" />
    <img src="https://img.shields.io/badge/Vite-6-646CFF?style=flat&logo=vite&logoColor=white" alt="Vite" />
    <img src="https://img.shields.io/badge/Express-4-000000?style=flat&logo=express&logoColor=white" alt="Express" />
    <img src="https://img.shields.io/badge/Node.js-22-339933?style=flat&logo=nodedotjs&logoColor=white" alt="Node.js" />
    <img src="https://img.shields.io/badge/pnpm-F69220?style=flat&logo=pnpm&logoColor=white" alt="pnpm" />
    <img src="https://img.shields.io/badge/Git-F05032?style=flat&logo=git&logoColor=white" alt="Git" />
    <img src="https://img.shields.io/badge/Vitest-4-6E9F18?style=flat&logo=vitest&logoColor=white" alt="Vitest" />
    <img src="https://img.shields.io/badge/Playwright-45ba4b?style=flat&logo=playwright&logoColor=white" alt="Playwright" />
    <img src="https://img.shields.io/badge/Ink-7-764ABC?style=flat&logo=react&logoColor=white" alt="Ink" />
  </p>

  <br />
  <img src="media/template.png" alt="Forgotten Branches — interfaz web escaneando un repositorio en macOS" width="820" />
</div>

<!-- TABLE OF CONTENTS -->
<details open>
  <summary>Tabla de contenidos</summary>
  <ol>
    <li><a href="#sobre-el-proyecto">Sobre el proyecto</a></li>
    <li><a href="#plataformas-soportadas">Plataformas soportadas</a></li>
    <li>
      <a href="#primeros-pasos">Primeros pasos</a>
      <ul>
        <li><a href="#prerrequisitos">Prerrequisitos</a></li>
        <li><a href="#instalación">Instalación</a></li>
        <li><a href="#actualizar">Actualizar</a></li>
      </ul>
    </li>
    <li><a href="#uso">Uso</a></li>
    <li><a href="#terminal-ui">Terminal UI (TUI)</a></li>
    <li><a href="#ramas-protegidas">Ramas protegidas</a></li>
    <li><a href="#funcionalidades">Funcionalidades</a></li>
    <li><a href="#testing">Testing</a></li>
    <li><a href="#desarrollo">Desarrollo</a></li>
    <li><a href="#cómo-funciona">Cómo funciona</a></li>
    <li><a href="#licencia">Licencia</a></li>
    <li><a href="#contacto">Contacto</a></li>
  </ol>
</details>

## Sobre el proyecto

Muchas veces se suben ramas a producción, se mergean y se quedan abandonadas en local sin que nadie las borre. Con el tiempo se acumulan decenas de ramas que ensucian el output de `git branch` y dificultan el día a día.

**Forgotten Branches** escanea cualquier repositorio git, analiza cada rama local y te dice cuáles son seguras de eliminar, cuáles es mejor archivar y cuáles están activas. Ofrece dos interfaces: una **Web UI** que se abre en el navegador y una **Terminal UI (TUI)** interactiva con navegación por teclado.

### ¿Por qué esta herramienta?

- **Sin depender de un servidor** — Todo se ejecuta en local, sin conexión externa.
- **Clasificación inteligente** — No solo lista ramas: las clasifica según su estado real (mergeadas, huérfanas, abandonadas...).
- **Dos interfaces** — Web UI moderna con tema One Dark Pro, y TUI interactiva para la terminal (Ink + React).
- **Archivado** — Guarda el historial de ramas que ya no necesitas sin perder la referencia.
- **Borrado en masa** — Limpia decenas de ramas en segundos.
- **Protección de ramas** — `main`/`master` y la rama actual están protegidas contra borrado/archivado.

## Plataformas soportadas

- **macOS**
- **Linux**
- **Windows con WSL**

## Primeros pasos

### Prerrequisitos

- [Node.js](https://nodejs.org) 18 o superior
- [pnpm](https://pnpm.io) 9 o superior (`npm install -g pnpm`)
- [Git](https://git-scm.com) 2.30 o superior

### Instalación

```bash
git clone https://github.com/raulfdeztdo/forgottenbranches.git
cd forgottenbranches
chmod +x install.sh update.sh uninstall.sh
./install.sh
```

El script instala las dependencias, compila el proyecto y registra el comando `forgottenbranches` de forma global. También añade un acceso directo en el menú de aplicaciones del sistema.

### Actualizar

```bash
./update.sh
```

Hace `git pull`, reinstala dependencias si hay nuevas y recompila. Si ya estás en la última versión te lo indica sin hacer nada.

## Uso

```bash
# Modo interactivo — elige entre Web UI y Terminal
forgottenbranches

# Web UI directamente (abre el navegador)
forgottenbranches --web

# Terminal UI directamente
forgottenbranches --tui

# Abrir y escanear un repo directamente
forgottenbranches --web /home/usuario/proyectos/mi-app
forgottenbranches --tui /home/usuario/proyectos/mi-app
```

En el modo interactivo, la aplicación muestra un prompt para elegir entre la interfaz web y la interfaz de terminal.

### Estados de las ramas

| Estado | Color | Significado |
|--------|-------|-------------|
| **Active** | 🟢 | Actividad reciente, en uso |
| **Forgotten** | 🔴 | Mergeada en main + upstream borrado del remoto |
| **Orphan** | 🟠 | Upstream borrado del remoto, sin mergear |
| **Merged** | 🟡 | Ya está en main, upstream sigue vivo |
| **Abandoned** | ⚪ | Sin actividad en +90 días (o +60 sin upstream) |

## Terminal UI (TUI)

La TUI ofrece una experiencia interactiva completa directamente en la terminal, construida con [Ink](https://github.com/vadimdemedes/ink) (React para terminal) y React 19.

### Navegación por teclado

| Tecla | Acción |
|---|---|
| `↑` / `↓` | Navegar entre ramas / ciclar filtros |
| `←` / `→` | Cambiar campo de ordenación |
| `↵` Enter | Expandir/colapsar detalle de rama |
| `Space` | Seleccionar/deseleccionar rama |
| `Tab` | Alternar vista Branches / Archived |
| `/` | Editar la ruta del repositorio |
| `s` | Escanear repositorio |
| `f` | Enfocar filtros (estado y orden) |
| `a` | Archivar rama(s) seleccionada(s) |
| `d` | Eliminar rama(s) seleccionada(s) |
| `r` | Restaurar rama archivada (en vista Archived) |
| `D` | Eliminar permanentemente archivada |
| `q` / `Esc` | Salir |

### Operaciones en masa

Selecciona varias ramas con `Space` y ejecuta la acción (`a` archivar / `d` eliminar / `r` restaurar). Un contador muestra cuántas ramas están seleccionadas y qué acción se ejecutará.

## Ramas protegidas

Las ramas `main`, `master` y la rama actualmente activa (checked-out) están protegidas contra archivado y eliminación, tanto en la Web UI como en la TUI.

- **Indicador visual**: icono 🔒 junto al nombre de la rama
- **Motivo**: tooltip/texto indicando si es _"main branch"_ o _"current checked-out branch"_
- **Acciones bloqueadas**: los botones de Archive/Delete se ocultan o muestran un mensaje explicativo

## Funcionalidades

- **Dos interfaces** — Web UI (One Dark Pro) y Terminal UI (Ink + React) con navegación completa por teclado.
- **Análisis completo por rama** — nombre, upstream, último commit (hash, autor, fecha, mensaje), antigüedad, último checkout del reflog.
- **Información de merge** — qué commit la mergeó en main, cuándo y con qué mensaje.
- **Panel de detalle desplegable** — clic en cualquier rama para ver todos los datos (Web UI); `↵` para expandir (TUI).
- **Ramas protegidas** — `main`, `master` y rama actual marcadas con 🔒. No se pueden archivar ni borrar.
- **Vista de archivadas** — Tab para alternar entre ramas activas y archivadas. Restaurar o eliminar permanentemente.
- **Eliminar ramas** — individual o en masa, con borrado seguro (`-d`) o forzado (`-D`).
- **Archivar ramas** — crea un tag anotado `archive/<nombre>` y borra la rama local.
- **Desarchivar** — restaura la rama desde el tag de archivo.
- **Selección múltiple** — checkboxes en cada fila con barra de acciones para operar sobre varias ramas a la vez.
- **Operaciones en masa en TUI** — `Space` para seleccionar, `a`/`d`/`r`/`D` para actuar sobre todas las seleccionadas.
- **Historial de proyectos** — las rutas escaneadas se guardan en `localStorage` (Web UI).
- **Filtros** — por nombre de rama y por estado mediante pills interactivas (Web) o teclado (TUI).
- **Ordenación** — por nombre, fecha de commit, antigüedad o estado (por defecto: activas primero).

## Testing

El proyecto incluye una suite completa de tests automatizados que cubren backend, frontend, y flujos end-to-end.

```bash
pnpm test              # Unit + integration tests (Vitest)
pnpm test:watch        # Modo watch
pnpm test:ui           # Interfaz visual de Vitest
pnpm test:coverage     # Reporte de cobertura
pnpm test:e2e          # Tests end-to-end (Playwright)
pnpm test:e2e:ui       # Playwright UI
pnpm test:all          # Todos los tests
```

### Estructura de tests

| Capa | Tecnología | Ubicación |
|---|---|---|
| Lógica git (`git.ts`) | Vitest + mock `child_process` | `server/src/git.test.ts` |
| API REST (`app.ts`) | Vitest + supertest | `server/src/app.test.ts` |
| Componentes React | Vitest + Testing Library + jsdom | `client/src/components/*.test.tsx` |
| End-to-end | Playwright (Chromium) | `e2e/*.spec.ts` |

### Convenciones

- Los tests se **co-localizan** con el código fuente (`src/foo.ts` → `src/foo.test.ts`)
- **TDD siempre que sea posible**: escribe el test antes del código
- Antes de un PR: `pnpm run build && pnpm test && pnpm test:e2e`
- Más información en `.agents/skills/testing/SKILL.md`

## Desarrollo

```bash
# Instalar dependencias (workspaces server + client en un solo comando)
pnpm install

# Iniciar servidores de desarrollo (Express :3001 + Vite :5173)
pnpm run dev

# Compilar para producción
pnpm run build
```

El backend escucha en `localhost:3001` y el frontend en `localhost:5173` con proxy de Vite hacia la API.

## Cómo funciona

```
┌─────────────┐      ┌──────────────┐     ┌───────────┐
│  React UI   │────▶│  Express API │────▶│  git CLI  │
│  (Vite)     │◀────│  (Node.js)   │◀────│  (local)  │
└─────────────┘      └──────────────┘     └───────────┘
```

El backend Express ejecuta comandos `git` directamente sobre tus repositorios locales usando `child_process`. El frontend React muestra los resultados en una interfaz con tema One Dark Pro. En producción, un solo proceso Node.js sirve tanto la API como el frontend compilado — no necesitas arrancar dos procesos.

Todo ocurre en tu máquina. No se envía ningún dato al exterior.

## Licencia

Distribuido bajo la licencia MIT. Ver `LICENSE` para más información.

## Contacto

Raúl Fernández Tirado — [@raulfdeztdo](https://github.com/raulfdeztdo)

Repositorio: [https://github.com/raulfdeztdo/forgottenbranches](https://github.com/raulfdeztdo/forgottenbranches)

<!-- MARKDOWN LINKS & IMAGES -->
[contributors-shield]: https://img.shields.io/github/contributors/raulfdeztdo/forgottenbranches.svg?style=for-the-badge
[contributors-url]: https://github.com/raulfdeztdo/forgottenbranches/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/raulfdeztdo/forgottenbranches.svg?style=for-the-badge
[forks-url]: https://github.com/raulfdeztdo/forgottenbranches/network/members
[issues-shield]: https://img.shields.io/github/issues/raulfdeztdo/forgottenbranches.svg?style=for-the-badge
[issues-url]: https://github.com/raulfdeztdo/forgottenbranches/issues
[license-shield]: https://img.shields.io/github/license/raulfdeztdo/forgottenbranches.svg?style=for-the-badge&cacheSeconds=0
[license-url]: https://github.com/raulfdeztdo/forgottenbranches/blob/main/LICENSE
[release-shield]: https://img.shields.io/github/v/release/raulfdeztdo/forgottenbranches?style=for-the-badge&color=purple
[release-url]: https://github.com/raulfdeztdo/forgottenbranches/releases/latest
