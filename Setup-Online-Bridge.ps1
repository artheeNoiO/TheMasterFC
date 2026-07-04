# ตั้งค่า GAME_PROVISION_SECRET ให้ Cloudflare Pages + server/.env ตรงกัน
# ใช้ค่าเดียวกันบน Render Dashboard ด้วย (Environment → GAME_PROVISION_SECRET)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$ServerEnv = Join-Path $Root "server\.env"
$ProjectName = "themasterfc"
$DefaultApiUrl = "https://api.themasterfc.com"

function Read-EnvValue([string]$Path, [string]$Key) {
  if (-not (Test-Path $Path)) { return $null }
  foreach ($line in Get-Content $Path) {
    if ($line -match "^\s*$Key\s*=\s*(.+)\s*$") {
      return $Matches[1].Trim().Trim('"').Trim("'")
    }
  }
  return $null
}

function Set-EnvValue([string]$Path, [string]$Key, [string]$Value) {
  $lines = @()
  $found = $false
  if (Test-Path $Path) {
    foreach ($line in Get-Content $Path) {
      if ($line -match "^\s*$Key\s*=") {
        $lines += "$Key=$Value"
        $found = $true
      } else {
        $lines += $line
      }
    }
  }
  if (-not $found) { $lines += "$Key=$Value" }
  Set-Content -Path $Path -Value $lines -Encoding UTF8
}

Write-Host ""
Write-Host "========================================"
Write-Host "  The Master FC — Online Bridge Setup"
Write-Host "========================================"
Write-Host ""

$secret = Read-EnvValue $ServerEnv "GAME_PROVISION_SECRET"
if (-not $secret -or $secret -match "change-in-production|change-me") {
  $secret = [guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N")
  Set-EnvValue $ServerEnv "GAME_PROVISION_SECRET" $secret
  Write-Host "[OK] สร้าง GAME_PROVISION_SECRET ใหม่ใน server\.env"
} else {
  Write-Host "[OK] ใช้ GAME_PROVISION_SECRET จาก server\.env"
}

Write-Host ""
Write-Host "[1/2] ตั้ง secret บน Cloudflare Pages (project: $ProjectName)..."
Write-Host "      ถ้ายังไม่ login จะเปิด browser ให้"
Write-Host ""

Push-Location (Join-Path $Root "client")
try {
  $secret | npx wrangler pages secret put GAME_PROVISION_SECRET --project-name=$ProjectName
  if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "WARN: wrangler ล้มเหลว — ตั้ง secret มือใน Dashboard:"
    Write-Host "  Workers & Pages → $ProjectName → Settings → Environment variables"
    Write-Host "  Production + Preview: GAME_PROVISION_SECRET = (ค่าใน server\.env)"
  } else {
    Write-Host "[OK] Cloudflare Pages secret (production) ตั้งแล้ว"
    $secret | npx wrangler pages secret put GAME_PROVISION_SECRET --project-name=$ProjectName --env=preview 2>$null
    if ($LASTEXITCODE -eq 0) { Write-Host "[OK] Cloudflare Pages secret (preview) ตั้งแล้ว" }
  }
} finally {
  Pop-Location
}

Write-Host ""
Write-Host "[2/2] ตั้งค่า Render (ทำมือครั้งเดียว):"
Write-Host "  Dashboard → the-socker-manager-api → Environment"
Write-Host "  GAME_PROVISION_SECRET = $secret"
Write-Host ""
Write-Host "Optional — Cloudflare env (ไม่บังคับ มี default แล้ว):"
Write-Host "  GAME_API_URL = $DefaultApiUrl"
Write-Host ""
Write-Host "หลังตั้ง Render แล้ว รัน Deploy-Cloudflare.bat เพื่อ deploy functions ใหม่"
Write-Host ""
Read-Host "กด Enter เพื่อปิด"
