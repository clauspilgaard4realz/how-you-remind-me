# How You Remind Me

Privat reminder-PWA med push-notifikationer. PoC: single task, 15-minutters dispatch, standard Web Push (VAPID).

## Struktur

```
frontend/           React + Vite PWA
backend/api/        Cloud Run Reminder API
backend/dispatcher/ Cloud Run Reminder Dispatcher (privat)
shared/             Delte TypeScript-typer
```

## Lokal udvikling

### 1. Installer afhængigheder

```powershell
npm install
npm run build -w @hyrm/shared
```

### 2. Opret VAPID-nøgler

```powershell
npx web-push generate-vapid-keys
```

Gem public key i frontend og API/dispatcher. Private key kun i dispatcher (Secret Manager i prod).

### 3. Konfigurer miljø

Kopiér `.env.example` til `.env` i `frontend/`, `backend/api/` og `backend/dispatcher/`.

| Variabel | Beskrivelse |
|----------|-------------|
| `VITE_ALLOWED_UID` / `ALLOWED_UID` | Din Firebase UID efter første login |
| `VITE_VAPID_PUBLIC_KEY` / `VAPID_PUBLIC_KEY` | VAPID public key |
| `VAPID_PRIVATE_KEY` | Kun dispatcher |
| `VITE_API_BASE_URL` | `http://localhost:8081` lokalt (API på 8081, dispatcher på 8080) |

### 4. Firebase

1. Opret/ brug Firebase-projekt (samme som Replaymaker eller nyt).
2. Aktivér **Authentication → Google**.
3. Opret **Firestore** (Native mode, region `europe-west1`).
4. Deploy rules og indexes:

```powershell
firebase deploy --only firestore:rules,firestore:indexes
```

5. Hent web app config til `frontend/.env`.

### 5. Kør services

Terminal 1 – API:

```powershell
cd backend/api
npx tsx src/index.ts
```

Terminal 2 – Dispatcher:

```powershell
cd backend/dispatcher
npx tsx src/index.ts
```

Terminal 3 – Frontend:

```powershell
npm run dev:frontend
```

Test dispatch manuelt:

```powershell
curl -X POST http://localhost:8080/dispatch -H "x-dispatch-secret: change-me"
```

(Dispatcher kører på port 8080 som standard – skift API til 8081 hvis begge kører lokalt.)

### 6. iPhone PoC

1. Deploy frontend til HTTPS (Firebase Hosting) eller brug ngrok mod lokal frontend.
2. Åbn i **Safari** → Del → **Føj til hjemmeskærm**.
3. Åbn appen fra ikonet → **Aktivér push** → opret en opgave.
4. Verificér push på lock screen og at **Klaret** stopper reminders.

---

## Deploy til GCP (europe-west1)

### Firebase Hosting (frontend)

```powershell
npm run build:frontend
firebase deploy --only hosting
```

Subdomæne `reminders.replaymaker.dk`: tilføj custom domain i Firebase Hosting → DNS CNAME.

### Cloud Run – Reminder API

```powershell
gcloud run deploy reminder-api `
  --source backend/api `
  --region europe-west1 `
  --allow-unauthenticated `
  --set-env-vars "ALLOWED_UID=din-uid,FIREBASE_PROJECT_ID=dit-projekt"
```

Service account skal have **Cloud Datastore User** (Firestore).

### Cloud Run – Reminder Dispatcher (privat)

```powershell
gcloud run deploy reminder-dispatcher `
  --source backend/dispatcher `
  --region europe-west1 `
  --no-allow-unauthenticated `
  --set-secrets "VAPID_PRIVATE_KEY=vapid-private-key:latest" `
  --set-env-vars "ALLOWED_UID=din-uid,VAPID_PUBLIC_KEY=...,VAPID_SUBJECT=mailto:reminders@replaymaker.dk,FIREBASE_PROJECT_ID=dit-projekt"
```

Opret secret:

```powershell
echo -n "din-private-key" | gcloud secrets create vapid-private-key --data-file=- --replication-policy=user-managed --locations=europe-west1
```

### Cloud Scheduler

Opret service account med **Cloud Run Invoker** på dispatcher.

```powershell
gcloud scheduler jobs create http reminder-dispatch `
  --location europe-west1 `
  --schedule "*/15 * * * *" `
  --time-zone "Europe/Copenhagen" `
  --uri "https://reminder-dispatcher-xxxxx-ew.a.run.app/dispatch" `
  --http-method POST `
  --oidc-service-account-email scheduler@dit-projekt.iam.gserviceaccount.com `
  --oidc-token-audience "https://reminder-dispatcher-xxxxx-ew.a.run.app"
```

Dispatcher læser `X-CloudScheduler-ScheduleTime` som logisk slot.

### Hosting rewrite til API (valgfrit)

I `firebase.json` er `/api/**` sat til Cloud Run `reminder-api`. Alternativt: sæt `VITE_API_BASE_URL` til API’ens direkte URL.

---

## PoC definition of done

- [ ] PWA installeres fra Safari på fysisk iPhone
- [ ] Google login + UID whitelist
- [ ] Push subscription registreres
- [ ] Single task oprettes med kvarters-tid
- [ ] Dispatcher sender push på 15-min slot
- [ ] Tap på push åbner relevant occurrence
- [ ] Klaret stopper fremtidige reminders
- [ ] Ugyldig subscription (410) deaktiveres
- [ ] Gentaget slot giver højst ét aktivt claim
- [ ] Push health vises i appen

---

## Omkostning

Ved privat brug og korrekt konfiguration (ingen minimum instances, indexerede queries): **forventet ~0 USD/md** inden for free tiers. Sæt budget alerts på 5 og 10 USD.

---

## Næste skridt (efter PoC)

- Recurring tasks + materialisation
- Flere reminder-faser
- Gruppering af notifications
- Snooze (kontrakt er defineret i plan)
- E-mail backup for kritiske reminders
- Custom Cloud Monitoring metrics fra dispatcher
