# Create shortcuts for The Master Football Club
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$desktop = [Environment]::GetFolderPath("Desktop")
$targets = @(
  (Join-Path $desktop "The Master Football Club.lnk"),
  (Join-Path $projectRoot "The Master Football Club.lnk")
)
$playBat = Join-Path $projectRoot "Play-Game.bat"
$WshShell = New-Object -ComObject WScript.Shell
foreach ($lnk in $targets) {
  $shortcut = $WshShell.CreateShortcut($lnk)
  $shortcut.TargetPath = $playBat
  $shortcut.WorkingDirectory = $projectRoot
  $shortcut.Description = "Play The Master Football Club"
  $shortcut.Save()
}
Write-Host "Created:" $targets
