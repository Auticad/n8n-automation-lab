# Workflow: Consulenza

**Livello di complessità:** ⚡⚡ Intermedio  
**Nodi:** 7 · **Trigger:** Form pubblico · **ID n8n:** `MzzMB2UcQWTsW0ce`

---

## Cosa fa

Gestisce la prenotazione di consulenze tramite un form web. All'invio del form esegue **due azioni in parallelo**:

1. Registra la prenotazione su un foglio Google Sheets
2. Genera una email di conferma personalizzata tramite un AI Agent (Google Gemini) e la invia via Gmail all'indirizzo fornito

---

## Schema del flusso

```
On form submission
       │
  Edit Fields
       │
  ┌────┴────┐
  │         │
Append     AI Agent ← Google Gemini Chat Model
row in       │
sheet    Send a message (Gmail)
```

---

## Nodi utilizzati

| Nodo | Tipo | Funzione |
|---|---|---|
| On form submission | Trigger | Riceve i dati del form pubblico |
| Edit Fields | Set | Normalizza i campi e aggiunge timestamp |
| Append row in sheet | Google Sheets | Salva la prenotazione nel registro |
| AI Agent | LangChain Agent | Genera il testo dell'email di conferma |
| Google Gemini Chat Model | LLM | Modello linguistico collegato all'AI Agent |
| Send a message | Gmail | Invia l'email all'utente |

---

## Prerequisiti

- Istanza n8n funzionante
- Credenziale **Google OAuth** configurata in n8n (usata da Google Sheets e Gmail)
- Credenziale **Google Gemini** (PaLM API) configurata in n8n
- Un foglio Google Sheets con il tab `Prenotazioni` e colonne: `Data`, `Nome Cognome`, `Email`, `Telefono`, `Consulente`

---

## Configurazione prima dell'uso

1. Importa `consulenza.json` in n8n (`Workflow → Import from file`)
2. Apri il nodo **Append row in sheet** e sostituisci `YOUR_SPREADSHEET_ID` con l'ID del tuo foglio
3. Collega le credenziali Google OAuth ai nodi Sheets e Gmail
4. Collega la credenziale Gemini al nodo **Google Gemini Chat Model**
5. Nel nodo **AI Agent**, personalizza il testo del prompt con il nome della tua azienda
6. Attiva il workflow → n8n genera l'URL pubblico del form

---

## Concetti chiave appresi

- **Esecuzione parallela** di branch dallo stesso nodo
- **AI Agent con LLM esterno** (pattern sub-node in n8n)
- **Accesso ai dati del nodo trigger** da nodi a valle con `$('On form submission').item.json`

---

## Guida completa

[→ Apri la guida HTML dettagliata](../../docs/guida_workflow_consulenza.html)
