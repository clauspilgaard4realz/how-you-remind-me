# Deploy: juice-da-car → How You Remind Me

Projektet genbruges som dedikeret HYRM-instans. Project ID forbliver `juice-da-car` (kan ikke ændres). Omdøb **Project name** i Firebase Console til fx "How You Remind Me".

## Forudsætninger (engang)

1. **Blaze plan** på `juice-da-car` (Billing → link betalingskonto). Forventet ~0 USD/md for privat brug.
2. **Firestore** oprettet i `europe-west1` (Console → Firestore → Create database, production mode).
3. **Authentication → Google** aktiveret.
4. **Web app** registreret (Project settings → Your apps → Web). Kopiér config til `frontend/.env`.
5. **VAPID-nøgler**: `npx web-push generate-vapid-keys`
6. **Din Firebase UID** efter login → `ALLOWED_UID` / `VITE_ALLOWED_UID`.

## frontend/.env (eksempel)

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=juice-da-car.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=juice-da-car
VITE_FIREBASE_STORAGE_BUCKET=juice-da-car.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_API_BASE_URL=
VITE_VAPID_PUBLIC_KEY=...
VITE_ALLOWED_UID=...
```

`VITE_API_BASE_URL` kan være tom ved Firebase Hosting — API kaldes via `/api/...` rewrite.

## Deploy-rækkefølge

**Region:** Alt compute og images skal ligge i `europe-west1`. Brug **ikke** `gcr.io` (legacy Container Registry → US).

```powershell
# Engang: Artifact Registry i EU
gcloud artifacts repositories create hyrm `
  --repository-format=docker `
  --location=europe-west1 `
  --project juice-da-car `
  --description "How You Remind Me container images"
```

Build + deploy (Cloud Build kører regionalt i EU):

```powershell
cd "c:\Users\claus\How you remind me"
npm install
npm run build -w @hyrm/shared

# 1. Firestore rules + indexes
firebase deploy --only firestore:rules,firestore:indexes --project juice-da-car

# 2. Build images (europe-west1)
gcloud builds submit --config deploy/cloudbuild-api.yaml --project juice-da-car --region europe-west1
gcloud builds submit --config deploy/cloudbuild-dispatcher.yaml --project juice-da-car --region europe-west1

# 3. Deploy Cloud Run fra EU registry
gcloud run deploy reminder-api `
  --image europe-west1-docker.pkg.dev/juice-da-car/hyrm/reminder-api:latest `
  --region europe-west1 `
  --project juice-da-car `
  --allow-unauthenticated `
  --set-env-vars "ALLOWED_UID=DIN_UID,FIREBASE_PROJECT_ID=juice-da-car"

gcloud run deploy reminder-dispatcher `
  --image europe-west1-docker.pkg.dev/juice-da-car/hyrm/reminder-dispatcher:latest `
  --region europe-west1 `
  --project juice-da-car `
  --no-allow-unauthenticated `
  --set-secrets "VAPID_PRIVATE_KEY=vapid-private-key:latest" `
  --set-env-vars "ALLOWED_UID=DIN_UID,VAPID_PUBLIC_KEY=DIN_PUBLIC_KEY,VAPID_SUBJECT=mailto:claus@replaymaker.dk,FIREBASE_PROJECT_ID=juice-da-car"
```

Alternativ (uden Cloud Build): `--source` deploy bygger også i EU når `--region europe-west1` angives.

```powershell
# 3. VAPID secret (engang)
echo -n "PRIVATE_KEY" | gcloud secrets create vapid-private-key --data-file=- --project juice-da-car --replication-policy=user-managed --locations=europe-west1
# Se README.md

# 5. Frontend
npm run build:frontend
firebase deploy --only hosting --project juice-da-car
```

## Custom domain (senere)

Firebase Hosting → Add custom domain → `reminders.replaymaker.dk` (CNAME hos DNS).

## Bemærk om elbil

Gamle links til `juice-da-car.web.app` i elbil-kode er forældede (elbil kører på `tesla-app-453016`). Efter HYRM-deploy peger `juice-da-car.web.app` på reminder-PWA — det er OK hvis elbil ikke bruger det domæne længere.
