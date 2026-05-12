#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
cd "$SCRIPT_DIR"

log_info() { echo "  $*"; }
log_ok()   { echo "  ✓ $*"; }

echo ""
echo "  ⚡ Forgotten Branches — Update"
echo "  ==============================="
echo ""

# Check if it's a git repo with a remote
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "  Not a git repository. Nothing to pull." >&2
  exit 1
fi

REMOTE="$(git remote 2>/dev/null | head -1 || true)"
if [[ -z "$REMOTE" ]]; then
  echo "  No git remote configured. Nothing to pull." >&2
  exit 1
fi

# Store current HEAD
BEFORE="$(git rev-parse HEAD 2>/dev/null)"

log_info "Pulling from $REMOTE..."
CURRENT_BRANCH="$(git branch --show-current 2>/dev/null || true)"

if [[ -n "$CURRENT_BRANCH" ]]; then
  git pull "$REMOTE" "$CURRENT_BRANCH" 2>/dev/null || \
  git pull "$REMOTE" main 2>/dev/null || {
    echo "  Could not pull from remote. Is the network available?" >&2
    exit 1
  }
else
  git pull "$REMOTE" main 2>/dev/null || {
    echo "  Could not pull from remote. Is the network available?" >&2
    exit 1
  }
fi

AFTER="$(git rev-parse HEAD 2>/dev/null)"

if [[ "$BEFORE" = "$AFTER" ]]; then
  echo ""
  log_ok "Already up to date."
  echo ""
  exit 0
fi

echo ""
log_info "Changes detected. Rebuilding..."
echo ""

# Install any new dependencies
( cd "$SCRIPT_DIR" && pnpm install --no-frozen-lockfile )

# Rebuild
pnpm run build

echo ""
log_ok "Update complete."
echo ""

