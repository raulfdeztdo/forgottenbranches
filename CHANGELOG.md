# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] — 2026-05-13

### Added
- **Toast notifications** — success and error feedback appears bottom-right after every delete, archive, restore and permanent-delete operation, both individual and bulk
- **Force Delete modal** — when a bulk delete finds branches that are not fully merged into main, a modal lists them with their error reason; the user can select which ones to force-delete (`git branch -D`) without having to act on each one individually

### Fixed
- Branch name column and Date column were misaligned because `display: flex` was applied directly on `<td>` elements, breaking the `table-layout: fixed` model; flex layout moved to inner wrapper divs
- Clicking anywhere inside the checkbox cell (outside the icon) was incorrectly opening the branch detail panel instead of toggling the checkbox; the `onClick` + `stopPropagation` now covers the entire `<td>` in both `BranchTable` and `ArchivedTable`

[1.0.1]: https://github.com/raulfdeztdo/forgottenbranches/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/raulfdeztdo/forgottenbranches/releases/tag/v1.0.0
