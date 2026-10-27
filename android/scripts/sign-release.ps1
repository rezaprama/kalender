param(
    [Parameter(Mandatory = $true)][string]$InputApk,
    [Parameter(Mandatory = $true)][string]$OutputApk,
    [string]$KeyDirectory = (Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'Kalender/signing')
)
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$cache = Join-Path $repo 'artifacts/android-toolchain'
New-Item -ItemType Directory -Path $cache -Force | Out-Null
$jar = Join-Path $cache 'apksig-8.13.2.jar'
if (-not (Test-Path -LiteralPath $jar)) {
    Invoke-WebRequest -Uri 'https://dl.google.com/dl/android/maven2/com/android/tools/build/apksig/8.13.2/apksig-8.13.2.jar' -OutFile $jar
}
if ((Get-FileHash -LiteralPath $jar -Algorithm SHA256).Hash.ToLowerInvariant() -ne 'c070ed1394629d74641aa0906f60b2ffa1ee77e6366a1f93437f59717b1aeb89') {
    throw 'The apksig download does not match the pinned checksum'
}
$private = Get-Content -LiteralPath (Join-Path $KeyDirectory 'private.json') -Raw | ConvertFrom-Json
$store = Join-Path $KeyDirectory $private.storeFile
$source = (Resolve-Path -LiteralPath $InputApk).Path
$output = [IO.Path]::GetFullPath($OutputApk)
if ($source -eq $output -or (Test-Path -LiteralPath $output)) { throw 'Choose a new output APK path; never overwrite an input or signed release' }
New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($output)) -Force | Out-Null
$java = if ($env:JAVA_HOME) { Join-Path $env:JAVA_HOME 'bin/java' } else { 'java' }
$previousPassword = $env:KALENDER_STORE_PASSWORD
try {
    $env:KALENDER_STORE_PASSWORD = $private.password
    & $java --class-path $jar (Join-Path $PSScriptRoot 'SignApk.java') $source $output $store $private.alias
    if ($LASTEXITCODE -ne 0) { throw 'APK signing or verification failed' }
} finally { $env:KALENDER_STORE_PASSWORD = $previousPassword }
