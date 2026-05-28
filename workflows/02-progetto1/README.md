# Workflow: Progetto1

**Livello di complessità:** ⚡⚡⚡ Avanzato  
**Nodi:** 7 · **Trigger:** Form con upload file · **ID n8n:** `lGuapSUkNEGhbx1B`

---

## Cosa fa

Riceve un'immagine e un prompt testuale tramite form, chiama direttamente l'API **Gemini 2.5 Flash Image** per generare una nuova immagine, verifica che la risposta contenga effettivamente un'immagine e la salva su Google Drive con nome timestamp.

---

## Schema del flusso

```
On form submission (immagine + prompt)
        │
  Extract from File
  (binario → base64)
        │
   HTTP Request
  (API Gemini 2.5 Flash Image)
        │
       If
  (risposta contiene immagine?)
   ┌────┴────┐
  Sì        No
   │         │
Convert    Stop and Error
to File    (messaggio di errore)
   │
Upload file (Google Drive)
```

---

## Nodi utilizzati

| Nodo | Tipo | Funzione |
|---|---|---|
| On form submission | Trigger | Riceve file binario e prompt testuale |
| Extract from File | Utility | Converte il file caricato in base64 |
| HTTP Request | HTTP | Chiama l'API Gemini con autenticazione per query string |
| If | Logic | Verifica che la risposta contenga un'immagine |
| Convert to File | Utility | Riconverte il base64 di risposta in file binario |
| Upload file | Google Drive | Salva il file con nome `Immagine_DDMMYYYY_HHmm.png` |
| Stop and Error | Error handling | Blocca l'esecuzione e mostra il messaggio testuale di Gemini |

---

## Prerequisiti

- Istanza n8n funzionante
- Credenziale **Google OAuth** configurata in n8n (usata da Google Drive)
- Credenziale **HTTP Query Auth** configurata in n8n con la tua `GEMINI_API_KEY`
- Una cartella Google Drive dedicata per le immagini generate

---

## Configurazione prima dell'uso

1. Importa `progetto1.json` in n8n (`Workflow → Import from file`)
2. In n8n, crea una credenziale di tipo **HTTP Query Auth**:
   - Nome parametro: `key`
   - Valore: la tua chiave API Gemini (ottenibile su [aistudio.google.com](https://aistudio.google.com/app/apikey))
3. Collega questa credenziale al nodo **HTTP Request**
4. Apri il nodo **Upload file** e sostituisci `YOUR_DRIVE_FOLDER_ID` con l'ID della tua cartella Drive
5. Collega la credenziale Google OAuth al nodo **Upload file**
6. Attiva il workflow → n8n genera l'URL del form

---

## Concetti chiave appresi

- **Gestione dati binari** in n8n: upload → base64 → binary
- **Chiamata diretta a un'API REST** con corpo JSON dinamico composto da dati di nodi precedenti non contigui (sintassi `$('nodo').item.json`)
- **Branching condizionale** (nodo If) per gestire risposte API parziali o assenti
- **Error handling esplicito** con nodo Stop and Error

---

## Guida completa

[→ Apri la guida HTML dettagliata](../../docs/guida_workflow_progetto1.html)
