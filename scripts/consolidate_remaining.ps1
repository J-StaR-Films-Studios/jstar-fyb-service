$ErrorActionPreference = "Stop"

Write-Host "Fetching updates from origin..."
git fetch origin

$currentBranch = git branch --show-current
Write-Host "Current branch: $currentBranch"

# Find unmerged branches matching the pattern
$pattern = "origin/(bolt|sentinel)"
Write-Host "Finding UNMERGED remote branches matching '$pattern'..."
$branches = git branch -r --no-merged $currentBranch | Select-String $pattern | ForEach-Object { $_.ToString().Trim() }

if (-not $branches) {
    Write-Warning "No unmerged branches found matching the pattern."
    exit
}

$successCount = 0
$failCount = 0
$failedBranches = @()

foreach ($branch in $branches) {
    # Skip if it's the target branch itself
    if ($branch -like "*$currentBranch") { continue }
    # Skip HEAD
    if ($branch -like "*HEAD*") { continue }

    Write-Host "Attempting to merge $branch..." -ForegroundColor Cyan
    
    # Try merge
    try {
        git merge $branch --no-edit 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Successfully merged $branch" -ForegroundColor Green
            $successCount++
        } else {
            throw "Merge failed with exit code $LASTEXITCODE"
        }
    } catch {
        Write-Warning "Conflict or error merging $branch. Aborting this merge."
        git merge --abort
        $failCount++
        $failedBranches += $branch
    }
}

Write-Host "`n----------------------------------------"
Write-Host "Phase 2 Consolidation Complete"
Write-Host "----------------------------------------"
Write-Host "Merged: $successCount" -ForegroundColor Green
if ($failCount -gt 0) {
    Write-Host "Failed/Skipped: $failCount" -ForegroundColor Red
    $failedBranches | ForEach-Object { Write-Host " - $_" -ForegroundColor Red }
} else {
    Write-Host "All remaining branches merged successfully." -ForegroundColor Green
}
