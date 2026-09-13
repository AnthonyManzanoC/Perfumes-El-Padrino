# Use the existing Windows trust store for this build, including certificates
# from installed HTTPS inspection software. Never disable TLS verification.
$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $PSScriptRoot
$certificateFile = Join-Path ([IO.Path]::GetTempPath()) ('padrino-build-ca-' + [Guid]::NewGuid().ToString('N') + '.pem')
$previousExtraCa = $env:NODE_EXTRA_CA_CERTS
$buildExitCode = 1

Push-Location $projectDirectory
try {
    $certificates = @(foreach ($location in @('CurrentUser', 'LocalMachine')) {
        $store = New-Object Security.Cryptography.X509Certificates.X509Store('Root', $location)
        try {
            $store.Open([Security.Cryptography.X509Certificates.OpenFlags]::ReadOnly)
            $store.Certificates
        }
        finally {
            $store.Close()
        }
    }) | Sort-Object Thumbprint -Unique
    $pem = @($certificates | ForEach-Object {
        '-----BEGIN CERTIFICATE-----' + "`n" +
        [Convert]::ToBase64String($_.RawData, [Base64FormattingOptions]::InsertLineBreaks) + "`n" +
        '-----END CERTIFICATE-----'
    }) -join "`n"
    if ($previousExtraCa) {
        $pem += "`n" + (Get-Content -LiteralPath $previousExtraCa -Raw)
    }
    [IO.File]::WriteAllText($certificateFile, $pem, [Text.Encoding]::ASCII)
    $env:NODE_EXTRA_CA_CERTS = $certificateFile
    & npm.cmd run build
    $buildExitCode = $LASTEXITCODE
}
finally {
    if ($null -eq $previousExtraCa) {
        Remove-Item Env:\NODE_EXTRA_CA_CERTS -ErrorAction SilentlyContinue
    }
    else {
        $env:NODE_EXTRA_CA_CERTS = $previousExtraCa
    }
    if (Test-Path -LiteralPath $certificateFile) {
        Remove-Item -LiteralPath $certificateFile
    }
    Pop-Location
}
exit $buildExitCode
