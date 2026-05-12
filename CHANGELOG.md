# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-05-12

### Added
- Scan any local git repository and classify every local branch by status: **Active**, **Forgotten**, **Orphan**, **Merged**, **Abandoned**
- One Dark Pro web UI that opens automatically in the browser on launch
- Expandable branch detail panel — last commit hash, author, date, message, age, merge info and reflog last checkout
- **Archive** branches as annotated tags (`archive/<name>`) to preserve history without cluttering `git branch`
- **Unarchive** — restore a branch from its archive tag at any time
- **Delete** branches individually or in bulk, with safe (`-d`) or forced (`-D`) mode
- Multi-select with bulk action bar for archive and delete operations
- Filter by branch name and by status via interactive pills
- Sort by name, commit date, age or status (default: active branches first)
- Project history saved in `localStorage` for quick re-scanning of recent repositories
- `install.sh` — installs dependencies, builds and registers the global `forgottenbranches` command
- `update.sh` — pulls latest changes, reinstalls dependencies if needed and rebuilds
- `uninstall.sh` — removes the global command, desktop entry and build artifacts
- pnpm workspace setup (`server/` + `client/` packages)
- MIT License

[1.0.0]: https://github.com/raulfdeztdo/forgottenbranches/releases/tag/v1.0.0
