# Test Cases — 05 Webhook Gemini Classifier

Base URL test: `https://pietrocam.app.n8n.cloud/webhook-test/webhook-gemini-classifier`

---

## 1. Happy path — evento transazionale

```cmd
curl -X POST https://pietrocam.app.n8n.cloud/webhook-test/webhook-gemini-classifier -H "Content-Type: application/json" -d "{\"evento\": \"acquisto\", \"utente\": \"u123\", \"importo\": 49.99}"
```

**Atteso:** `200` — classificazione `transactional`, riga scritta su tab `Classificazioni`.
```json
{ "status": "ok", "category": "transactional", "confidence": 0.9 }
```

---

## 2. Happy path — evento di errore applicativo

```cmd
curl -X POST https://pietrocam.app.n8n.cloud/webhook-test/webhook-gemini-classifier -H "Content-Type: application/json" -d "{\"level\": \"error\", \"msg\": \"NullPointerException\", \"service\": \"payments\", \"ts\": 1700000000}"
```

**Atteso:** `200` — classificazione `error`, confidence alta (≥ 0.85).
```json
{ "status": "ok", "category": "error", "confidence": 0.92 }
```

---

## 3. Happy path — payload vuoto

```cmd
curl -X POST https://pietrocam.app.n8n.cloud/webhook-test/webhook-gemini-classifier -H "Content-Type: application/json" -d "{}"
```

**Atteso:** `200` — classificazione `other` (payload senza contesto), confidence bassa (< 0.6).
```json
{ "status": "ok", "category": "other", "confidence": 0.4 }
```

---

## 4. Happy path — evento informativo

```cmd
curl -X POST https://pietrocam.app.n8n.cloud/webhook-test/webhook-gemini-classifier -H "Content-Type: application/json" -d "{\"tipo\": \"newsletter\", \"oggetto\": \"Aggiornamento mensile prodotto\", \"destinatari\": 1240}"
```

**Atteso:** `200` — classificazione `informational`.
```json
{ "status": "ok", "category": "informational", "confidence": 0.88 }
```

---

## 5. Errore 415 — Content-Type sbagliato

```cmd
curl -X POST https://pietrocam.app.n8n.cloud/webhook-test/webhook-gemini-classifier -H "Content-Type: text/plain" -d "{\"evento\": \"test\"}"
```

**Atteso:** `415` — rifiutato prima di chiamare Gemini. Nessuna riga su Sheets.
```json
{ "error": "unsupported_media_type" }
```

---

## 6. Errore 400 — body non JSON

```cmd
curl -X POST https://pietrocam.app.n8n.cloud/webhook-test/webhook-gemini-classifier -H "Content-Type: application/json" -d "questo non e json"
```

**Atteso:** `400` — payload rifiutato. Nessuna riga su Sheets.
```json
{ "error": "invalid_payload", "detail": "..." }
```

---

## 7. Happy path — alert di sistema

```cmd
curl -X POST https://pietrocam.app.n8n.cloud/webhook-test/webhook-gemini-classifier -H "Content-Type: application/json" -d "{\"alert\": \"CPU > 95%\", \"host\": \"prod-server-01\", \"durata_min\": 12}"
```

**Atteso:** `200` — classificazione `alert`, confidence alta.
```json
{ "status": "ok", "category": "alert", "confidence": 0.95 }
```

---

## Verifica su Google Sheets

Dopo i test 1, 2, 3, 4, 7: apri il tab `Classificazioni` e verifica che ci siano 5 righe con `timestamp`, `category`, `confidence`, `summary` e `payload_raw` compilati. I test 5 e 6 non devono produrre righe.
