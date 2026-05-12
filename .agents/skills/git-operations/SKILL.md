---
name: git-operations
description: Implementar análisis y operaciones git seguras mediante child_process en Node.js. Usar cuando se trabaje con la lógica de escaneo, clasificación o manipulación de ramas en el backend (services/, routes/). Cubre execFile seguro, parsing de salida git, clasificación de ramas y operaciones destructivas.
---

# Git Operations — Forgotten Branches

Guía específica para implementar operaciones git seguras en el backend de esta herramienta. Toda ejecución git ocurre en local sobre rutas proporcionadas por el usuario.

## Regla de oro: execFile, nunca exec

```typescript
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// ✅ Correcto — argumentos separados, sin inyección posible
const { stdout } = await execFileAsync("git", ["branch", "-vv"], { cwd: repoPath });

// ❌ Incorrecto — string interpolado, vulnerable a inyección
const { stdout } = await exec(`git branch -vv ${repoPath}`);
```

## Validar la ruta del repositorio

Antes de ejecutar cualquier comando git, verificar que la ruta es un repositorio válido:

```typescript
import { execFile } from "child_process";
import { promisify } from "util";
import * as path from "path";
import * as fs from "fs/promises";

const execFileAsync = promisify(execFile);

export async function validateGitRepo(repoPath: string): Promise<void> {
  // 1. La ruta debe existir y ser un directorio
  const stat = await fs.stat(repoPath);
  if (!stat.isDirectory()) {
    throw new Error(`Not a directory: ${repoPath}`);
  }

  // 2. Debe ser un repositorio git
  try {
    await execFileAsync("git", ["rev-parse", "--git-dir"], { cwd: repoPath });
  } catch {
    throw new Error(`Not a git repository: ${repoPath}`);
  }
}
```

## Clasificación de ramas — lógica central

Los cinco estados y sus condiciones de detección:

```typescript
export type BranchStatus = "Active" | "Forgotten" | "Orphan" | "Merged" | "Abandoned";

interface BranchInfo {
  name: string;
  upstream: string | null;
  upstreamGone: boolean;
  isMergedIntoMain: boolean;
  lastCommitDate: Date;
  lastCheckoutDate: Date | null;
}

const ABANDONED_DAYS = 90;
const ABANDONED_NO_UPSTREAM_DAYS = 60;

export function classifyBranch(branch: BranchInfo): BranchStatus {
  const daysSinceCommit = daysDiff(branch.lastCommitDate);
  const daysSinceCheckout = branch.lastCheckoutDate
    ? daysDiff(branch.lastCheckoutDate)
    : daysSinceCommit;
  const inactiveDays = Math.min(daysSinceCommit, daysSinceCheckout);

  // Forgotten: mergeada + upstream eliminado
  if (branch.isMergedIntoMain && branch.upstreamGone) {
    return "Forgotten";
  }

  // Orphan: upstream eliminado, sin mergear
  if (branch.upstreamGone && !branch.isMergedIntoMain) {
    return "Orphan";
  }

  // Merged: en main, upstream sigue vivo
  if (branch.isMergedIntoMain && !branch.upstreamGone) {
    return "Merged";
  }

  // Abandoned: inactividad prolongada
  const threshold = branch.upstream
    ? ABANDONED_DAYS
    : ABANDONED_NO_UPSTREAM_DAYS;
  if (inactiveDays >= threshold) {
    return "Abandoned";
  }

  return "Active";
}

function daysDiff(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}
```

## Obtener información de ramas

```typescript
// Listar ramas con upstream tracking
export async function getBranchesWithTracking(repoPath: string): Promise<string[]> {
  const { stdout } = await execFileAsync(
    "git",
    ["branch", "-vv", "--format=%(refname:short)\t%(upstream:short)\t%(upstream:track)"],
    { cwd: repoPath }
  );
  return stdout.trim().split("\n").filter(Boolean);
}

// Comprobar si una rama está mergeada en main/master
export async function isMergedIntoMain(repoPath: string, branchName: string): Promise<boolean> {
  const mainBranch = await getMainBranch(repoPath);
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["branch", "--merged", mainBranch, "--list", branchName],
      { cwd: repoPath }
    );
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

// Detectar rama principal (main o master)
export async function getMainBranch(repoPath: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["symbolic-ref", "refs/remotes/origin/HEAD"],
      { cwd: repoPath }
    );
    // refs/remotes/origin/main → main
    return stdout.trim().replace("refs/remotes/origin/", "");
  } catch {
    // Fallback: buscar main o master localmente
    const { stdout } = await execFileAsync(
      "git",
      ["branch", "--list", "main", "master"],
      { cwd: repoPath }
    );
    const found = stdout.trim().replace(/^\*?\s+/, "").split("\n")[0];
    return found || "main";
  }
}

// Obtener último commit de una rama
export async function getLastCommit(repoPath: string, branchName: string) {
  const format = "%H\t%an\t%ae\t%aI\t%s";
  const { stdout } = await execFileAsync(
    "git",
    ["log", "-1", `--format=${format}`, branchName],
    { cwd: repoPath }
  );
  const [hash, authorName, authorEmail, date, subject] = stdout.trim().split("\t");
  return { hash, authorName, authorEmail, date: new Date(date), subject };
}

// Obtener último checkout del reflog
export async function getLastCheckout(repoPath: string, branchName: string): Promise<Date | null> {
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["reflog", "--format=%aI", "--date=iso-strict", `refs/heads/${branchName}`],
      { cwd: repoPath }
    );
    const lines = stdout.trim().split("\n").filter(Boolean);
    return lines.length > 0 ? new Date(lines[0]) : null;
  } catch {
    return null;
  }
}
```

## Operaciones destructivas — borrado y archivado

```typescript
// Borrado seguro (solo si mergeada)
export async function deleteBranchSafe(repoPath: string, branchName: string): Promise<void> {
  await execFileAsync("git", ["branch", "-d", branchName], { cwd: repoPath });
}

// Borrado forzado
export async function deleteBranchForce(repoPath: string, branchName: string): Promise<void> {
  await execFileAsync("git", ["branch", "-D", branchName], { cwd: repoPath });
}

// Archivar: crear tag anotado y borrar rama
export async function archiveBranch(repoPath: string, branchName: string): Promise<void> {
  const tagName = `archive/${branchName}`;
  const message = `Archived branch ${branchName} on ${new Date().toISOString()}`;

  // Crear tag anotado apuntando al tip de la rama
  await execFileAsync(
    "git",
    ["tag", "-a", tagName, branchName, "-m", message],
    { cwd: repoPath }
  );

  // Borrar la rama (forzado porque el tag preserva el historial)
  await execFileAsync("git", ["branch", "-D", branchName], { cwd: repoPath });
}

// Desarchivar: restaurar rama desde tag de archivo
export async function unarchiveBranch(repoPath: string, branchName: string): Promise<void> {
  const tagName = `archive/${branchName}`;
  await execFileAsync(
    "git",
    ["checkout", "-b", branchName, tagName],
    { cwd: repoPath }
  );
}
```

## Manejo de errores git

Convertir errores de git en respuestas HTTP estructuradas:

```typescript
export class GitError extends Error {
  constructor(
    message: string,
    public readonly gitCommand: string,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = "GitError";
  }
}

export function handleGitError(err: unknown, command: string): never {
  if (err instanceof Error) {
    const msg = err.message;

    if (msg.includes("not a git repository")) {
      throw new GitError("Not a git repository", command, 400);
    }
    if (msg.includes("no such branch")) {
      throw new GitError("Branch not found", command, 404);
    }
    if (msg.includes("already exists")) {
      throw new GitError("Branch or tag already exists", command, 409);
    }
    if (msg.includes("error: The branch") && msg.includes("is not fully merged")) {
      throw new GitError(
        "Branch is not fully merged. Use force delete if you're sure.",
        command,
        409
      );
    }

    // Error genérico — no exponer detalles en producción
    const isDev = process.env.NODE_ENV !== "production";
    throw new GitError(
      isDev ? msg : "Git operation failed",
      command,
      500
    );
  }
  throw new GitError("Unknown error", command, 500);
}
```

## Seguridad — NO exponer rutas en producción

```typescript
// ❌ Incorrecto: la ruta del usuario aparece en la respuesta de error
res.status(500).json({ error: `Failed to scan ${repoPath}` });

// ✅ Correcto: error genérico para el cliente, ruta solo en logs internos
console.error(`[git-scan] Error in ${repoPath}:`, err);
res.status(500).json({ error: "Failed to scan repository" });
```

## Checklist antes de implementar operaciones git

- [ ] ¿Se usa `execFile` con array de argumentos (no `exec` con string)?
- [ ] ¿Se valida que la ruta es un repo git antes de operar?
- [ ] ¿Las operaciones destructivas (delete, archive) tienen confirmación en el cliente?
- [ ] ¿Los errores git se convierten en respuestas HTTP con código apropiado?
- [ ] ¿Las rutas del usuario no se exponen en mensajes de error en producción?
- [ ] ¿El borrado seguro usa `-d` y el forzado usa `-D` explícitamente?
