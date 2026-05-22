# Testing Skill — Forgotten Branches

Guía para escribir y ejecutar tests en el proyecto. Cárgala al añadir tests, al modificar código con tests existentes, o cuando se pida "escribir tests", "añadir tests" o "verificar tests".

---

## Stack de testing

| Herramienta | Uso |
|---|---|
| **Vitest 4** | Unit tests + Integration tests (backend y frontend) |
| **@testing-library/react** | Tests de componentes React |
| **@testing-library/jest-dom** | Matchers DOM (`toBeInTheDocument`, etc.) |
| **jsdom** | Entorno browser simulado para React |
| **supertest** | Tests HTTP de los endpoints Express |
| **Playwright** | Tests end-to-end en Chromium real |

---

## Estructura de tests

```
forgottenbranches/
├── vitest.config.ts              # Config raíz (workspace con proyectos server + client)
├── playwright.config.ts          # Config E2E
├── e2e/
│   └── app.spec.ts               # Tests end-to-end con Playwright
├── server/
│   ├── vitest.config.ts          # Config: entorno node, globals, include src/**/*.test.ts
│   └── src/
│       ├── git.test.ts           # Unit tests de lógica git (39 tests)
│       └── app.test.ts           # Integration tests de endpoints REST (15 tests)
└── client/
    ├── vitest.config.ts          # Config: entorno jsdom, setupFiles, include src/**/*.test.{ts,tsx}
    └── src/
        ├── setupTests.ts         # import '@testing-library/jest-dom/vitest'
        └── components/
            ├── ToastContext.test.tsx
            ├── ForceDeleteModal.test.tsx
            └── ... (más tests aquí)
```

---

## Scripts disponibles

```bash
pnpm test              # Ejecuta todos los tests unitarios + integración (vitest run)
pnpm test:watch        # Modo watch (re-ejecuta al cambiar archivos)
pnpm test:ui           # UI visual de Vitest
pnpm test:coverage     # Tests con reporte de cobertura
pnpm test:e2e          # Tests end-to-end con Playwright
pnpm test:e2e:ui       # Playwright con UI interactiva
pnpm test:all          # Unit + integration + e2e (todo)
```

---

## Convenciones de tests

### Naming y ubicación

- Los tests **co-localizan** con el código: `src/foo.ts` → `src/foo.test.ts`
- Los tests de componentes React usan extensión `.test.tsx`
- Los tests e2e van en `e2e/` con extensión `.spec.ts`
- Usa `describe` / `it` con nombres descriptivos en inglés

### Antes de empezar un nuevo desarrollo

1. Identifica qué funciones/componentes/endpoints vas a modificar
2. Lee los tests existentes para entender el comportamiento actual
3. Escribe tests para el nuevo comportamiento esperado
4. Implementa el cambio
5. Ejecuta `pnpm test` y verifica que **todos los tests existentes + los nuevos pasan**
6. Si modificas flujos de UI, añade o actualiza tests e2e
7. Ejecuta `pnpm run build` para verificar que compila

### Antes de commitear

```bash
pnpm run build        # Verifica que compila
pnpm test             # Verifica que todos los tests pasan
pnpm test:e2e         # Verifica tests end-to-end (requiere servidor dev)
```

---

## Patrones de mocking

### Mock de child_process (git.ts tests)

```ts
const execFileMock = vi.fn();
vi.mock('child_process', () => ({
  execFile: (...args: unknown[]) => {
    const cb = args[args.length - 1] as (err: Error | null, stdout?: { stdout: string }) => void;
    try {
      const result = execFileMock(...args);
      if (result instanceof Error) cb(result);
      else cb(null, { stdout: result ?? '', stderr: '' });
    } catch (err) {
      cb(err instanceof Error ? err : new Error(String(err)));
    }
  },
}));
```

### Mock de fs (app.ts integration tests)

```ts
vi.mock('fs', () => ({
  existsSync: (p: string) => {
    if (p === '/nonexistent') return false;
    return true;
  },
  statSync: () => ({ isDirectory: () => true }),
}));
```

### Mock de lucide-react (component tests)

```ts
vi.mock('lucide-react', () => ({
  AlertTriangle: () => null,
  CheckCircle: () => null,
  IconName: () => null,
}));
```

**Importante**: el `vi.mock` debe estar antes de los imports. Vitest hoistea los `vi.mock` al principio del archivo.

### Mock de módulos internos (app.ts integration tests)

```ts
vi.mock('./git', () => ({
  getBranches: (...args: unknown[]) => mockGetBranches(...args),
  deleteBranch: (...args: unknown[]) => mockDeleteBranch(...args),
  // ... todas las funciones exportadas
}));
```

---

## Patrones comunes

### test de componente React

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import MiComponente from './MiComponente';

vi.mock('lucide-react', () => ({ Icon: () => null }));

describe('MiComponente', () => {
  it('renderiza correctamente', () => {
    render(<MiComponente prop1="valor" />);
    expect(screen.getByText('valor')).toBeInTheDocument();
  });
});
```

### test e2e con Playwright

```ts
import { test, expect } from '@playwright/test';

test('flujo principal', async ({ page }) => {
  await page.goto('/');
  await page.locator('input.path-input').fill('/ruta/repo');
  await page.locator('button.scan-btn').click();
  await expect(page.locator('table.branch-table')).toBeVisible({ timeout: 15000 });
});
```

### test de API con supertest

```ts
import request from 'supertest';
import { createApp } from './app';

const res = await request(createApp()).get('/api/branches?path=/repo');
expect(res.status).toBe(200);
```

---

## Cuándo escribir cada tipo de test

| Situación | Tipo de test |
|---|---|
| Nueva función en `git.ts` | Unit test en `git.test.ts` |
| Nuevo endpoint o cambio en ruta | Integration test en `app.test.ts` |
| Nuevo componente React | Component test en `components/Nombre.test.tsx` |
| Nuevo flujo de usuario completo | E2E test en `e2e/` |
| Bug fix | Test que reproduzca el bug antes del fix |

---

## CI/CD

Los tests se ejecutan automáticamente en GitHub Actions:

- `pnpm test` — unit + integration en Node 18, 20, 22
- `pnpm test:e2e` — Playwright en Chromium
- `pnpm run build` — Verificación de compilación

No se puede mergear un PR si los tests no pasan.

---

## Notas importantes

- Los test files están excluidos de la compilación TypeScript en `tsconfig.json` (campo `exclude`)
- `playwright-report/` y `test-results/` están en `.gitignore`
- No uses `console.log` en tests — usa `expect` assertions
- Los tests deben ser deterministas: no dependas de fechas fijas, usa `new Date()` o `vi.useFakeTimers()`
- Para tests asíncronos usa `async/await`; para timers usa `vi.useFakeTimers()` + `vi.advanceTimersByTime()`
