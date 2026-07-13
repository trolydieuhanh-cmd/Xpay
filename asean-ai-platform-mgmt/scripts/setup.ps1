# ASEAN AI Platform PM AI — script cài đặt tự động cho Windows PowerShell
# Chạy: .\scripts\setup.ps1

$ErrorActionPreference = "Stop"

Write-Host "==== ASEAN AI Platform PM AI — Setup ====" -ForegroundColor Cyan

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
Write-Host "Thư mục làm việc: $root" -ForegroundColor DarkGray

# 1. Kiểm tra Node và Python
function Test-Command($name) {
    return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

$missing = @()
if (-not (Test-Command "node"))   { $missing += "node (Node.js 20+)" }
if (-not (Test-Command "npm"))    { $missing += "npm" }
if (-not (Test-Command "python")) { $missing += "python (3.11+)" }
if (-not (Test-Command "git"))    { $missing += "git" }

if ($missing.Count -gt 0) {
    Write-Host "❌ Thiếu các phần mềm sau:" -ForegroundColor Red
    $missing | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    Write-Host ""
    Write-Host "Hãy cài đặt bằng winget (khuyến nghị):" -ForegroundColor Yellow
    Write-Host "  winget install OpenJS.NodeJS.LTS" -ForegroundColor Yellow
    Write-Host "  winget install Python.Python.3.12" -ForegroundColor Yellow
    Write-Host "  winget install Git.Git" -ForegroundColor Yellow
    exit 1
}

Write-Host "✔ Node: $(node --version)" -ForegroundColor Green
Write-Host "✔ Python: $(python --version)" -ForegroundColor Green
Write-Host "✔ Git: $(git --version)" -ForegroundColor Green

# 2. Backend
Write-Host ""
Write-Host "==== Backend ====" -ForegroundColor Cyan
Set-Location "$root\backend"

if (-not (Test-Path ".venv")) {
    Write-Host "Tạo virtual environment..."
    python -m venv .venv
}

Write-Host "Kích hoạt venv và cài dependencies..."
& "$root\backend\.venv\Scripts\python.exe" -m pip install --upgrade pip
& "$root\backend\.venv\Scripts\python.exe" -m pip install -r requirements.txt

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host ""
    Write-Host "⚠ Đã tạo backend\.env từ .env.example." -ForegroundColor Yellow
    Write-Host "   HÃY MỞ file backend\.env và điền ANTHROPIC_API_KEY trước khi chạy." -ForegroundColor Yellow
    Write-Host "   Lấy key tại: https://console.anthropic.com/settings/keys" -ForegroundColor Yellow
}

Write-Host "✔ Backend đã sẵn sàng." -ForegroundColor Green

# 3. Frontend
Write-Host ""
Write-Host "==== Frontend ====" -ForegroundColor Cyan
Set-Location "$root\frontend"
Write-Host "Cài npm packages (có thể mất vài phút)..."
npm install
Write-Host "✔ Frontend đã sẵn sàng." -ForegroundColor Green

# 4. Kết thúc
Write-Host ""
Write-Host "==== HOÀN TẤT ====" -ForegroundColor Cyan
Write-Host ""
Write-Host "Chạy backend (Terminal 1):" -ForegroundColor White
Write-Host "  cd $root\backend"
Write-Host "  .\.venv\Scripts\Activate.ps1"
Write-Host "  uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"
Write-Host ""
Write-Host "Chạy frontend (Terminal 2):" -ForegroundColor White
Write-Host "  cd $root\frontend"
Write-Host "  npm run dev"
Write-Host ""
Write-Host "Sau đó mở: http://localhost:3000" -ForegroundColor Green
