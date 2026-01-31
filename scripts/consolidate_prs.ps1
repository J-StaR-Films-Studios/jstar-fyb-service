$ErrorActionPreference = "Stop"

Write-Host "Fetching updates from origin..."
git fetch origin

$targetBranch = "chore/batch-merge-prs"
Write-Host "Resetting local branch $targetBranch to origin/master..."
git checkout -B $targetBranch origin/master

# Find branches
$pattern = "origin/(bolt|sentinel)"
Write-Host "Finding remote branches matching '$pattern'..."
$branches = git branch -r | Select-String $pattern | ForEach-Object { $_.ToString().Trim() }

if (-not $branches) {
    Write-Warning "No branches found matching the pattern."
    exit
}

$successCount = 0
$failCount = 0
$failedBranches = @()

foreach ($branch in $branches) {
    # Skip if it's the target branch itself (unlikely given the pattern, but good safety)
    if ($branch -like "*$targetBranch") { continue }

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
Write-Host "Consolidation Complete"
Write-Host "----------------------------------------"
Write-Host "Merged: $successCount" -ForegroundColor Green
if ($failCount -gt 0) {
    Write-Host "Failed/Skipped: $failCount" -ForegroundColor Red
    $failedBranches | ForEach-Object { Write-Host " - $_" -ForegroundColor Red }
} else {
    Write-Host "All identified branches merged successfully." -ForegroundColor Green
}
