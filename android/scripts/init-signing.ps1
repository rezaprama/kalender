param(
    [Parameter(Mandatory = $true)][ValidatePattern('^[\p{L}0-9 ._-]{1,100}$')][string]$Owner,
    [string]$KeyDirectory = (Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'Kalender/signing')
)
$ErrorActionPreference = 'Stop'
$store = Join-Path $KeyDirectory 'release.keystore'
$config = Join-Path $KeyDirectory 'private.json'
if ((Test-Path -LiteralPath $store) -or (Test-Path -LiteralPath $config)) {
    throw 'A signing identity already exists. Reuse it; do not replace a published application key.'
}
New-Item -ItemType Directory -Path $KeyDirectory -Force | Out-Null
if ($env:OS -eq 'Windows_NT') {
    $ownerSid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
    & icacls $KeyDirectory /inheritance:r /grant:r "*$($ownerSid):(OI)(CI)F" '*S-1-5-18:(OI)(CI)F' '*S-1-5-32-544:(OI)(CI)F' | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Could not protect the signing directory' }
} else { & chmod 700 $KeyDirectory }
$bytes = New-Object byte[] 48
$random = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$random.GetBytes($bytes)
$random.Dispose()
$password = [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
$previousPassword = $env:KALENDER_STORE_PASSWORD
$keytool = if ($env:JAVA_HOME) { Join-Path $env:JAVA_HOME 'bin/keytool' } else { 'keytool' }
try {
    $env:KALENDER_STORE_PASSWORD = $password
    # Persist recovery metadata before key generation, so interruption cannot orphan a key.
    @{ schema = 1; alias = 'kalender'; storeFile = 'release.keystore'; owner = $Owner; password = $password } |
        ConvertTo-Json | Set-Content -LiteralPath $config -Encoding utf8
    if ($env:OS -ne 'Windows_NT') { & chmod 600 $config }
    & $keytool -genkeypair -alias kalender -keyalg RSA -keysize 4096 -sigalg SHA256withRSA -validity 10000 -dname "CN=$Owner" -storetype PKCS12 -keystore $store -storepass:env KALENDER_STORE_PASSWORD -keypass:env KALENDER_STORE_PASSWORD
    if ($LASTEXITCODE -ne 0) { throw 'Key generation failed' }
    if ($env:OS -ne 'Windows_NT') { & chmod 600 $store $config }
    Write-Host "Signing identity created in $KeyDirectory"
    Write-Host 'Back up release.keystore and private.json securely. Neither belongs in Git, CI, or a public release.'
} finally { $env:KALENDER_STORE_PASSWORD = $previousPassword }
