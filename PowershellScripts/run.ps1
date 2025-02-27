$baseCommand = "node index.js"
$workingDirectory = "C:\Users\origin\Desktop\SacraBot"
$mode = "daily"

[Int16[]]$idsToRun = Get-Content -Path "$PsScriptRoot\ids.txt"
foreach ($id in $idsToRun) {
    # Create a new PowerShell window with the command and custom title
    $command = "cd '$workingDirectory'; `$Host.UI.RawUI.WindowTitle = '$id'; $baseCommand $id $mode"
    Start-Process powershell -Verb RunAs -ArgumentList "-NoExit", "-Command", $command
    Start-Sleep -Seconds 5
}