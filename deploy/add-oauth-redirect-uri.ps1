# Tilfoejer web.app redirect URI til Firebase's auto-oprettede Google OAuth-klient.
$ErrorActionPreference = 'Stop'

$ProjectId = 'juice-da-car'
$ClientNumber = '629531664109-4dhd9o3ghj6cbfn6ia9k8l3h2e8n3aua'
$NewRedirectUri = 'https://juice-da-car.web.app/__/auth/handler'

$token = (gcloud auth print-access-token --format='value(token)').Trim()
if (-not $token) { throw 'Kunne ikke hente gcloud access token - koer: gcloud auth login' }

$headers = @{
  Authorization = "Bearer $token"
  'Content-Type' = 'application/json'
}

$getUri = "https://oauth2.googleapis.com/v1/projects/$ProjectId/oauthClients/$ClientNumber"
$client = $null
try {
  $client = Invoke-RestMethod -Method GET -Uri $getUri -Headers $headers
} catch {
  Write-Host "GET oauth2 API fejlede, proever IAM API..."
  $getUri = "https://iam.googleapis.com/v1/projects/$ProjectId/locations/global/oauthClients/$ClientNumber"
  $client = Invoke-RestMethod -Method GET -Uri $getUri -Headers $headers
}

$displayName = $client.displayName
if (-not $displayName) { $displayName = $ClientNumber }
Write-Host "Fundet klient: $displayName"

$redirects = @()
if ($client.redirectUris) {
  $redirects = @($client.redirectUris)
}
if ($redirects -contains $NewRedirectUri) {
  Write-Host "Redirect URI findes allerede: $NewRedirectUri"
  exit 0
}

$redirects += $NewRedirectUri
$body = @{ redirectUris = $redirects } | ConvertTo-Json

try {
  $patchUri = "$getUri" + "?updateMask=redirectUris"
  Invoke-RestMethod -Method PATCH -Uri $patchUri -Headers $headers -Body $body | Out-Null
  Write-Host "Tilfoejet redirect URI: $NewRedirectUri"
} catch {
  Write-Host "Automatisk opdatering fejlede. Tilfoej manuelt i Google Cloud Console:"
  Write-Host "https://console.cloud.google.com/apis/credentials?project=$ProjectId"
  Write-Host "Aabn 'Web client (auto created by Google Service)'"
  Write-Host "Under 'Authorized redirect URIs' tilfoej:"
  Write-Host $NewRedirectUri
  exit 1
}
