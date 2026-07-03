# Create shortcuts for The Socker Manager
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$batPath = Join-Path $projectRoot "Play-Game.bat"
$desktop = [Environment]::GetFolderPath("Desktop")
$targets = @(
  (Join-Path $desktop "The Socker Manager.lnk"),
  (Join-Path $projectRoot "The Socker Manager.lnk")
)

$shell = New-Object -ComObject WScript.Shell
foreach ($lnkPath in $targets) {
  $shortcut = $shell.CreateShortcut($lnkPath)
  $shortcut.TargetPath = $batPath
  $shortcut.WorkingDirectory = $projectRoot
  $shortcut.Description = "Play The Socker Manager"
  $shortcut.WindowStyle = 1
  $shortcut.Save()
  Write-Host "Shortcut created: $lnkPath"
}
