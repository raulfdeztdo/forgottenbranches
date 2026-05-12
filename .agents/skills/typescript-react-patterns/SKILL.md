---
name: typescript-react-patterns
description: Escribir componentes React funcionales, custom hooks y tipos TypeScript robustos para el cliente de Forgotten Branches. Usar al crear nuevos componentes, hooks de datos, tipos de rama o al refactorizar el frontend.
---

# TypeScript + React Patterns — Forgotten Branches

Guía para escribir código frontend tipado, mantenible y coherente con la arquitectura existente del cliente (React 18 + Vite 6 + TypeScript estricto).

## Principios del proyecto

- **Sin clases**: solo componentes funcionales y hooks.
- **Tema One Dark Pro**: no cambiar colores de estado sin consenso.
- **Offline-first**: no asumir conectividad externa; todos los datos vienen de la API local en `:3001`.
- **TypeScript estricto**: no usar `any`; modelar bien los tipos desde la capa de servicio.

---

## Tipos de dominio — branch states

Definir los tipos en `client/src/types/` para compartirlos entre componentes y hooks:

```typescript
// client/src/types/branch.ts

export type BranchStatus = "Active" | "Forgotten" | "Orphan" | "Merged" | "Abandoned";

export interface CommitInfo {
  hash: string;
  shortHash: string;
  authorName: string;
  authorEmail: string;
  date: string; // ISO 8601
  subject: string;
}

export interface MergeInfo {
  mergeCommitHash: string;
  mergeCommitDate: string;
  mergeCommitMessage: string;
}

export interface Branch {
  name: string;
  status: BranchStatus;
  upstream: string | null;
  upstreamGone: boolean;
  lastCommit: CommitInfo;
  mergeInfo: MergeInfo | null;
  lastCheckoutDate: string | null; // ISO 8601
  isCurrent: boolean;
}

export interface ScanResult {
  repoPath: string;
  branches: Branch[];
  scannedAt: string; // ISO 8601
  mainBranch: string;
}
```

---

## Colores de estado — paleta One Dark Pro

No cambiar estos valores. Definirlos como constantes y usarlos desde los componentes:

```typescript
// client/src/constants/statusColors.ts

import type { BranchStatus } from "../types/branch";

export const STATUS_COLORS: Record<BranchStatus, { bg: string; text: string; dot: string }> = {
  Active:    { bg: "#1e3a2e", text: "#98c379", dot: "#98c379" },
  Merged:    { bg: "#3a3310", text: "#e5c07b", dot: "#e5c07b" },
  Orphan:    { bg: "#3a1f0a", text: "#d19a66", dot: "#d19a66" },
  Forgotten: { bg: "#3a1010", text: "#e06c75", dot: "#e06c75" },
  Abandoned: { bg: "#1e1e1e", text: "#5c6370", dot: "#5c6370" },
};
```

---

## Componentes — patrones

### Componente de presentación tipado

```typescript
// client/src/components/BranchStatusBadge.tsx
import type { BranchStatus } from "../types/branch";
import { STATUS_COLORS } from "../constants/statusColors";

interface BranchStatusBadgeProps {
  status: BranchStatus;
}

export function BranchStatusBadge({ status }: BranchStatusBadgeProps) {
  const colors = STATUS_COLORS[status];
  return (
    <span
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        padding: "2px 8px",
        borderRadius: "4px",
        fontSize: "12px",
        fontWeight: 500,
      }}
    >
      {status}
    </span>
  );
}
```

### Componente con estado local

```typescript
// client/src/components/BranchRow.tsx
import { useState } from "react";
import type { Branch } from "../types/branch";

interface BranchRowProps {
  branch: Branch;
  selected: boolean;
  onSelect: (name: string, selected: boolean) => void;
  onDelete: (name: string, force: boolean) => Promise<void>;
  onArchive: (name: string) => Promise<void>;
}

export function BranchRow({ branch, selected, onSelect, onDelete, onArchive }: BranchRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async (force: boolean) => {
    setLoading(true);
    try {
      await onDelete(branch.name, force);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* fila principal */}
      <div onClick={() => setExpanded(prev => !prev)}>
        <input
          type="checkbox"
          checked={selected}
          onChange={e => onSelect(branch.name, e.target.checked)}
          onClick={e => e.stopPropagation()} // evitar que el click propague al expand
        />
        <span>{branch.name}</span>
      </div>

      {/* detalle expandible */}
      {expanded && (
        <div>
          <p>Autor: {branch.lastCommit.authorName}</p>
          <p>Último commit: {branch.lastCommit.date}</p>
          <button disabled={loading} onClick={() => handleDelete(false)}>
            Borrar
          </button>
          <button disabled={loading} onClick={() => handleDelete(true)}>
            Borrar (forzado)
          </button>
          <button disabled={loading} onClick={() => onArchive(branch.name)}>
            Archivar
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## Custom hooks — patrones

### Hook de fetch con estado de carga y error

```typescript
// client/src/hooks/useBranchScan.ts
import { useState, useCallback } from "react";
import type { ScanResult } from "../types/branch";

interface UseBranchScanReturn {
  data: ScanResult | null;
  loading: boolean;
  error: string | null;
  scan: (repoPath: string) => Promise<void>;
}

export function useBranchScan(): UseBranchScanReturn {
  const [data, setData] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scan = useCallback(async (repoPath: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoPath }),
      });

      if (!res.ok) {
        const { error: msg } = await res.json();
        throw new Error(msg ?? `HTTP ${res.status}`);
      }

      const result: ScanResult = await res.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, scan };
}
```

### Hook para historial de proyectos en localStorage

```typescript
// client/src/hooks/useProjectHistory.ts
import { useState, useEffect } from "react";

const STORAGE_KEY = "forgottenbranches:history";
const MAX_ENTRIES = 10;

export function useProjectHistory() {
  const [history, setHistory] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  const addEntry = (path: string) => {
    setHistory(prev => {
      const filtered = prev.filter(p => p !== path);
      return [path, ...filtered].slice(0, MAX_ENTRIES);
    });
  };

  const removeEntry = (path: string) => {
    setHistory(prev => prev.filter(p => p !== path));
  };

  return { history, addEntry, removeEntry };
}
```

### Hook para selección múltiple

```typescript
// client/src/hooks/useSelection.ts
import { useState, useCallback } from "react";

export function useSelection(allItems: string[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = useCallback((name: string, value: boolean) => {
    setSelected(prev => {
      const next = new Set(prev);
      value ? next.add(name) : next.delete(name);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(allItems));
  }, [allItems]);

  const clearAll = useCallback(() => {
    setSelected(new Set());
  }, []);

  return {
    selected,
    toggle,
    selectAll,
    clearAll,
    count: selected.size,
    isSelected: (name: string) => selected.has(name),
  };
}
```

---

## Filtrado y ordenación tipados

```typescript
// client/src/utils/branchFilters.ts
import type { Branch, BranchStatus } from "../types/branch";

export type SortKey = "name" | "date" | "age" | "status";
export type SortDir = "asc" | "desc";

const STATUS_ORDER: Record<BranchStatus, number> = {
  Active: 0,
  Merged: 1,
  Orphan: 2,
  Forgotten: 3,
  Abandoned: 4,
};

export function filterBranches(
  branches: Branch[],
  search: string,
  activeStatuses: Set<BranchStatus>
): Branch[] {
  return branches.filter(b => {
    const matchesSearch = b.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = activeStatuses.size === 0 || activeStatuses.has(b.status);
    return matchesSearch && matchesStatus;
  });
}

export function sortBranches(branches: Branch[], key: SortKey, dir: SortDir): Branch[] {
  return [...branches].sort((a, b) => {
    let cmp = 0;
    switch (key) {
      case "name":
        cmp = a.name.localeCompare(b.name);
        break;
      case "date":
        cmp = new Date(a.lastCommit.date).getTime() - new Date(b.lastCommit.date).getTime();
        break;
      case "status":
        cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        break;
    }
    return dir === "asc" ? cmp : -cmp;
  });
}
```

---

## Convenciones importantes

1. **Exportaciones nombradas**, no default exports (facilita búsqueda y refactoring).
2. **Props interfaces** definidas justo encima del componente que las usa.
3. **Tipos en `src/types/`** si se comparten entre múltiples ficheros.
4. **No `any`**: si un tipo es desconocido, usar `unknown` y hacer narrowing.
5. **Errores de API**: siempre capturar con try/catch y mostrar al usuario, nunca silenciar.
6. **Efectos secundarios** (fetch, localStorage) encapsulados en custom hooks, nunca directamente en el render.
