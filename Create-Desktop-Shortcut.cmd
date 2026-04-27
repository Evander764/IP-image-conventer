@echo off
set "ROOT=%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$root=$env:ROOT; $desktop=[Environment]::GetFolderPath('Desktop'); $shell=New-Object -ComObject WScript.Shell; $shortcut=$shell.CreateShortcut((Join-Path $desktop 'IP-image-conventer.lnk')); $shortcut.TargetPath=(Join-Path $root 'node_modules\electron\dist\electron.exe'); $shortcut.Arguments='.'; $shortcut.WorkingDirectory=$root; $shortcut.IconLocation=(Join-Path $root 'resources\icon.ico'); $shortcut.Description='双击打开 IP-image-conventer'; $shortcut.Save()"
echo Desktop shortcut created: IP-image-conventer.lnk
pause
