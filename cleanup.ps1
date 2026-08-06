# EduNexus Workspace Cleanup Script
# This script removes the legacy/duplicate directories that are not aligned with the module-wise structure.

Write-Host "Starting EduNexus workspace cleanup..." -ForegroundColor Cyan

$root = Get-Location

# Frontend paths to remove
$frontendPaths = @(
    "frontend/src/pages",
    "frontend/src/components",
    "frontend/src/context",
    "frontend/src/services"
)

# Backend paths to remove
$backendPaths = @(
    "backend/src/controllers",
    "backend/src/models",
    "backend/src/routes"
)

# Root paths to remove
$rootPaths = @(
    "node_modules",
    "package.json",
    "package-lock.json"
)

# Remove Frontend legacy directories
foreach ($path in $frontendPaths) {
    $fullPath = Join-Path $root $path
    if (Test-Path $fullPath) {
        Write-Host "Removing: $path" -ForegroundColor Yellow
        Remove-Item -Recurse -Force $fullPath
    } else {
        Write-Host "Already removed or not found: $path" -ForegroundColor DarkGray
    }
}

# Remove Backend legacy directories
foreach ($path in $backendPaths) {
    $fullPath = Join-Path $root $path
    if (Test-Path $fullPath) {
        Write-Host "Removing: $path" -ForegroundColor Yellow
        Remove-Item -Recurse -Force $fullPath
    } else {
        Write-Host "Already removed or not found: $path" -ForegroundColor DarkGray
    }
}

# Remove Root legacy files/directories
foreach ($path in $rootPaths) {
    $fullPath = Join-Path $root $path
    if (Test-Path $fullPath) {
        Write-Host "Removing root item: $path" -ForegroundColor Yellow
        Remove-Item -Recurse -Force $fullPath
    } else {
        Write-Host "Already removed or not found: $path" -ForegroundColor DarkGray
    }
}

Write-Host "Cleanup completed successfully!" -ForegroundColor Green
