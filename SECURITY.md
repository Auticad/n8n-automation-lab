# Security Policy

## Cosa non deve mai finire in questo repository

I workflow n8n contengono riferimenti a risorse esterne (fogli Google, cartelle Drive, endpoint API). Prima di fare commit, verifica che i file JSON non contengano:

| Tipo di dato | Dove compare | Come gestirlo |
|---|---|---|
| API key (es. Gemini) | Nodo HTTP Request, campo `auth` | Usa le **Credentials** di n8n, non hardcoding nel JSON |
| ID Google Sheets | Nodo Google Sheets, campo `documentId` | Sostituisci con `YOUR_SPREADSHEET_ID` |
| ID cartella Drive | Nodo Google Drive, campo `folderId` | Sostituisci con `YOUR_DRIVE_FOLDER_ID` |
| Webhook ID personali | Campo `webhookId` in ogni nodo trigger | Sostituisci con `YOUR_WEBHOOK_ID` |
| Token OAuth | Generati automaticamente da n8n | Non vengono esportati nei JSON — nessuna azione necessaria |

## Flusso di lavoro sicuro

1. Esporta il workflow da n8n (`Export → Download`)
2. Apri il JSON con un editor e cerca i valori sensibili con Ctrl+F (vedi tabella sopra)
3. Sostituisci i valori reali con i placeholder indicati
4. Solo allora fai commit

## Credenziali n8n

n8n gestisce le credenziali (Google OAuth, API key) nel proprio database locale e **non le include** nei file JSON esportati. Questo significa che i JSON dei workflow sono sicuri da condividere **a condizione** che tu abbia rimosso gli ID delle risorse (Sheets, Drive) come indicato sopra.

## Segnalare un problema di sicurezza

Se trovi credenziali esposte per errore in questo repository, apri una [GitHub Issue](../../issues) con tag `security` oppure contatta direttamente il maintainer.
