# Deploy-konfiguration (kopiér til deploy/config.local.ps1 — committes IKKE)
$ErrorActionPreference = 'Stop'

$ProjectId = 'juice-da-car'
$Region = 'europe-west1'

# Din Firebase UID efter login (Settings → Project → eller fra Auth console)
$AllowedUid = 'UDFYLD_EFTERT_LOGIN'

# VAPID (genereret til PoC — roter i prod)
$VapidPublicKey = 'UDFYLD'
$VapidPrivateKey = 'UDFYLD_KUN_I_SECRET_MANAGER'
$VapidSubject = 'mailto:claus@replaymaker.dk'

# Firebase web config (client — offentlig)
$FirebaseApiKey = 'AIzaSyB7LAPxOcgYmaXl4_hR0h_GWqAHDjxHbpM'
$FirebaseAuthDomain = 'juice-da-car.firebaseapp.com'
$FirebaseStorageBucket = 'juice-da-car.firebasestorage.app'
$FirebaseMessagingSenderId = '266728680061'
$FirebaseAppId = '1:266728680061:web:c6c70f4df51d105404df14'
