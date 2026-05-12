# Contributing to Forgotten Branches

Thank you for your interest in contributing! This document explains how to set up the project locally, the conventions we follow and how to submit changes.

---

## Table of contents

- [Development setup](#development-setup)
- [Project structure](#project-structure)
- [Making changes](#making-changes)
- [Commit conventions](#commit-conventions)
- [Submitting a pull request](#submitting-a-pull-request)
- [Reporting bugs](#reporting-bugs)

---

## Development setup

### Requirements

- [Node.js](https://nodejs.org) 18 or later
- [pnpm](https://pnpm.io) 9 or later
- [Git](https://git-scm.com) 2.30 or later

### Steps

```bash
# 1. Fork and clone the repository
git clone https://github.com/<your-username>/forgottenbranches.git
cd forgottenbranches

# 2. Grant execution permissions to the scripts
chmod +x install.sh update.sh uninstall.sh

# 3. Install all dependencies (server + client workspaces)
pnpm install

# 4. Start the development servers
pnpm run dev
```

This starts:
- **Express API** on `http://localhost:3001`
- **Vite dev server** on `http://localhost:5173` (with proxy to the API)

Open `http://localhost:5173` in your browser.

---

## Project structure

```
forgottenbranches/
├── bin/              # CLI entry point
├── client/           # React + Vite frontend
│   └── src/
│       ├── components/
│       ├── hooks/
│       └── types/
├── server/           # Express backend
│   └── src/
│       ├── routes/
│       └── services/
├── install.sh        # Global install script
├── update.sh         # Update script
└── uninstall.sh      # Uninstall script
```

---

## Making changes

- **Backend** (`server/src/`) — Follow the `routes/ → services/` layer pattern. Use `execFile` with argument arrays for all git commands — never `exec` with a string. Errors must be caught and converted to structured HTTP responses.
- **Frontend** (`client/src/`) — Functional React components with hooks only. Theme: One Dark Pro. Branch status colors are defined in `client/src/statusConfig.ts` — do not redefine them elsewhere.
- **Shell scripts** — Always include `set -Eeuo pipefail` at the top. Use subshells `( cd dir && command )` instead of bare `cd && command`.
- **TypeScript** — Strict mode is enabled in both packages. No `any` unless genuinely unavoidable.

---

## Commit conventions

We use a simple prefix convention:

| Prefix | When to use |
|--------|-------------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `refactor:` | Code change with no feature or fix |
| `style:` | CSS / visual changes only |
| `docs:` | Documentation only |
| `chore:` | Build, config, dependencies |

Examples:

```
feat: add keyboard shortcut to trigger scan
fix: prevent crash when reflog is empty
docs: update installation steps for Windows WSL
chore: bump vite to v6.1.0
```

Commits must be written in **English**.

---

## Submitting a pull request

1. Create a branch from `main`:
   ```bash
   git checkout -b feat/my-feature
   ```
2. Make your changes and commit following the conventions above.
3. Make sure the project builds without errors:
   ```bash
   pnpm run build
   ```
4. Push your branch and open a pull request against `main`.
5. Describe what you changed and why in the PR description.

---

## Reporting bugs

Open an issue at [github.com/raulfdeztdo/forgottenbranches/issues](https://github.com/raulfdeztdo/forgottenbranches/issues) and include:

- Your OS and Node.js version
- Steps to reproduce
- Expected vs actual behaviour
- Any relevant error output from the terminal
