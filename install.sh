#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"

log_info()  { echo "  $*"; }
log_ok()    { echo "  ✓ $*"; }
log_warn()  { echo "  ⚠ $*" >&2; }

echo ""
echo "  ⚡ Forgotten Branches — Install"
echo "  ================================"
echo ""

# Check for pnpm
if ! command -v pnpm &>/dev/null; then
  log_warn "pnpm not found. Install it with: npm install -g pnpm"
  exit 1
fi

# 1. Install dependencies
log_info "[1/3] Installing dependencies..."
( cd "$SCRIPT_DIR" && pnpm install --frozen-lockfile )

# 2. Build
log_info "[2/3] Building..."
( cd "$SCRIPT_DIR" && pnpm run build )

# 3. Link globally
log_info "[3/3] Linking globally..."
PNPM_BIN_DIR="$(pnpm bin --global 2>/dev/null || true)"
if [[ -n "$PNPM_BIN_DIR" ]] && echo "$PATH" | grep -qF "$PNPM_BIN_DIR"; then
  ( cd "$SCRIPT_DIR" && pnpm link . )
  log_ok "Linked via pnpm"
else
  log_warn "PNPM global bin not in PATH — using npm link as fallback."
  log_warn "Open a new terminal after this to ensure pnpm PATH is active."
  ( cd "$SCRIPT_DIR" && npm link )
  log_ok "Linked via npm"
fi

# 4. Install desktop entry (Linux only)
DESKTOP_FILE="$SCRIPT_DIR/bin/forgottenbranches.desktop"
DESKTOP_DIR="$HOME/.local/share/applications"

if [[ -f "$DESKTOP_FILE" ]]; then
  mkdir -p "$DESKTOP_DIR"
  cp "$DESKTOP_FILE" "$DESKTOP_DIR/"
  chmod +x "$DESKTOP_DIR/forgottenbranches.desktop"
  update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true
  log_ok "Desktop entry installed"
fi

echo ""
log_ok "Done! You can now:"
echo "    - Run 'forgottenbranches' from any terminal"
echo "    - Search 'Forgotten Branches' in your app menu (Linux)"
echo "    - Run 'forgottenbranches /path/to/repo' to open directly"
echo ""

