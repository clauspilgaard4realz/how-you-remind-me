# How You Remind Me

Privat reminder-PWA med push-notifikationer. Single-user, Firebase Auth, Firestore, Cloud Run (EU).

**Produktion:** https://juice-da-car.web.app  
**GCP-projekt:** `juice-da-car` · region `europe-west1`

PoC er gennemført. Appen har gentagne opgaver, snooze, redigér/slet, grupperet overblik og push med nag-kadence (15 min → 1 time → daglig).

## Struktur

```
frontend/           React + Vite PWA (Nat-tema)
backend/api/        Cloud Run Reminder API
backend/dispatcher/ Cloud Run Reminder Dispatcher (privat, Scheduler)
shared/             Delte TypeScript-typer og validering
deploy/             Deploy-guides og drift (se nedenfor)
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

Kopiér `.env.example` til `.env` i `backend/api/` og `backend/dispatcher/`. Opret `frontend/.env` med Firebase web config (se `deploy/DEPLOY-JUICE-DA-CAR.md`).

| Variabel | Beskrivelse |
|----------|-------------|
| `VITE_ALLOWED_UID` / `ALLOWED_UID` | Din Firebase UID efter første login |
| `VITE_VAPID_PUBLIC_KEY` / `VAPID_PUBLIC_KEY` | VAPID public key |
| `VAPID_PRIVATE_KEY` | Kun dispatcher |
| `VITE_API_BASE_URL` | `http://localhost:8081` lokalt (API på 8081, dispatcher på 8080) |

### 4. Firebase

1. Opret/brug Firebase-projekt.
2. Aktivér **Authentication → Google**.
3. Opret **Firestore** (Native mode, region `europe-west1`).
4. Deploy rules og indexes:

```powershell
firebase deploy --only firestore:rules,firestore:indexes --project juice-da-car
```

5. Hent web app config til `frontend/.env`.

### 5. Kør services

Tre terminaler (PowerShell):

```powershell
npm run dev:api
```

```powershell
cd backend/dispatcher ; npx tsx src/index.ts
```

```powershell
npm run dev:frontend
```

Test dispatch manuelt:

```powershell
curl -X POST http://localhost:8080/dispatch -H "x-dispatch-secret: change-me"
```

### 6. iPhone / PWA

1. Deploy frontend til HTTPS (Firebase Hosting) eller brug ngrok mod lokal frontend.
2. Åbn i **Safari** → Del → **Føj til hjemmeskærm**.
3. Åbn appen fra ikonet → **Aktivér push** → opret en opgave.
4. Push virker fra iOS 16.4+ som hjemmeskærm-PWA. Action-knapper på lock screen understøttes **ikke** på iOS — tap åbner appen.

---

## Deploy til GCP

Detaljeret guide for `juice-da-car`: **[deploy/DEPLOY-JUICE-DA-CAR.md](deploy/DEPLOY-JUICE-DA-CAR.md)**  
Drift og overvågning: **[deploy/OPS.md](deploy/OPS.md)**

Kort version:

```powershell
firebase deploy --only firestore:rules,firestore:indexes --project juice-da-car
gcloud builds submit --config deploy/cloudbuild-api.yaml --project juice-da-car --region europe-west1
gcloud builds submit --config deploy/cloudbuild-dispatcher.yaml --project juice-da-car --region europe-west1
# Cloud Run deploy fra EU Artifact Registry (se deploy-guide)
npm run build:frontend
firebase deploy --only hosting --project juice-da-car
```

Cloud Scheduler: `*/15 * * * *`, timezone `Europe/Copenhagen`, POST til dispatcher `/dispatch` med OIDC.

Hosting rewrite: `/api/**` → Cloud Run `reminder-api` (se `firebase.json`).

---

## Status (implementeret)

- [x] PWA fra Safari på iPhone (hjemmeskærm)
- [x] Google login + UID whitelist
- [x] Push subscription + health i appen
- [x] Gentagne opgaver + materialisering af occurrences
- [x] 15-minutters dispatch-slot + nag-kadence
- [x] Snooze (15 min / 1 time / i morgen)
- [x] Klaret stopper reminders; 410 deaktiverer subscription
- [x] Overblik: Forfaldne / Senere i dag / I morgen / Senere
- [x] Detalje-overlay, redigér og slet (serie eller enkelt occurrence)
- [x] Push actions på Android (Klaret / Udsæt 15 min)
- [x] `dispatch_health` i Firestore + push-status i UI

---

## Roadmap

### På pause — reminder-faser (fase 2)

Datamodel har `reminderPhases`, men produktet bruger kun **én nag-kadence** baseret på hvor længe en opgave har været forfalden (15 min → 1 t → daglig). Det dækker privat brug fint indtil videre — **ingen planlagt implementering** af fuld deadline-escalation med flere faser.

### Senere (funktion)

- Månedlig gentagelse
- Dybere "kun denne gang" (scope findes i UI; backend er begrænset)
- Grupperede notifikationer
- E-mail backup (kode findes — kræver SMTP på dispatcher)
- Slack / andre kanaler
- iOS: bedre tap-flow fra notifikation

### Aktuelt fokus — drift og kvalitet (fase 5)

- [x] Firestore composite index for `task_templates` defineret i `firestore.indexes.json`
- [x] Driftsguide: [deploy/OPS.md](deploy/OPS.md)
- [x] **Deploy indexes til prod** — inkl. `task_templates` (ownerId + updatedAt) deployet til `juice-da-car`
- [ ] Log-baserede alarmer (Scheduler fejl, dispatcher 5xx)
- [ ] Custom Cloud Monitoring metrics fra dispatcher (valgfrit)
- [ ] Custom domain `reminders.replaymaker.dk` (når DNS er klar)

---

## Omkostning

Ved privat brug og korrekt konfiguration (ingen minimum instances, indexerede queries): **forventet ~0 USD/md** inden for free tiers. Sæt budget alerts på 5 og 10 USD.
