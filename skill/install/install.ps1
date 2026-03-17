#Requires -Version 5.1
<#
.SYNOPSIS
  Bootstrap installer for agentar CLI on Windows.
.DESCRIPTION
  Downloads the CLI tarball, extracts it, and runs the inner install.ps1.
.EXAMPLE
  # Download-then-execute (preferred when pipe is blocked):
  $f="$env:TEMP\agentar_install.ps1"; irm https://catchclaw.me/api/v1/agentar/install.ps1 -OutFile $f; & $f; Remove-Item $f
#>
$ErrorActionPreference = "Stop"

$KitUrl = if ($env:AGENTAR_KIT_URL) { $env:AGENTAR_KIT_URL } else { "https://catchclaw.me/api/v1/agentar/cli/latest.tar.gz" }

$TmpDir = Join-Path ([System.IO.Path]::GetTempPath()) "agentar-bootstrap-$([System.Guid]::NewGuid().ToString('N').Substring(0,8))"
New-Item -ItemType Directory -Force -Path $TmpDir | Out-Null

try {
  $TarPath = Join-Path $TmpDir "latest.tar.gz"

  Write-Host "Downloading agentar CLI ..."
  Invoke-WebRequest -Uri $KitUrl -OutFile $TarPath -UseBasicParsing

  Write-Host "Extracting ..."
  tar -xzf $TarPath -C $TmpDir

  $Installer = Join-Path (Join-Path $TmpDir "cli") "install.ps1"
  if (-not (Test-Path $Installer)) {
    Write-Error "install.ps1 not found at $Installer"
    Get-ChildItem $TmpDir -Recurse -Depth 3 | ForEach-Object { Write-Host $_.FullName }
    exit 1
  }

  & $Installer @args
} finally {
  Remove-Item -Recurse -Force $TmpDir -ErrorAction SilentlyContinue
}
