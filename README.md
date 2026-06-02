# n8n-automation-lab

Una collezione di workflow n8n organizzati per **livello di complessità crescente** — da automazioni semplici a integrazioni con API esterne, gestione di dati binari e logica condizionale.

> Ogni workflow include il file JSON importabile, un README con schema e istruzioni, e una guida HTML dettagliata.

---

## Mappa dei workflow

| # | Nome | Complessità | Trigger | Tecnologie | Guida |
|---|---|---|---|---|---|
| 01 | [Consulenza](workflows/01-consulenza/) | ⚡⚡ Intermedio | Form pubblico | Google Sheets, Gemini, Gmail, AI Agent | [HTML](docs/guida_workflow_consulenza.html) |
| 02 | [Progetto1](workflows/02-progetto1/) | ⚡⚡⚡ Avanzato | Form con upload | Gemini API (HTTP), Google Drive, dati binari, If | [HTML](docs/guida_workflow_progetto1.html) |
| 03 | [Marketing Generator](workflows/03-marketing-generator/) | ⚡⚡⚡⚡ Esperto | Manuale | OpenAI Search, gpt-4o (×3), Google Sheets, Drive, Gmail, fork parallelo | [HTML](docs/guida_workflow_marketing_generator.html) |
| 04 | [Video VEO3.1 KIE AI](workflows/04-video-veo31-kie-ai/) | ⚡⚡⚡⚡ Esperto | Form con upload | gpt-4o, KIE AI Veo 3.1, binary upload, polling loop, Gmail | [HTML](docs/guida_workflow_video_veo31.html) |
| 05 | [Webhook Gemini Classifier](workflows/05-webhook-gemini-classifier/) | ⚡⚡⚡⚡ Esperto | HTTP Webhook | Gemini 2.5 Flash, Google Sheets, retry loop, dead-letter | [HTML](docs/guida_workflow_webhook_gemini_classifier.html) |

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

**Google Gemini API key (per Webhook Gemini Classifier — workflow 05)**  
Non usa credenziali n8n. La chiave va inserita direttamente nell'URL del nodo HTTP Request:  
`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=YOUR_KEY`  
Ottienila gratuitamente su [aistudio.google.com](https://aistudio.google.com).

**OpenAI API (per Marketing Generator — LLM Chain)**  
`Settings → Credentials → Add Credential → OpenAI API`  
Incolla la tua chiave `sk-...`

**HTTP Header Auth (per Marketing Generator — gpt-4o-search-preview)**  
`Settings → Credentials → Add Credential → HTTP Header Auth`  
- Name: `Authorization`  
- Value: `Bearer sk-...` (la stessa chiave OpenAI)

**KIE AI API Key (per Video VEO3.1)**  
Non usa credenziali n8n native — il Bearer token va inserito direttamente nel campo `value` dell'header nei nodi HTTP Request (upload, submit, status). Formato: `Bearer KIE_YOUR_API_KEY`

---

## Valori da sostituire nei JSON

Alcuni ID di risorse sono stati anonimizzati per sicurezza. Prima di attivare un workflow, verifica e sostituisci i seguenti placeholder:

| Placeholder | Dove si trova | Come trovare il valore reale |
|---|---|---|
| `YOUR_SPREADSHEET_ID` | Nodo Google Sheets | URL del foglio: `docs.google.com/spreadsheets/d/[ID]/edit` |
| `YOUR_DRIVE_FOLDER_ID` | Nodo Google Drive | URL della cartella: `drive.google.com/drive/folders/[ID]` |
| `YOUR_WEBHOOK_ID` | Nodi trigger | Generato automaticamente da n8n all'importazione |
| `YOUR_GEMINI_API_KEY` | URL nodo HTTP_Classifier_Gemini (workflow 05) | [aistudio.google.com](https://aistudio.google.com) → Get API key |

---

## Struttura del repository

```
n8n-automation-lab/
├── README.md                                    ← questo file
├── SECURITY.md                                  ← linee guida per non esporre credenziali
├── .gitignore                                   ← esclude .env e file sensibili
├── .env.example                                 ← template variabili d'ambiente
├── .kiro/
│   └── specs/
│       └── webhook-gemini-classifier/           ← artefatti Spec-Driven Development (Kiro)
│           ├── requirements.md                  ← user stories + acceptance criteria (EARS)
│           ├── design.md                        ← architettura, data model, diagrammi Mermaid
│           └── tasks.md                         ← piano di implementazione con dipendenze
├── workflows/
│   ├── 01-consulenza/
│   │   ├── consulenza.json                      ← workflow importabile (sanitizzato)
│   │   └── README.md                            ← schema, nodi, istruzioni
│   ├── 02-progetto1/
│   │   ├── progetto1.json                       ← workflow importabile (sanitizzato)
│   │   └── README.md                            ← schema, nodi, istruzioni
│   ├── 03-marketing-generator/
│   │   ├── marketing-generator.json             ← workflow importabile (sanitizzato)
│   │   └── README.md                            ← schema, nodi, istruzioni
│   ├── 04-video-veo31-kie-ai/
│   │   ├── video-veo31-kie-ai.json              ← workflow importabile (sanitizzato)
│   │   └── README.md                            ← schema, nodi, istruzioni
│   └── 05-webhook-gemini-classifier/
│       ├── webhook-gemini-classifier.json       ← workflow importabile (sanitizzato)
│       ├── README.md                            ← schema, nodi, istruzioni, troubleshooting
│       ├── test.md                              ← 7 curl di test con risultati attesi
│       └── tests/                              ← unit test Jest (fast-check)
└── docs/
    ├── guida_workflow_consulenza.html            ← guida dettagliata passo-passo
    ├── guida_workflow_progetto1.html             ← guida dettagliata passo-passo
    ├── guida_workflow_marketing_generator.html   ← guida dettagliata con schema a colori
    ├── guida_workflow_video_veo31.html           ← guida dettagliata con schema a colori
    └── guida_workflow_webhook_gemini_classifier.html ← guida con architettura e troubleshooting
```

---

## Progressione di complessità

I workflow sono numerati in ordine di difficoltà per facilitare l'apprendimento progressivo.

**01 — Consulenza (Intermedio)**  
Introduce l'esecuzione parallela, l'integrazione con un LLM tramite AI Agent sub-node e la scrittura su Google Sheets.

**02 — Progetto1 (Avanzato)**  
Introduce la gestione di dati binari (file upload → base64 → binary), la chiamata diretta a un'API REST con payload JSON dinamico composto da nodi non contigui, e il branching condizionale con gestione esplicita degli errori.

**03 — Marketing Generator (Esperto)**  
Introduce il fork parallelo su tre branch AI simultanei, l'uso di `gpt-4o-search-preview` (web search) via chiamata HTTP diretta, i sub-node LLM con connessione `ai_languageModel`, il Merge by position, e la pipeline completa Docs → PDF → email con rinomina binaria via Code node.

**04 — Video VEO3.1 KIE AI (Esperto)**  
Introduce il Form Trigger con upload file binario, l'estrazione manuale del binario via Code (base64), il pattern polling loop (HTTP + If + Wait) per API asincrone, e l'integrazione con KIE AI Veo 3.1 in modalità REFERENCE_2_VIDEO. Aggiunge il download del video come file binario (Response Format: File) e l'invio via Gmail come allegato — con la distinzione critica tra URL stringa e campo binario nell'Attachment Field Name.

**05 — Webhook Gemini Classifier (Esperto)**  
Introduce il response mode sincrono del webhook (il client aspetta la risposta), la gestione esplicita del rate limiting con retry loop (If + Wait + contatore), il pattern dead-letter su Google Sheets per errori non recuperabili, e il multi-branch error handling con un nodo Respond dedicato per ogni codice HTTP. È il primo workflow della collection costruito con **Spec-Driven Development** tramite Kiro IDE (vedi sezione metodologia).

---

## Metodologia — Spec-Driven Development con Kiro

Il workflow 05 è stato costruito usando [Kiro IDE](https://kiro.dev), un ambiente di sviluppo che inverte il flusso tradizionale: la specifica è la sorgente di verità, il codice è un artefatto derivato.

Il processo ha prodotto tre artefatti, conservati in `.kiro/specs/webhook-gemini-classifier/`:

| Artefatto | Contenuto | Notazione |
|---|---|---|
| `requirements.md` | 6 requisiti con user stories e acceptance criteria | EARS (Easy Approach to Requirements Syntax) |
| `design.md` | Architettura a nodi, data model, diagrammi Mermaid, testing strategy | Markdown + Mermaid |
| `tasks.md` | 12 task con dipendenze esplicite e dependency graph a wave | Checklist con `depends_on` |

Questi file non sono documentazione secondaria aggiunta a posteriori: sono stati prodotti **prima** del codice e hanno guidato ogni decisione implementativa. Rappresentano la tracciabilità completa dal requisito alla riga di codice.

> La scelta di includere `.kiro/specs/` nel repository (e non il `.kiro/steering/` che è configurazione IDE) segue il principio che gli artefatti di progettazione appartengono al progetto, la configurazione dell'ambiente appartiene allo sviluppatore.

---

## Autore

**Pietro Cammise** — AI/ML Engineer  
GitHub: [Auticad](https://github.com/Auticad) · Portfolio: [auticad.github.io/cv_cammise](https://auticad.github.io/cv_cammise/)

---

This project is licensed under the [MIT License](LICENSE).
