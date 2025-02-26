$workingDirectory = "C:\Users\origin\Desktop\SacraBot\PowershellScripts"
$command = "cd '$workingDirectory';"
Start-Process powershell -Verb RunAs -ArgumentList "-NoExit", "-Command", $command
