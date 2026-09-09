param(
  [int]$FrontendPort = 3001,
  [int]$ApiPort = 5190
)

$projectRoot = Split-Path -Parent $PSScriptRoot
$apiProject = Join-Path $projectRoot 'backend\PerfumesElPadrino.Api\PerfumesElPadrino.Api.csproj'

Write-Host "Iniciando Perfumes El Padrino..." -ForegroundColor Yellow
$apiArguments = "run --project `"$apiProject`" --launch-profile http --urls http://localhost:$ApiPort"
Start-Process -FilePath 'dotnet' -ArgumentList $apiArguments -WorkingDirectory $projectRoot -WindowStyle Hidden
Start-Sleep -Seconds 3
Start-Process -FilePath 'npm.cmd' -ArgumentList @('run', 'dev', '--', '--port', $FrontendPort) -WorkingDirectory $projectRoot -WindowStyle Hidden

Write-Host "Tienda: http://localhost:$FrontendPort" -ForegroundColor Green
Write-Host "Administrador: http://localhost:$FrontendPort/admin" -ForegroundColor Green
Write-Host "API: http://localhost:$ApiPort/health" -ForegroundColor Green
