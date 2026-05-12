#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"

# ── Logging ──────────────────────────────────────────────────────────────────
log_info()  { echo "  $*"; }
log_ok()    { echo "  ✓ $*"; }
log_warn()  { echo "  ⚠ $*" >&2; }
log_error() { echo "  ✗ $*" >&2; }

# ── Header ───────────────────────────────────────────────────────────────────
echo ""
echo "  Forgotten Branches — Uninstall"
echo "  ================================"
echo ""

# ── 1. Unlink global npm command ─────────────────────────────────────────────
log_info "[1/3] Removing global command..."

if command -v forgottenbranches &>/dev/null; then
  if cd "$SCRIPT_DIR" && pnpm unlink --global 2>/dev/null; then
    log_ok "Global command 'forgottenbranches' removed"
  else
    # Fallback: locate and remove symlink manually
    LINK_PATH="$(command -v forgottenbranches 2>/dev/null || true)"
    if [[ -n "$LINK_PATH" && -L "$LINK_PATH" ]]; then
      rm -f -- "$LINK_PATH"
      log_ok "Symlink removed: $LINK_PATH"
    else
      log_warn "Could not remove global command automatically. You may need to run: pnpm unlink -g forgottenbranches"
    fi
  fi
else
  log_info "Global command not found — skipping"
fi

# ── 2. Remove desktop entry (Linux) ──────────────────────────────────────────
log_info "[2/3] Removing desktop entry..."

DESKTOP_FILE="$HOME/.local/share/applications/forgottenbranches.desktop"

if [[ -f "$DESKTOP_FILE" ]]; then
  rm -f -- "$DESKTOP_FILE"
  log_ok "Desktop entry removed"
  # Update app menu database if available
  if command -v update-desktop-database &>/dev/null; then
    update-desktop-database "$HOME/.local/share/applications" 2>/dev/null || true
  fi
else
  log_info "No desktop entry found — skipping"
fi

# ── 3. Clean build artifacts ──────────────────────────────────────────────────
log_info "[3/3] Cleaning build artifacts..."

# Remove server dist
if [[ -d "$SCRIPT_DIR/server/dist" ]]; then
  rm -rf -- "$SCRIPT_DIR/server/dist"
  log_ok "server/dist removed"
fi

# Remove client dist
if [[ -d "$SCRIPT_DIR/client/dist" ]]; then
  rm -rf -- "$SCRIPT_DIR/client/dist"
  log_ok "client/dist removed"
fi

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
log_ok "Uninstall complete."
echo ""
echo "  The project folder has NOT been deleted."
echo "  To fully remove Forgotten Branches, delete the folder manually:"
echo ""
echo "    rm -rf \"$SCRIPT_DIR\""
echo ""
