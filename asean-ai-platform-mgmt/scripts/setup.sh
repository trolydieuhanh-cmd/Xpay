#!/usr/bin/env bash
# Script cài đặt tự động cho Linux/macOS
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "==== ASEAN AI Platform PM AI — Setup ===="
echo "Working dir: $ROOT_DIR"

# 1. Check requirements
missing=()
command -v node   >/dev/null 2>&1 || missing+=("node (Node.js 20+)")
command -v npm    >/dev/null 2>&1 || missing+=("npm")
command -v python3 >/dev/null 2>&1 || missing+=("python3 (3.11+)")
command -v git    >/dev/null 2>&1 || missing+=("git")

if [ ${#missing[@]} -gt 0 ]; then
  echo "❌ Missing:"
  printf '  - %s\n' "${missing[@]}"
  exit 1
fi

echo "✔ node $(node --version)"
echo "✔ python $(python3 --version)"
echo "✔ git $(git --version | head -1)"

# 2. Backend
echo ""
echo "==== Backend ===="
cd "$ROOT_DIR/backend"
[ -d .venv ] || python3 -m venv .venv
# shellcheck disable=SC1091
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

if [ ! -f .env ]; then
  cp .env.example .env
  echo "⚠ Created backend/.env — fill ANTHROPIC_API_KEY before running."
fi

# 3. Frontend
echo ""
echo "==== Frontend ===="
cd "$ROOT_DIR/frontend"
npm install

echo ""
echo "==== DONE ===="
echo ""
echo "Backend:  cd $ROOT_DIR/backend && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000"
echo "Frontend: cd $ROOT_DIR/frontend && npm run dev"
echo "Open http://localhost:3000"
