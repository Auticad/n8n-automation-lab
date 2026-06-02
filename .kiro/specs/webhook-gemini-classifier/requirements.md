# Requirements Document

## Introduction

Questo documento descrive i requisiti per il workflow n8n **webhook-gemini-classifier**: un'automazione che riceve payload JSON arbitrari tramite webhook, li classifica usando Google Gemini, scrive il risultato su Google Sheets e gestisce errori e rate limiting in modo robusto.

Il workflow si inserisce nella collezione `n8n-automation-lab` come cartella `05-webhook-gemini-classifier`, seguendo le convenzioni di naming e struttura già stabilite.

---

## Glossary

- **Workflow**: Il workflow n8n oggetto di questo documento.
- **Webhook_Trigger**: Il nodo n8n che espone l'endpoint HTTP e riceve il payload in ingresso.
- **Payload**: Il corpo JSON arbitrario ricevuto via HTTP POST sul webhook.
- **Classifier**: Il componente (nodo HTTP Request o Google Gemini node) che invia il payload a Gemini e ricetta la classificazione.
- **Gemini**: L'API Google Gemini (modello `gemini-pro` o equivalente) usata per classificare il payload.
- **Sheets_Writer**: Il nodo Google Sheets che scrive il risultato della classificazione sul foglio di destinazione.
- **Error_Handler**: Il sotto-workflow o il branch dedicato alla gestione degli errori.
- **Rate_Limiter**: Il meccanismo (nodo Wait + loop) che gestisce i 429 restituiti da Gemini.
- **Classification_Result**: L'oggetto JSON prodotto da Gemini contenente almeno `category`, `confidence` e `summary`.
- **Dead_Letter_Row**: La riga scritta su un tab `Errors` del foglio Google Sheets in caso di errore non recuperabile.

---

## Requirements

---

### Requirement 1: Ricezione del webhook

**User Story:** Come sviluppatore che integra sistemi esterni, voglio un endpoint HTTP stabile che accetti qualsiasi payload JSON, così da poter inviare eventi da qualunque sorgente senza pre-processing.

#### Acceptance Criteria

1. THE Webhook_Trigger SHALL esporre un endpoint HTTP POST sull'URL generato da n8n all'importazione del workflow.
2. WHEN una richiesta HTTP POST con `Content-Type: application/json` è ricevuta, THE Webhook_Trigger SHALL estrarre il corpo della richiesta e passarlo al nodo successivo senza modifiche.
3. IF il corpo della richiesta non è JSON valido, THEN THE Webhook_Trigger SHALL rispondere con HTTP 400 e un messaggio di errore strutturato `{"error": "invalid_payload", "detail": "<descrizione>"}`.
4. WHEN una richiesta HTTP POST è ricevuta, THE Webhook_Trigger SHALL inviare la risposta HTTP al client entro 30 secondi dall'inizio dell'elaborazione.
5. WHILE il workflow è disattivato, THE Webhook_Trigger SHALL rispondere con HTTP 404 a qualsiasi richiesta in ingresso.
6. IF la richiesta in ingresso non ha `Content-Type: application/json`, THEN THE Webhook_Trigger SHALL rispondere con HTTP 415 (Unsupported Media Type) e body `{"error": "unsupported_media_type"}`.
7. IF la richiesta in ingresso usa un metodo HTTP diverso da POST (es. GET, PUT, DELETE), THEN THE Webhook_Trigger SHALL rispondere con HTTP 405 (Method Not Allowed).

---

### Requirement 2: Validazione del payload

**User Story:** Come sistema ricevente, voglio validare che il payload contenga almeno un campo identificabile, così da poter tracciare ogni evento in modo univoco sul foglio Sheets.

#### Acceptance Criteria

1. THE Workflow SHALL accettare qualsiasi struttura JSON valida come payload, senza schema fisso imposto.
2. IF il corpo della richiesta è JSON malformato, null o undefined, THEN THE Workflow SHALL rispondere con HTTP 400 e body `{"error": "invalid_payload", "detail": "<descrizione>"}` senza procedere con la classificazione.
3. WHEN il payload è un oggetto JSON vuoto `{}`, THE Workflow SHALL procedere con la classificazione usando il contesto "payload vuoto".
4. IF il payload supera i 10.000 caratteri nella serializzazione JSON, THEN THE Workflow SHALL troncare il payload a 10.000 caratteri prima di inviarlo a Gemini.
5. IF il payload è stato troncato, THEN THE Sheets_Writer SHALL impostare il campo `truncated` a `true` nel record scritto su Sheets.
6. WHEN una richiesta HTTP POST è ricevuta, THE Workflow SHALL aggiungere automaticamente un campo `received_at` con il timestamp ISO 8601 dell'arrivo della richiesta prima di qualunque elaborazione successiva.

---

### Requirement 3: Classificazione tramite Gemini

**User Story:** Come utente del workflow, voglio che il payload venga classificato da Gemini con una categoria e un grado di confidenza, così da poter analizzare i dati in modo strutturato su Sheets.

#### Acceptance Criteria

1. WHEN il payload supera la validazione, THE Classifier SHALL inviare una richiesta all'API Gemini entro 30 secondi con un prompt che include la serializzazione JSON del payload e le istruzioni di classificazione.
2. THE Classifier SHALL usare un prompt di sistema che richiede a Gemini di restituire esclusivamente un oggetto JSON con i campi: `category` (stringa, uno tra: "informational", "transactional", "error", "alert", "other"), `confidence` (numero decimale tra 0 e 1), `summary` (stringa, massimo 200 caratteri); una risposta con `summary` superiore a 200 caratteri è considerata invalida.
3. WHEN Gemini risponde con un JSON valido contenente tutti e tre i campi `{category, confidence, summary}` nel formato atteso, THE Classifier SHALL estrarre il `Classification_Result` come quell'oggetto intero e passarlo al nodo successivo.
4. IF la risposta di Gemini non contiene un JSON parsabile nel formato atteso, OPPURE IF Gemini non risponde entro 30 secondi, THEN THE Error_Handler SHALL loggare l'errore e scrivere una `Dead_Letter_Row` su Sheets con `category: "parse_error"` e il payload originale preservato nel campo `payload_raw`.
5. THE Classifier SHALL usare la credenziale Google Gemini (PaLM API) configurata in n8n — non una chiamata HTTP raw con API key.

---

### Requirement 4: Gestione del rate limiting di Gemini

**User Story:** Come operatore del workflow, voglio che i 429 di Gemini vengano gestiti con retry automatici, così da non perdere eventi nei momenti di picco.

#### Acceptance Criteria

1. IF Gemini restituisce HTTP 429 (Too Many Requests), THEN THE Rate_Limiter SHALL attendere almeno 60 secondi prima di ritentare la chiamata alla stessa richiesta.
2. IF Gemini restituisce HTTP 429 per un singolo evento processato, THEN THE Rate_Limiter SHALL ritentare la chiamata a Gemini per un massimo di 3 volte consecutive, riprendendo dal nodo Classifier con gli stessi parametri originali.
3. IF dopo 3 tentativi Gemini continua a restituire 429, THEN THE Error_Handler SHALL scrivere una `Dead_Letter_Row` su Sheets con `category: "rate_limit_exceeded"`, i dati dell'evento originale nel campo `payload_raw`, e SHALL terminare l'esecuzione senza ulteriori retry.
4. THE Rate_Limiter SHALL garantire un intervallo minimo di 60 secondi tra tentativi falliti sulla stessa chiamata, senza dipendere da code o sistemi esterni al workflow n8n.

---

### Requirement 5: Scrittura del risultato su Google Sheets

**User Story:** Come analista, voglio trovare ogni classificazione su un foglio Google Sheets con metadati standardizzati, così da poter costruire report e filtri direttamente dal foglio.

#### Acceptance Criteria

1. WHEN il `Classification_Result` è disponibile, THE Sheets_Writer SHALL aggiungere una nuova riga al tab `Classificazioni` del foglio Google Sheets configurato.
2. THE Sheets_Writer SHALL scrivere le seguenti colonne in ordine: `timestamp` (ISO 8601), `category`, `confidence`, `summary`, `payload_raw` (JSON serializzato del payload originale), `truncated` (boolean, `true` se il payload è stato troncato a 10.000 caratteri, `false` altrimenti).
3. THE Sheets_Writer SHALL usare la credenziale Google OAuth2 configurata in n8n per autenticarsi a Google Sheets.
4. IF la scrittura su Sheets fallisce per qualsiasi motivo (errore di rete, autenticazione, quota, o altro), THEN THE Error_Handler SHALL loggare l'errore nei log n8n e SHALL rispondere al webhook con HTTP 500 e body `{"error": "sheets_write_failed"}`.
5. WHEN la scrittura su Sheets ha successo, THE Workflow SHALL rispondere al webhook con HTTP 200 e body `{"status": "ok", "category": "<valore>", "confidence": <valore float 0.0–1.0>}`.

---

### Requirement 6: Gestione degli errori non recuperabili

**User Story:** Come operatore, voglio che qualsiasi errore non gestito dai branch specifici venga comunque tracciato su Sheets, così da avere visibilità completa sui fallimenti senza perdere eventi.

#### Acceptance Criteria

1. THE Workflow SHALL includere un branch di errore globale collegato tramite il connettore **Error** di n8n su ogni nodo critico (Webhook_Receiver, Classifier, Sheets_Writer, e qualsiasi nodo di chiamata a servizi esterni).
2. WHEN un errore non recuperabile si verifica, THE Error_Handler SHALL scrivere una riga nel tab `Errors` del foglio Google Sheets con le colonne: `timestamp` (ISO 8601), `error_type`, `error_message`, `payload_raw` (limitato a 5000 caratteri).
3. IF il tab `Errors` non è raggiungibile durante la gestione dell'errore, THEN THE Error_Handler SHALL loggare il fallimento nei log interni di n8n (inclusi 500 caratteri di `payload_raw`) e SHALL procedere comunque a restituire la risposta HTTP al client.
4. WHEN un errore non recuperabile si verifica, THE Workflow SHALL rispondere al webhook con il codice HTTP determinato dalla causa: 400 per errori di validazione del payload, 429 per rate limit esaurito, 500 per errori di sistema (fallimento Gemini, Sheets, o errori interni), e un body JSON strutturato con `error` e `detail`.
5. WHEN un errore non recuperabile si verifica, THE Workflow SHALL inviare la risposta HTTP al client entro 10 secondi dal momento in cui l'errore è stato rilevato, indipendentemente dal completamento del logging.
6. IF sia la scrittura su Sheets sia il fallback logging richiedono più di 8 secondi combinati, THEN THE Workflow SHALL interrompere le operazioni di logging e SHALL inviare immediatamente la risposta HTTP al client con il codice appropriato.
