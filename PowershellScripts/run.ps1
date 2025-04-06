$baseCommand = "node index.js"
$workingDirectory = "C:\Users\origin\Desktop\SacraBot"
$mode = "level"
$maxRestarts = 10000  # Max restart attempts per instance
$restartDelay = 5  # Seconds between restart attempts
$launchDelay = 5    # Seconds between launching instances

[Int16[]]$idsToRun = Get-Content -Path "$PSScriptRoot\ids.txt"

foreach ($id in $idsToRun) {
  # Build monitoring script for each instance
  $command = @"
        cd '$workingDirectory'
        `$Host.UI.RawUI.WindowTitle = '$id'
        `$restartCount = 0
        `$instanceId = '$id'
        
        while (`$restartCount -lt $maxRestarts) {
            Write-Host "Starting $baseCommand $instanceId $mode (Attempt: $($restartCount + 1)/$maxRestarts)"
            `$process = Start-Process node -ArgumentList "index.js", `$instanceId, `"$mode`" -PassThru -NoNewWindow -Wait
            `$exitCode = `$process.ExitCode
            
            if (`$exitCode -ne 0) {
                Write-Host "Instance `$instanceId crashed with code `$exitCode. Restarting in $restartDelay seconds..." -ForegroundColor Red
                `$restartCount++
                Start-Sleep -Seconds $restartDelay
            } else {
                Write-Host "Instance `$instanceId exited cleanly" -ForegroundColor Green
                break
            }
        }
        
        if (`$restartCount -ge $maxRestarts) {
            Write-Host "Max restarts reached for `$instanceId" -ForegroundColor Yellow
        }
        pause
"@

  # Start new PowerShell window with monitoring
  Start-Process powershell -Verb RunAs -ArgumentList "-NoExit", "-Command", $command
  Start-Sleep -Seconds $launchDelay
}