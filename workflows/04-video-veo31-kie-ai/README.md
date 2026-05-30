# Workflow: Video VEO3.1 KIE AI

**Livello di complessità:** ⚡⚡⚡⚡ Esperto  
**Nodi:** 13 · **Trigger:** Form pubblico (con upload file) · **ID n8n:** `ZIF33JHTseYS3iSg`

---

## Cosa fa

Riceve tramite form pubblico una descrizione del video, uno stile visivo e un'immagine del prodotto. Avvia due branch paralleli: uno genera il prompt video in inglese con gpt-4o, l'altro converte l'immagine in base64 e la carica su un server temporaneo KIE AI.

I due branch vengono ricombinati e il workflow chiama l'API **KIE AI Veo 3.1** in modalità `REFERENCE_2_VIDEO` per generare un video usando l'immagine come riferimento visivo. Un **polling loop** interroga l'API ogni 60 secondi fino al completamento. Quando il video è pronto, viene scaricato come file binario e inviato via email come allegato.

---

## Schema del flusso

```
On form submission (descrizione + stile + immagine)
              │
    ┌─────────┴──────────┐
    │                    │
Branch A              Branch B
    │                    │
Basic LLM Chain     Code in JavaScript
(gpt-4o → prompt)   (file → base64)
    │                    │
Edit Fields         HTTP Request
("prompt")          (upload → downloadUrl)
    │                    │
    └─────────┬──────────┘
              │
            Merge
(prompt + downloadUrl)
              │
       Submit_Veo_task
    (KIE AI Veo 3.1 API)
              │
        ┌─────┴──── polling loop ────────────────┐
        │                                         │
  HTTP Request1 → If (completeTime ≠ ∅?)         │
        │                │                        │
        │          True  │  False                 │
        │                │  Wait_60s ─────────────┘
        │
   Download Video
  (GET MP4 → binario)
        │
  Send a message
  (Gmail + allegato MP4)
```

---

## Nodi utilizzati

| Nodo | Tipo | Funzione |
|---|---|---|
| On form submission | Form Trigger | Raccoglie testo, stile e immagine prodotto |
| Code in JavaScript | Code | Estrae il file binario e lo converte in base64 |
| HTTP Request | HTTP Request | Carica l'immagine base64 su KIE AI, ottiene downloadUrl |
| Basic LLM Chain | LLM Chain | Genera il prompt video in inglese con gpt-4o |
| OpenAI Chat Model | OpenAI Chat Model | Sub-node gpt-4o per il LLM Chain |
| Edit Fields | Set | Rinomina output LLM → campo "prompt" |
| Merge | Merge | Combina prompt + downloadUrl in un unico item |
| Submit_Veo_task | HTTP Request | Avvia generazione video su KIE AI Veo 3.1 |
| HTTP Request1 | HTTP Request | Controlla lo status del task (polling) |
| If | If | Verifica se completeTime è valorizzato (video pronto) |
| Wait_60s | Wait | Aspetta 60 secondi prima del prossimo controllo |
| Download Video | HTTP Request | Scarica il video MP4 come file binario (Response Format: File) |
| Send a message | Gmail | Invia email con il video MP4 allegato (campo binario `data`) |

---

## Prerequisiti

- Istanza n8n funzionante (versione ≥ 1.x per i nodi LangChain)
- n8n accessibile pubblicamente o via tunnel (necessario per il Form Trigger)
- Credenziale **OpenAI API** configurata in n8n
- Credenziale **Google OAuth2** configurata in n8n (per Gmail)
- **KIE AI API Key** con crediti disponibili (per upload immagine + generazione video Veo 3.1)

---

## Configurazione prima dell'uso

1. Importa `video-veo31-kie-ai.json` in n8n
2. Crea una credenziale **OpenAI API** e collegala al nodo **OpenAI Chat Model**
3. Crea una credenziale **Google OAuth2** e collegala al nodo **Send a message**
4. Nei nodi **HTTP Request** (upload), **Submit_Veo_task** e **HTTP Request1** → imposta l'header `Authorization: Bearer YOUR_KIE_AI_API_KEY`
5. Nel nodo **Send a message** → imposta l'indirizzo email destinatario
6. Rimuovi il **pin data** dai nodi **Basic LLM Chain** e **Merge** (click destro → Unpin)
7. Attiva il workflow → usa l'URL del form generato da n8n

---

## Errore comune: allegato Gmail

Il nodo Gmail richiede un **campo binario** nell'item, non un URL stringa. Il campo "Attachment Field Name" deve contenere il nome del campo binario (es. `data`), non `{{ $json.data.response.resultUrls[0] }}`.

Per questo motivo è necessario il nodo **Download Video** prima di Gmail: scarica il file MP4 dall'URL e lo rende disponibile come campo binario `data` nell'item.

---

## Concetti chiave appresi

- **Polling loop**: pattern per API asincrone — submit task → check status → if not done: wait → check again. In n8n: HTTP + If + Wait con loop sul ramo False
- **Binary data da form**: il file caricato nel Form Trigger è nel campo `binary`, non nel `json`. Serve un nodo Code per estrarlo e convertirlo in base64
- **Response Format: File**: per scaricare un file binario con HTTP Request, impostare Response Format = File. Il contenuto viene messo nel campo `data` del binario
- **Allegati Gmail**: il parametro "Attachment Field Name" vuole il **nome** del campo binario nell'item (es. `data`), non l'URL del file — confondere i due genera l'errore "binary file not found"
- **REFERENCE_2_VIDEO**: modalità KIE AI che usa un'immagine di riferimento per guidare la generazione video

---

## Guida completa

[→ Apri la guida HTML dettagliata con schema a colori](../../docs/guida_workflow_video_veo31.html)
