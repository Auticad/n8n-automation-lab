# n8n-automation-lab

Una collezione di workflow n8n organizzati per **livello di complessità crescente** — da automazioni semplici a integrazioni con API esterne, gestione di dati binari e logica condizionale.

> Ogni workflow include il file JSON importabile, un README con schema e istruzioni, e una guida HTML dettagliata.

---

## Mappa dei workflow

| # | Nome | Complessità | Trigger | Tecnologie | Guida |
|---|---|---|---|---|---|
| 01 | [Consulenza](workflows/01-consulenza/) | ⚡⚡ Intermedio | Form pubblico | Google Sheets, Gemini, Gmail, AI Agent | [HTML](docs/guida_workflow_consulenza.html) |
| 02 | [Progetto1](workflows/02-progetto1/) | ⚡⚡⚡ Avanzato | Form con upload | Gemini API (HTTP), Google Drive, dati binari, If | [HTML](docs/guida_workflow_progetto1.html) |

> Il workflow **GMAIL** (base) non è incluso perché considerato troppo semplice per documentazione dedicata.

---

## Prerequisiti generali

Per usare questi workflow hai bisogno di:

- **n8n** installato in locale (`npx n8n`) o su cloud ([n8n Cloud](https://n8n.io/cloud/))
- Un account **Google** per le integrazioni con Sheets, Drive e Gmail
- Una chiave **API Google Gemini** (gratuita fino a soglia): [aistudio.google.com](https://aistudio.google.com/app/apikey)

---

## Come importare un workflow

1. Apri la tua istanza n8n nel browser
2. Clicca su **+ New Workflow** (in alto a destra)
3. Nel menu del workflow, seleziona **Import from file**
4. Carica il file `.json` dalla cartella del workflow scelto
5. Segui le istruzioni di configurazione nel README del workflow (credenziali, ID risorse)
6. Clicca **Activate** (toggle in alto a destra) per attivarlo

---

## Configurazione credenziali in n8n

Le credenziali non sono incluse nei file JSON — vengono gestite da n8n nel suo database locale e non viaggiano mai fuori dall'istanza. Devi configurarle una volta sola:

**Google OAuth (Sheets, Drive, Gmail)**  
`Settings → Credentials → Add Credential → Google OAuth2 API`  
Segui la procedura guidata di autorizzazione Google.

**Google Gemini (per AI Agent)**  
`Settings → Credentials → Add Credential → Google Gemini(PaLM) Api`  
Incolla la tua API key.

**HTTP Query Auth (per chiamate dirette API Gemini nel workflow Progetto1)**  
`Settings → Credentials → Add Credential → HTTP Query Auth`  
- Name: `key`  
- Value: la tua chiave API Gemini

---

## Valori da sostituire nei JSON

Alcuni ID di risorse sono stati anonimizzati per sicurezza. Prima di attivare un workflow, verifica e sostituisci i seguenti placeholder:

| Placeholder | Dove si trova | Come trovare il valore reale |
|---|---|---|
| `YOUR_SPREADSHEET_ID` | Nodo Google Sheets | URL del foglio: `docs.google.com/spreadsheets/d/[ID]/edit` |
| `YOUR_DRIVE_FOLDER_ID` | Nodo Google Drive | URL della cartella: `drive.google.com/drive/folders/[ID]` |
| `YOUR_WEBHOOK_ID` | Nodi trigger | Generato automaticamente da n8n all'importazione |

---

## Struttura del repository

```
n8n-automation-lab/
├── README.md                         ← questo file
├── SECURITY.md                       ← linee guida per non esporre credenziali
├── .gitignore                        ← esclude .env e file sensibili
├── .env.example                      ← template variabili d'ambiente
├── workflows/
│   ├── 01-consulenza/
│   │   ├── consulenza.json           ← workflow importabile (sanitizzato)
│   │   └── README.md                 ← schema, nodi, istruzioni
│   └── 02-progetto1/
│       ├── progetto1.json            ← workflow importabile (sanitizzato)
│       └── README.md                 ← schema, nodi, istruzioni
└── docs/
    ├── guida_workflow_consulenza.html ← guida dettagliata passo-passo
    └── guida_workflow_progetto1.html  ← guida dettagliata passo-passo
```

---

## Progressione di complessità

I workflow sono numerati in ordine di difficoltà per facilitare l'apprendimento progressivo.

**01 — Consulenza (Intermedio)**  
Introduce l'esecuzione parallela, l'integrazione con un LLM tramite AI Agent sub-node e la scrittura su Google Sheets.

**02 — Progetto1 (Avanzato)**  
Introduce la gestione di dati binari (file upload → base64 → binary), la chiamata diretta a un'API REST con payload JSON dinamico composto da nodi non contigui, e il branching condizionale con gestione esplicita degli errori.

---

## Autore

**Pietro Cammise** — AI/ML Engineer  
GitHub: [Auticad](https://github.com/Auticad) · Portfolio: [auticad.github.io/cv_cammise](https://auticad.github.io/cv_cammise/)

---

This project is licensed under the [MIT License](LICENSE).
