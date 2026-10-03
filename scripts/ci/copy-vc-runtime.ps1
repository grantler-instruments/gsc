# Copies the MSVC C++ runtime DLLs into src-tauri/vcredist so the Windows bundle
# ships them next to gsc.exe (app-local deployment). ONNX Runtime (ort) and
# espeak-ng link the dynamic CRT, so a fresh Windows install without the VC++
# Redistributable fails with "msvcp140_1.dll not found".
$ErrorActionPreference = 'Stop'

$vswhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
$vs = & $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
if (-not $vs) { throw 'Visual Studio with C++ tools not found' }

$crt = Get-ChildItem "$vs\VC\Redist\MSVC\*\x64\Microsoft.VC14*.CRT" -Directory |
  Where-Object { $_.Parent.Parent.Name -match '^\d+(\.\d+)+$' } |
  Sort-Object { [version]$_.Parent.Parent.Name } -Descending |
  Select-Object -First 1
if (-not $crt) { throw "MSVC CRT redist folder not found under $vs\VC\Redist\MSVC" }

$dest = Join-Path $PSScriptRoot '..\..\src-tauri\vcredist'
New-Item -ItemType Directory -Force -Path $dest | Out-Null
foreach ($dll in 'msvcp140.dll', 'msvcp140_1.dll', 'msvcp140_2.dll', 'vcruntime140.dll', 'vcruntime140_1.dll') {
  Copy-Item (Join-Path $crt.FullName $dll) $dest -Force
}
Write-Host "Copied VC++ runtime from $($crt.FullName) to $dest"
