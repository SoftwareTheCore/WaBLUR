# ==============================================================================
# WaBLUR – Packaging Script (PowerShell)
# Creates a clean, store-ready ZIP archive for Microsoft Edge Add-ons submission.
# ==============================================================================

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$distDir = Join-Path $scriptDir "dist"
$zipPath = Join-Path $distDir "WaBLUR-v1.0.0.zip"

# Create dist directory if needed
if (-not (Test-Path $distDir)) {
    New-Item -ItemType Directory -Path $distDir | Out-Null
}

# Remove old zip if exists
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

# Create a temporary staging directory
$stageDir = Join-Path $distDir "staging"
if (Test-Path $stageDir) {
    Remove-Item $stageDir -Recurse -Force
}
New-Item -ItemType Directory -Path $stageDir | Out-Null

# Copy manifest
Copy-Item (Join-Path $scriptDir "manifest.json") -Destination $stageDir

# Copy icons
$stageIcons = Join-Path $stageDir "icons"
New-Item -ItemType Directory -Path $stageIcons | Out-Null
Copy-Item (Join-Path $scriptDir "icons\*.png") -Destination $stageIcons

# Copy src directory
$stageSrc = Join-Path $stageDir "src"
Copy-Item (Join-Path $scriptDir "src") -Destination $stageDir -Recurse

# Create ZIP archive
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($stageDir, $zipPath)

# Clean up staging
Remove-Item $stageDir -Recurse -Force

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " Package created successfully!" -ForegroundColor Green
Write-Host " Output: $zipPath" -ForegroundColor Cyan
Write-Host " Size:   $((Get-Item $zipPath).Length) bytes" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps for Edge Add-ons Store submission:"
Write-Host "  1. Go to https://partner.microsoft.com/dashboard/microsoftedge/overview"
Write-Host "  2. Click 'Create new extension'"
Write-Host "  3. Upload the ZIP file above"
Write-Host "  4. Complete the store listing and submit for review"

