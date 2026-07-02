# Drift og overvågning (HYRM)

Privat single-user setup på `juice-da-car` / `europe-west1`. Ingen dedikeret SRE — brug dette som tjekliste.

## Hurtig sundhedstjek

1. **App:** https://juice-da-car.web.app — push-status chip skal være grøn når der er aktiv enhed.
2. **Firestore:** dokument `system/dispatch_health` opdateres hvert 15. minut (Scheduler).
3. **Script (lokal):** med service account JSON:

```powershell
node deploy/check-push-state.mjs backend/api/sa-key.json
```

Relevante felter i `dispatch_health`:

| Felt | Betydning |
|------|-----------|
| `lastDispatchCompletedAt` | Seneste vellykkede kørsel |
| `activeDeviceCount` | Aktive push-enheder |
| `openOccurrencesWithoutDevice` | Åbne opgaver uden push *og* uden e-mail backup |
| `consecutiveFailures` | Antal slots i træk uden sendte notifikationer |
| `failuresInLastRun` | Fejl i seneste slot |

## Cloud Scheduler

Job: `reminder-dispatch`, cron `*/15 * * * *`, timezone `Europe/Copenhagen`.

Tjek i Console → Cloud Scheduler at **Last run** er grøn. Ved fejl: Cloud Run Invoker på dispatcher + OIDC audience matcher service-URL.

## Logging

- **Dispatcher:** Cloud Run → `reminder-dispatcher` → Logs. Søg efter `dispatch` / fejl fra web-push.
- **API:** Cloud Run → `reminder-api` → Logs ved 4xx/5xx.

Budget-alarm anbefales på 5 og 10 USD (Billing → Budgets).

## Firestore indexes

Indexes er defineret i `firestore.indexes.json`. Deploy efter ændring:

```powershell
firebase deploy --only firestore:indexes --project juice-da-car
```

Composite index på `task_templates` (ownerId + updatedAt) er påkrævet for opgavelisten i appen.

**Status (juice-da-car):** Alle indexes fra `firestore.indexes.json` er deployet (inkl. `task_templates`).

## Alarmer (valgfrit, fase 5)

Custom Cloud Monitoring metrics fra dispatcher er **ikke** implementeret endnu. Indtil da:

1. **Manuelt:** Tjek `consecutiveFailures > 2` i `dispatch_health` via script eller Firebase Console.
2. **Log-based alert:** Opret alert på Cloud Run log `"All channels failed"` eller HTTP 5xx på dispatcher.
3. **Scheduler:** Alert når job status ≠ SUCCESS i 30 min.

## Git / build artifacts

`dist/` og `*.tsbuildinfo` er i `.gitignore`. Kør `npm run build` før deploy; commit kun kildekode.

## Kendte begrænsninger

- **iOS Web Push:** Ingen action-knapper på lock screen — tap åbner appen.
- **Reminder-faser (deadline escalation):** Datamodel har `reminderPhases`, men produktet bruger kun én nag-kadence (15m → 1t → daglig). Bevidst sat på pause — se README roadmap.
- **E-mail backup:** Kode findes; kræver SMTP-env på dispatcher.
