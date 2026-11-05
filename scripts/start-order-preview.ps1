param(
  [ValidateSet('Api', 'Web', 'ImportCatalog')]
  [string]$Mode = 'Api',
  [string]$TestPhone = '',
  [string]$SenderPhone = '',
  [string]$GreenApiUrl = '',
  [string]$GreenInstanceId = ''
)

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)

if ($Mode -eq 'Web') {
  $env:API_URL = 'http://127.0.0.1:5190'
  $env:NEXT_PUBLIC_SITE_URL = 'http://127.0.0.1:3001'
  npm.cmd run dev -- --hostname 127.0.0.1 --port 3001
  exit $LASTEXITCODE
}

# The preview uses a dedicated loopback PostgreSQL instance, never the project's remote connection string.
$state = Join-Path $env:LOCALAPPDATA 'PerfumesPadrinoLocal'
New-Item -ItemType Directory -Force -Path $state | Out-Null
function Get-LocalKey([string]$Name) {
  $path = Join-Path $state $Name
  if (!(Test-Path -LiteralPath $path)) {
    $bytes = New-Object byte[] 32
    $random = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $random.GetBytes($bytes) } finally { $random.Dispose() }
    [IO.File]::WriteAllText($path, [Convert]::ToBase64String($bytes))
  }
  return [IO.File]::ReadAllText($path).Trim()
}
$env:ASPNETCORE_ENVIRONMENT = 'Development'
$env:ConnectionStrings__Postgres = 'Host=127.0.0.1;Port=55419;Database=postgres;Username=padrino_local'
$env:AdminSeed__Email = 'admin-local@example.test'
if (!$env:AdminSeed__Password) { $env:AdminSeed__Password = Get-LocalKey 'admin-password.key' }
$env:Commerce__EncryptionKey = Get-LocalKey 'backup.key'
$env:QUICK_ACTION_SECRET = Get-LocalKey 'quick-action.key'
$env:Commerce__KeepEmailInQueue = 'true'
$env:Commerce__DisableWorker = 'false'
$env:Logging__LogLevel__Default = 'Warning'
$env:Brevo__ApiKey = 'local-preview-placeholder'
$env:ORDER_BACKUP_DIR = Join-Path $state 'order-backups'
$env:QUICK_ACTION_BASE_URL = 'http://127.0.0.1:3001'
if ($TestPhone) {
  $env:WHATSAPP_OWNER_PHONE = $TestPhone
  $env:WHATSAPP_TEST_ONLY_PHONE = $TestPhone
}
if ($GreenApiUrl) { $env:GREEN_API_URL = $GreenApiUrl }
if ($GreenInstanceId) { $env:GREEN_API_ID_INSTANCE = $GreenInstanceId }
if ($SenderPhone) { $env:GREEN_API_SENDER_PHONE = $SenderPhone }

$project = 'backend/PerfumesElPadrino.Api'
if ($Mode -eq 'ImportCatalog') {
  $catalog = Join-Path (Get-Location) 'catalog/real-catalog.json'
  dotnet run --project $project --no-launch-profile -- --import-catalog $catalog
} else {
  dotnet run --project $project --no-launch-profile --urls http://127.0.0.1:5190
}
exit $LASTEXITCODE
