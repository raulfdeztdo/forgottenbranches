# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.2] — 2026-05-25

### Added
- **Terminal UI (TUI)** — interactive terminal interface built with Ink 7 + React 19, featuring keyboard navigation, branch list with status colors, expandable detail panels, and archive/delete/restore operations
- **3 launch modes** — running `forgottenbranches` shows a prompt to choose between Web UI and Terminal UI; `--web` and `--tui` flags skip the prompt
- **View archived branches in TUI** — `Tab` key toggles between active branches and archived branches views; `r` to restore, `D` to permanently delete
- **Bulk operations in TUI** — `Space` to select multiple branches, then `a` to archive all selected or `d` to delete all selected simultaneously
- **Protected branches** — `main`, `master` and the current checked-out branch are protected against archive/delete in both Web UI and TUI. Visual 🔒 indicator with reason ("main branch" or "current checked-out branch")
- **`@forgottenbranches/types` shared workspace** — consolidated TypeScript types (`BranchInfo`, `MergeInfo`, `BranchesResult`, `ArchivedBranch`) in a dedicated workspace, eliminating duplication between server and client
- **Comprehensive test suite** — 106 tests across 9 test files covering backend (git logic + API), frontend (React components), and end-to-end (Playwright)
- **Test infrastructure** — Vitest 4 workspace config (server + client projects), Playwright for e2e, GitHub Actions CI
- **Testing skill** — `.agents/skills/testing/SKILL.md` with mocking patterns and conventions

### Changed
- **Server migrated to ESM** (`"type": "module"`, `module: Node16`, `.js` extensions on imports) required for Ink 7 compatibility
- **React 18 → 19** in both server and client workspaces
- **lucide-react 1.14 → 0.469.0** for React 19 type compatibility
- **`bin/cli.js`** updated for ESM dynamic import and 3-mode launch
- **Server `tsconfig.json`** — added `jsx: react-jsx`, `module: Node16`, `moduleResolution: Node16`
- **`detectCurrentBranch()`** added to `git.ts` and exposed via `getBranches()` returning `currentBranch`
- **Archive now uses `-f`** flag on `git tag` to allow re-archiving branches with existing tags
- **Build pipeline** includes `shared/` workspace compilation step
- **`uninstall.sh`** now cleans `shared/dist/` build artifacts
- **`.gitignore`** — added build artifact directories and test artifacts

### Fixed
- Focus automatically returns to path input after a failed scan in TUI
- Selection cleared when switching between Branches and Archived views with `Tab`
- `spawn git ENOENT` fixed by passing `process.env` to `execFile` in git operations
- `__dirname` replaced with `fileURLToPath` shim for ESM compatibility in `app.ts` and `cli.ts`

[1.0.2]: https://github.com/raulfdeztdo/forgottenbranches/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/raulfdeztdo/forgottenbranches/compare/v1.0.0...v1.0.1
