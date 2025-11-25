# Start Backend with Nodemon
Write-Host "Starting Payroll Backend Server with Nodemon..." -ForegroundColor Green
Write-Host ""

# Check if MongoDB is running
Write-Host "Checking MongoDB connection..." -ForegroundColor Yellow
$mongoRunning = $false
try {
    $null = Test-NetConnection -ComputerName localhost -Port 27017 -InformationLevel Quiet -WarningAction SilentlyContinue
    if ($?) {
        Write-Host "✓ MongoDB is running on port 27017" -ForegroundColor Green
        $mongoRunning = $true
    }
} catch {
    Write-Host "✗ MongoDB is not running!" -ForegroundColor Red
    Write-Host "Please start MongoDB first." -ForegroundColor Yellow
}

Write-Host ""

if ($mongoRunning) {
    Write-Host "Starting backend server..." -ForegroundColor Green
    npx nodemon src/index.js
} else {
    Write-Host "Cannot start backend without MongoDB." -ForegroundColor Red
    Write-Host ""
    Write-Host "To start MongoDB, run:" -ForegroundColor Yellow
    Write-Host "  mongod --dbpath C:\data\db" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

