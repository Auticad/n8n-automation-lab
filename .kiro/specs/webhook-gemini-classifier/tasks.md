# Implementation Plan: webhook-gemini-classifier

## Overview

Implementare il workflow n8n `05-webhook-gemini-classifier` come file JSON importabile, corredato di funzioni JavaScript pure estratte dai Code node e testabili in isolamento con Jest + fast-check. Il workflow espone un endpoint HTTP webhook, classifica il payload JSON via Google Gemini, scrive il risultato su Google Sheets, e gestisce rate limiting e dead-letter in modo robusto.

---

## Tasks

- [x] 1. Struttura del progetto e dipendenze di test
  - Creare la cartella `workflows/05-webhook-gemini-classifier/` con le sottocartelle `tests/` e `tests/integration/`
  - Creare `package.json` con dipendenze: `jest`, `fast-check` (dev dependencies)
  - Creare `jest.config.js` con configurazione base (testMatch, transform se necessario)
  - Creare i file di test stub vuoti: `tests/validate-truncate.test.js`, `tests/parse-gemini-response.test.js`, `tests/build-sheets-row.test.js`, `tests/integration/workflow.integration.test.js`
  - _Requirements: struttura file definita nel design_

- [x] 2. Code node — Validate & Truncate (funzione pura + test)
  - [x] 2.1 Implementare `validateAndTruncate(body, headers)` in `tests/validate-truncate.js`
    - Controlla `Content-Type: application/json` → errore `{ statusCode: 415, body: { error: "unsupported_media_type" } }`
    - Controlla che il body sia un oggetto JSON valido (non null, non stringa) → errore `{ statusCode: 400, body: { error: "invalid_payload", detail: "..." } }`
    - Serializza il payload; se supera 10.000 caratteri, tronca e imposta `truncated: true`
    - Aggiunge `received_at` (ISO 8601 UTC) e `retry_count: 0`
    - Output shape: `{ payload, payload_raw, received_at, retry_count, truncated }`
    - _Requirements: 1.3, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ]* 2.2 Scrivere test unitari per `validateAndTruncate`
    - Caso: payload JSON valido < 10.000 char → `truncated: false`, `payload_raw` intatto
    - Caso: payload JSON valido > 10.000 char → `truncated: true`, `payload_raw.length === 10000`
    - Caso: payload vuoto `{}` → nessun errore, `truncated: false`
    - Caso: body non-JSON → `statusCode: 400`, `error: "invalid_payload"`
    - Caso: Content-Type non application/json → `statusCode: 415`
    - Caso: `received_at` aggiunto e ISO 8601 valido
    - _Requirements: 1.3, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ]* 2.3 Scrivere property test — Property 1: payload JSON passato invariato
    - **Property 1: Payload JSON valido passato invariato**
    - `fc.object()` → `JSON.parse(result.payload_raw)` deve essere uguale all'input
    - **Validates: Requirements 1.2, 2.1**

  - [ ]* 2.4 Scrivere property test — Property 2: payload non-JSON → sempre 400
    - **Property 2: Payload non-JSON produce sempre HTTP 400**
    - `fc.string().filter(s => non-parsabile)` → `result.statusCode === 400` e `result.body.error === "invalid_payload"`
    - **Validates: Requirements 1.3, 2.2**

  - [ ]* 2.5 Scrivere property test — Property 3: Content-Type non JSON → sempre 415
    - **Property 3: Content-Type non JSON produce sempre HTTP 415**
    - `fc.string().filter(s => s !== "application/json")` come header → `result.statusCode === 415`
    - **Validates: Requirements 1.6**

  - [ ]* 2.6 Scrivere property test — Property 4: troncamento e flag truncated
    - **Property 4: Payload grande troncato a 10.000 caratteri e truncated riflette la realtà**
    - `fc.object()` → `result.payload_raw.length <= 10000` e `result.truncated === (JSON.stringify(payload).length > 10000)`
    - **Validates: Requirements 2.4, 2.5**

  - [ ]* 2.7 Scrivere property test — Property 5: received_at sempre ISO 8601
    - **Property 5: received_at è sempre presente e in formato ISO 8601**
    - `fc.object()` → `result.received_at` definito e `new Date(result.received_at).toISOString()` non lancia
    - **Validates: Requirements 2.6**

- [x] 3. Checkpoint — Validate & Truncate
  - Eseguire `npx jest tests/validate-truncate.test.js` e assicurarsi che tutti i test passino. Risolvere eventuali failing prima di procedere.

- [x] 4. Code node — Parse Classification Result (funzione pura + test)
  - [x] 4.1 Implementare `parseGeminiResponse(rawText)` in `tests/parse-gemini-response.js`
    - Tenta `JSON.parse(rawText)` sul testo restituito da Gemini
    - Valida: `category` è uno tra `informational | transactional | error | alert | other`
    - Valida: `confidence` è un numero float tra 0 e 1 (inclusi)
    - Valida: `summary` è una stringa di massimo 200 caratteri
    - Se validazione ok → restituisce `Classification_Result`
    - Se validazione fallisce → restituisce `{ error: true, error_type: "parse_error", original: rawText }`
    - _Requirements: 3.2, 3.3, 3.4_

  - [ ]* 4.2 Scrivere test unitari per `parseGeminiResponse`
    - Caso: JSON valido completo → `Classification_Result` identico all'input
    - Caso: `summary` > 200 char → branch parse_error
    - Caso: `confidence` fuori range (es. 1.5) → branch parse_error
    - Caso: `category` non valida (es. "spam") → branch parse_error
    - Caso: risposta non-JSON ("Sorry, I can't help") → branch parse_error
    - Caso: JSON con campi mancanti (`{ "category": "alert" }`) → branch parse_error
    - _Requirements: 3.2, 3.3, 3.4_

  - [ ]* 4.3 Scrivere property test — Property 6: parsing Gemini è round-trip fedele
    - **Property 6: Parsing della risposta Gemini è un round-trip fedele**
    - `fc.record({ category: fc.constantFrom(...), confidence: fc.float({min:0, max:1}), summary: fc.string({maxLength:200}) })` → `result` uguale all'input
    - `fc.string().filter(s => non-parsabile)` → `result.error === true` e `error_type === "parse_error"`
    - **Validates: Requirements 3.3, 3.4**

- [x] 5. Checkpoint — Parse Classification Result
  - Eseguire `npx jest tests/parse-gemini-response.test.js` e assicurarsi che tutti i test passino.

- [x] 6. Logica costruzione riga Sheets (funzione pura + test)
  - [x] 6.1 Implementare `buildSheetsRow(classificationResult, workflowState)` in `tests/build-sheets-row.js`
    - Prende `Classification_Result` + stato workflow (`received_at`, `payload_raw`, `truncated`)
    - Restituisce oggetto con esattamente 6 campi: `timestamp`, `category`, `confidence`, `summary`, `payload_raw`, `truncated`
    - `timestamp` = `workflowState.received_at`
    - `payload_raw` limitato a 10.000 caratteri
    - `truncated` è boolean
    - _Requirements: 5.1, 5.2_

  - [ ]* 6.2 Scrivere test unitari per `buildSheetsRow`
    - Caso: tutti i campi presenti con tipi corretti
    - Caso: `truncated` è sempre boolean
    - Caso: `confidence` è sempre number
    - _Requirements: 5.1, 5.2_

  - [ ]* 6.3 Scrivere property test — Property 8: riga Sheets sempre completa e corretta
    - **Property 8: Happy path — riga Sheets contiene sempre i 6 campi con tipi corretti**
    - `fc.record({category, confidence, summary})` + `fc.object()` → riga ha tutti e 6 i campi, `typeof truncated === "boolean"`, `typeof confidence === "number"`
    - **Validates: Requirements 5.1, 5.2, 5.5**

- [x] 7. Checkpoint — Build Sheets Row
  - Eseguire `npx jest tests/build-sheets-row.test.js` e assicurarsi che tutti i test passino.

- [x] 8. Costruire il workflow n8n JSON
  - [x] 8.1 Creare lo scheletro del workflow JSON `webhook-gemini-classifier.json`
    - Struttura base n8n: `name`, `nodes`, `connections`, `settings`, `pinData`
    - Impostare `settings.executionOrder: "v1"` e timeout 30s
    - Aggiungere placeholder `YOUR_SPREADSHEET_ID` per Google Sheets
    - _Requirements: 1.1, 5.3_

  - [x] 8.2 Aggiungere Webhook_Trigger e Set node (Enrich)
    - Nodo `n8n-nodes-base.webhook`: method POST, responseMode `responseNode`
    - Nodo `n8n-nodes-base.set`: campi `received_at` (`{{ $now.toISO() }}`), `retry_count` (`0`)
    - Collegare Webhook_Trigger → Set Enrich
    - _Requirements: 1.1, 1.2, 2.6_

  - [x] 8.3 Aggiungere Code node — Validate & Truncate
    - Nodo `n8n-nodes-base.code` (JavaScript) con la logica di `validateAndTruncate`
    - Branch di uscita per errore 400 → Respond to Webhook 400
    - Branch di uscita per errore 415 → Respond to Webhook 415
    - Collegare Set Enrich → Code Validate → branch ok / branch errori
    - _Requirements: 1.3, 1.6, 2.2, 2.4, 2.5_

  - [x] 8.4 Aggiungere HTTP Request node — Classifier (Gemini)
    - Nodo `n8n-nodes-base.httpRequest`: endpoint Gemini `generateContent`, credenziale Google Gemini (PaLM API), timeout 30s, `Continue on Fail: true`
    - Prompt di sistema e body template come da design
    - Collegare branch ok di Validate → Classifier
    - _Requirements: 3.1, 3.2, 3.5_

  - [x] 8.5 Aggiungere If node — Route by Status e Rate Limiter loop
    - Nodo `n8n-nodes-base.if` con tre branch: 200 OK (`$json.candidates` esiste), 429 (`$json.error.code === 429`), fallback altro errore
    - Set node Increment Counter: `retry_count = {{ $json.retry_count + 1 }}`
    - If node Check Retry Limit: `retry_count < 3` → ritorna al Classifier; else → dead-letter rate_limit_exceeded
    - Wait node: 60 secondi fissi, posizionato tra Increment Counter e ritorno al Classifier
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 8.6 Aggiungere Code node — Parse Classification Result
    - Nodo `n8n-nodes-base.code` con la logica di `parseGeminiResponse`
    - Branch parse ok → Google Sheets Writer (tab Classificazioni)
    - Branch parse error → Google Sheets Dead Letter Writer (tab Errors) → Respond 500 parse_error
    - _Requirements: 3.3, 3.4_

  - [x] 8.7 Aggiungere Google Sheets Writer (tab Classificazioni) e Respond 200
    - Nodo `n8n-nodes-base.googleSheets`: operazione Append Row, tab `Classificazioni`, credenziale Google OAuth2
    - Colonne in ordine: `timestamp`, `category`, `confidence`, `summary`, `payload_raw`, `truncated`
    - Branch successo → Respond to Webhook 200 (`{"status":"ok","category":"<val>","confidence":<val>}`)
    - Branch fallimento → Log Sheets Error → Respond 500 sheets_write_failed
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 8.8 Aggiungere Google Sheets Dead Letter Writer (tab Errors) e tutti i Respond nodes
    - Nodo `n8n-nodes-base.googleSheets`: operazione Append Row, tab `Errors`, colonne: `timestamp`, `error_type`, `error_message`, `payload_raw` (max 5000 char)
    - Aggiungere tutti i Respond to Webhook nodes: 200, 400, 415, 429, 500 (parse), 500 (sheets), 500 (gemini)
    - Collegare branch dead-letter dei vari percorsi di errore ai rispettivi Respond nodes
    - _Requirements: 5.4, 6.1, 6.2, 6.3, 6.4_

- [ ] 9. Checkpoint — Workflow JSON completo
  - Verificare che il JSON sia valido (`JSON.parse`) e importabile in n8n. Controllare che ogni nodo critico abbia il connettore Error collegato al branch di errore globale (Requirement 6.1). Risolvere eventuali problemi prima di procedere.

- [ ] 10. README del workflow
  - [ ] 10.1 Creare `workflows/05-webhook-gemini-classifier/README.md`
    - Sezioni: descrizione, prerequisiti (credenziali n8n), istruzioni di importazione, configurazione (`YOUR_SPREADSHEET_ID`), struttura tab Google Sheets, esempi di payload
    - _Requirements: struttura collezione n8n-automation-lab_

- [ ] 11. Test di integrazione
  - [~] 11.1 Implementare mock per Gemini e Sheets in `tests/integration/workflow.integration.test.js`
    - Mock HTTP per Gemini: risposte 200 OK, 429 ripetuti, testo non-JSON, timeout
    - Mock per Google Sheets: successo e errore 503
    - _Requirements: 3.1, 3.4, 4.1, 4.2, 4.3, 5.4_

  - [ ]* 11.2 Scrivere test di integrazione — happy path
    - Payload valido → Gemini mock 200 → Sheets mock OK → verifica risposta 200 e riga Sheets corretta
    - **Validates: Requirements 3.3, 5.1, 5.5**

  - [ ]* 11.3 Scrivere test di integrazione — Gemini 429 × 3
    - Gemini mock sempre 429 → verifica risposta 429, dead-letter row con `error_type: "rate_limit_exceeded"`, `retry_count === 3`
    - **Validates: Requirements 4.1, 4.2, 4.3**

  - [ ]* 11.4 Scrivere test di integrazione — Gemini parse error
    - Gemini mock con body "I don't know" → verifica risposta 500, dead-letter con `error_type: "parse_error"`
    - **Validates: Requirements 3.4, 6.2**

  - [ ]* 11.5 Scrivere test di integrazione — Sheets write fail
    - Gemini mock 200 OK, Sheets mock errore 503 → verifica risposta 500 `{"error":"sheets_write_failed"}`
    - **Validates: Requirements 5.4**

  - [ ]* 11.6 Scrivere property test — Property 9: routing errori HTTP sempre coerente
    - **Property 9: Routing degli errori — codice HTTP corrisponde sempre alla causa**
    - Per ogni tipo di errore simulato, verifica che il codice HTTP e `error_type` nella dead-letter corrispondano alla causa
    - **Validates: Requirements 5.4, 6.2, 6.4**

- [~] 12. Checkpoint finale — Tutti i test passano
  - Eseguire `npx jest --runInBand` (tutti i file di test). Assicurarsi che tutti i test passino. Chiedere all'utente se ha domande prima di considerare l'implementazione completa.

---

## Notes

- I task contrassegnati con `*` sono opzionali e possono essere saltati per un MVP più veloce
- Ogni task referenzia requisiti specifici per la tracciabilità
- Le funzioni JavaScript pure estratte dai Code node (`validateAndTruncate`, `parseGeminiResponse`, `buildSheetsRow`) vanno implementate come moduli CommonJS testabili in isolamento con Jest — il workflow n8n includerà il codice inline nel nodo
- Il placeholder `YOUR_SPREADSHEET_ID` va sostituito manualmente prima dell'uso in produzione
- I test di property-based usano `fast-check` con minimo 100 iterazioni per proprietà (`numRuns: 100`)
- I test di integrazione usano mock HTTP (es. `jest-fetch-mock` o `nock`) per simulare Gemini e Sheets senza chiamate reali

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1"] },
    { "id": 1, "tasks": ["2.2", "2.3", "2.4", "2.5", "2.6", "2.7", "4.1"] },
    { "id": 2, "tasks": ["4.2", "4.3", "6.1"] },
    { "id": 3, "tasks": ["6.2", "6.3", "8.1"] },
    { "id": 4, "tasks": ["8.2"] },
    { "id": 5, "tasks": ["8.3"] },
    { "id": 6, "tasks": ["8.4"] },
    { "id": 7, "tasks": ["8.5", "8.6"] },
    { "id": 8, "tasks": ["8.7"] },
    { "id": 9, "tasks": ["8.8", "10.1"] },
    { "id": 10, "tasks": ["11.1"] },
    { "id": 11, "tasks": ["11.2", "11.3", "11.4", "11.5", "11.6"] }
  ]
}
```
