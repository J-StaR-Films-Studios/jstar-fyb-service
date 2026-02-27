$currentDir = Get-Location
$envFile = "$currentDir\.env"
$repoRoot = "$currentDir"
$worktrees = @(
    "..\2025-12-15_jstar-fyb-service-agent-jay",
    "..\2025-12-15_jstar-fyb-service-agent-builder"
)

Write-Host "VibeCode Agent Setup Initializing..." -ForegroundColor Cyan

foreach ($tree in $worktrees) {
    if (Test-Path $tree) {
        Write-Host "Configuring Agent: $tree" -ForegroundColor Green
        
        # 1. Copy .env
        Copy-Item $envFile -Destination "$tree\.env" -Force
        Write-Host "   -- .env copied" -ForegroundColor Gray

        # 2. Run pnpm install
        Write-Host "   -- Installing dependencies..." -ForegroundColor Yellow
        Start-Process -FilePath "pnpm" -ArgumentList "install" -WorkingDirectory $tree -NoNewWindow -Wait
        Write-Host "   -- Dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "Worktree not found: $tree" -ForegroundColor Red
    }
}

Write-Host "All Agents Primed and Ready." -ForegroundColor Cyan
