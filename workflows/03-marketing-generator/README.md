# Workflow: Marketing Generator

**Livello di complessità:** ⚡⚡⚡⚡ Esperto  
**Nodi:** 18 · **Trigger:** Manuale · **ID n8n:** `1hRhUQ8JI2zH6ZJN`

---

## Cosa fa

Legge da un Google Sheet i prodotti in promozione, seleziona quello con la maggiore quantità disponibile e genera — in parallelo su tre branch AI — un post social ottimizzato, un prompt immagine per generatori come Midjourney/FLUX, e un prompt video per Google Veo/Runway.

I tre output vengono ricombinati, salvati come Google Docs, convertiti in PDF con nome `Report_Strategico_YYYY-MM-DD.pdf` e inviati via email come allegato.

---

## Schema del flusso

```
Trigger (manuale)
      │
Get row(s) in sheet
(filtra Promozione = "si")
      │
    Sort
(↓ Quantità)
      │
    Limit
(top 1 prodotto)
      │
HTTP Request
(gpt-4o-search-preview — report di mercato)
      │
      ├────────────────────┬────────────────────┐
      │                    │                    │
 LLM Chain          LLM Chain1          LLM Chain2
 (post social)    (image prompt)      (video prompt)
 OpenAI gpt-4o    OpenAI gpt-4o       OpenAI gpt-4o
      │                    │                    │
 Edit Fields        Edit Fields1        Edit Fields2
 ("Social")         ("Image")           ("Video")
      │                    │                    │
      └────────────────────┴────────────────────┘
                           │
                         Merge
                  (combine by position)
                           │
                    Creo un DOCS
                  (Google Drive → Docs)
                           │
                   Coverto in PDF
                  (Google Drive → PDF)
                           │
                 Code in JavaScript
              (rinomina → Report_Strategico_DATA.pdf)
                           │
                   Send a message
                  (Gmail con allegato PDF)
```

---

## Nodi utilizzati

| Nodo | Tipo | Funzione |
|---|---|---|
| When clicking 'Execute workflow' | Manual Trigger | Avvio manuale |
| Get row(s) in sheet | Google Sheets | Legge prodotti con Promozione = "si" |
| Sort | Sort | Ordina per Quantità decrescente |
| Limit | Limit | Prende solo il top 1 |
| HTTP Request a OpenAI Search | HTTP Request | Chiama gpt-4o-search-preview per report mercato |
| Basic LLM Chain | LLM Chain | Genera post social Instagram/LinkedIn |
| Basic LLM Chain1 | LLM Chain | Genera prompt immagine (Midjourney/FLUX) |
| Basic LLM Chain2 | LLM Chain | Genera prompt video (Veo/Runway) |
| OpenAI Chat Model | OpenAI Chat Model | Sub-node gpt-4o per Branch A |
| OpenAI Chat Model1 | OpenAI Chat Model | Sub-node gpt-4o per Branch B |
| OpenAI Chat Model2 | OpenAI Chat Model | Sub-node gpt-4o per Branch C |
| Edit Fields | Set | Rinomina output Branch A → "Social" |
| Edit Fields1 | Set | Rinomina output Branch B → "Image" |
| Edit Fields2 | Set | Rinomina output Branch C → "Video" |
| Merge | Merge | Ricombina i 3 branch per posizione |
| Creo un DOCS | Google Drive | Crea Google Docs con il report completo |
| Coverto in PDF | Google Drive | Esporta Docs in PDF |
| Code in JavaScript | Code | Rinomina il PDF con data odierna |
| Send a message | Gmail | Invia il PDF come allegato email |

---

## Prerequisiti

- Istanza n8n funzionante (versione ≥ 1.x per i nodi LangChain)
- Credenziale **Google OAuth2** configurata (Sheets + Drive + Gmail usano la stessa)
- Credenziale **HTTP Header Auth** con la tua chiave OpenAI (per il nodo HTTP Request)
- Credenziale **OpenAI API** nativa (per i tre LLM Chain)
- Google Sheet con colonne `Nome`, `Quantità`, `Promozione` (valori "si"/"no")

---

## Configurazione prima dell'uso

1. Importa `marketing-generator.json` in n8n (`Workflow → Import from file`)
2. Crea una credenziale **HTTP Header Auth**:
   - Nome parametro: `Authorization`
   - Valore: `Bearer sk-...` (la tua chiave OpenAI)
   - Collega al nodo **HTTP Request a OpenAI Search**
3. Crea una credenziale **OpenAI API** e collegala ai tre nodi **OpenAI Chat Model**
4. Crea una credenziale **Google OAuth2** e collegala a **Google Sheets**, **Google Drive** (entrambi i nodi) e **Gmail**
5. Nel nodo **Get row(s) in sheet** → sostituisci `YOUR_SPREADSHEET_ID` con l'ID del tuo foglio
6. Nel nodo **Send a message** → imposta il tuo indirizzo email in `sendTo`
7. Esegui manualmente per il primo test

---

## Concetti chiave appresi

- **Fork e parallelismo**: un nodo con più connessioni in uscita lancia branch paralleli — n8n li esegue contemporaneamente, non in serie
- **gpt-4o-search-preview via HTTP**: questo modello (con web search) non è disponibile nel nodo OpenAI nativo di n8n — richiede una chiamata HTTP diretta con autenticazione header
- **Sub-node LLM in n8n**: i nodi `chainLlm` richiedono un language model provider collegato tramite connessione `ai_languageModel` (filo tratteggiato nell'editor), non una connessione main standard
- **Merge by position**: funziona correttamente solo se tutti i branch producono lo stesso numero di item — il nodo Limit garantisce 1 item per branch
- **Dati binari + rinomina**: Google Drive restituisce un binario; il nodo Code modifica `$input.item.binary.data.fileName` senza toccare il file

---

## Guida completa

[→ Apri la guida HTML dettagliata con schema a colori](../../docs/guida_workflow_marketing_generator.html)
