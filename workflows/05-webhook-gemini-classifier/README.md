# 05 — Webhook Gemini Classifier

**Livello:** ⚡⚡⚡⚡ Esperto  
**Stack:** n8n · Google Gemini 2.5 Flash · Google Sheets  

---

## Cosa fa

Espone un endpoint HTTP webhook che accetta qualsiasi payload JSON, lo classifica tramite Google Gemini in una delle cinque categorie (`informational`, `transactional`, `error`, `alert`, `other`), e scrive il risultato su Google Sheets.

Gestisce in modo esplicito:
- Rate limiting Gemini (429): retry automatico fino a 3 volte con attesa di 60 secondi
- Risposte Gemini non valide o in formato markdown: normalizzazione automatica prima del parsing
- Errori di scrittura Sheets: risposta 500 al client con dead-letter su tab separato
- Payload non validi: 400 / 415 senza chiamare Gemini

---

## Prerequisiti

| Risorsa | Dettaglio |
|---|---|
| n8n | Self-hosted o n8n Cloud, versione ≥ 1.0 |
| Google Gemini API key | Ottenibile gratuitamente da [Google AI Studio](https://aistudio.google.com/) → **Get API key** |
| Credenziale Google Sheets | Tipo `Google Sheets OAuth2` configurata in n8n |
| Google Sheets | Un foglio con due tab: `Classificazioni` e `Errors` (vedi struttura sotto) |

> **Nota modello:** Il workflow usa `gemini-2.5-flash`. Se il modello non è disponibile sul tuo account, verifica i modelli attivi chiamando `https://generativelanguage.googleapis.com/v1beta/models?key=TUA_API_KEY`.

---

## Importazione in n8n

1. In n8n: menu **+** → **Import from file**
2. Seleziona `webhook-gemini-classifier.json`
3. Il workflow viene importato in stato **inattivo**

---

## Configurazione post-importazione

### 1. API Key Gemini nell'URL

Nel nodo `HTTP_Classifier_Gemini`, campo **URL**, sostituisci il placeholder:

```
https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=YOUR_GEMINI_API_KEY
```

→ rimpiazza `YOUR_GEMINI_API_KEY` con la tua chiave da AI Studio.  
Il campo **Authentication** deve essere impostato su **None**.

### 2. Spreadsheet ID

Nei nodi `GoogleSheets_Writer_Classificazioni`, `GoogleSheets_DeadLetter_RateLimit`, `GoogleSheets_DeadLetter_Parse`, `GoogleSheets_DeadLetter_Gemini`:

- Apri il nodo → campo **Document ID**
- Sostituisci `YOUR_SPREADSHEET_ID` con l'ID del tuo foglio Google  
  *(l'ID è nella URL: `https://docs.google.com/spreadsheets/d/**{ID}**/edit`)*

### 3. Credenziale Google Sheets

In tutti i nodi `GoogleSheets_*`:
- Campo **Credential** → seleziona la tua credenziale `Google Sheets account`

### 4. Connessione loop retry (manuale)

Il loop di retry non è esprimibile nel formato SDK — va aggiunto una volta nell'UI:

- Trascina un connettore dal nodo `Wait_60s` → `HTTP_Classifier_Gemini`

### 5. Attiva il workflow

Toggle **Inactive → Active** in alto a destra. L'URL webhook viene generato automaticamente.

---

## Struttura Google Sheets

### Tab `Classificazioni`

| Colonna | Tipo | Descrizione |
|---|---|---|
| `timestamp` | Testo | ISO 8601 UTC — orario di ricezione del webhook |
| `category` | Testo | Una tra: `informational`, `transactional`, `error`, `alert`, `other` |
| `confidence` | Numero | Float [0.0 – 1.0] — grado di confidenza Gemini |
| `summary` | Testo | Sommario del payload (max 200 caratteri) |
| `payload_raw` | Testo | Payload originale serializzato in JSON (max 10.000 caratteri) |
| `truncated` | Booleano | `true` se il payload è stato troncato a 10.000 caratteri |

### Tab `Errors`

| Colonna | Tipo | Descrizione |
|---|---|---|
| `timestamp` | Testo | ISO 8601 UTC |
| `error_type` | Testo | `rate_limit_exceeded` / `parse_error` / `gemini_error` / `sheets_write_failed` |
| `error_message` | Testo | Messaggio di errore dettagliato |
| `payload_raw` | Testo | Payload originale (max 5.000 caratteri) |

---

## Test del webhook

Con il workflow in modalità test (pulsante **Execute workflow** nel canvas):

```cmd
curl -X POST https://pietrocam.app.n8n.cloud/webhook-test/webhook-gemini-classifier -H "Content-Type: application/json" -d "{\"evento\": \"acquisto\", \"utente\": \"u123\", \"importo\": 49.99}"
```

In produzione (workflow attivo), sostituisci `/webhook-test/` con `/webhook/`.

**Risposta attesa:**
```json
{ "status": "ok", "category": "transactional", "confidence": 0.95 }
```

---

## Codici di risposta

| Codice | Causa |
|---|---|
| `200` | Classificazione e scrittura Sheets riuscite |
| `400` | Payload non è JSON valido |
| `415` | `Content-Type` non è `application/json` |
| `429` | Gemini ha risposto 429 per 3 volte consecutive (dead-letter scritto) |
| `500` | Errore parsing risposta Gemini, scrittura Sheets fallita, o errore Gemini generico |

---

## Note implementative

**Markdown stripping:** Gemini 2.5 Flash tende a rispondere avvolgendo il JSON in backtick markdown (` ```json ... ``` `) anche quando esplicitamente istruito a non farlo. Il nodo `Code_ParseGeminiResponse` rimuove automaticamente queste decorazioni prima del parsing.

**Set_Enrich e campi webhook:** Il nodo `Set_Enrich` ha `includeOtherFields: true` per preservare `headers` e `body` del webhook attraverso la pipeline. Senza questa impostazione, il `Code_ValidateTruncate` non riceve il Content-Type e risponde 415 a qualsiasi richiesta.

---

## Test

Prerequisito: `npm install` nella cartella del workflow.

```bash
npx jest tests/validate-truncate.test.js
npx jest tests/parse-gemini-response.test.js
npx jest tests/build-sheets-row.test.js
npx jest --runInBand
```
