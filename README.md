# RAG Document Intelligence Chatbot

> Upload private documents · Ask questions with semantic search · Powered by Poolside Laguna XS.2 (via OpenRouter)

A production-ready **Retrieval-Augmented Generation (RAG)** chatbot built as a university semester project.  
All document processing (chunking, TF-IDF embedding, cosine similarity search) happens **client-side in the browser** — your files never leave your device. Only the final LLM call is proxied through a lightweight backend.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  CLIENT (React + Vite)   ←→   SERVER (Express proxy)   │
│                                                         │
│  File Upload                    /api/chat               │
│  → Text Extraction              → Injects API key       │
│  → Sliding-window Chunking      → Forwards to OpenRouter│
│  → TF-IDF Embeddings            → Returns response      │
│  → Cosine Similarity Search                             │
│  → API call via proxy                                   │
└─────────────────────────────────────────────────────────┘
```

| Layer    | Technology          | Host   |
|----------|---------------------|--------|
| Frontend | React 19 + Vite 6   | Vercel |
| Backend  | Node.js + Express   | Render |
| LLM      | Laguna XS.2 (OpenRouter)| Cloud |

---

## Features

- **Drag-and-drop upload** — `.txt`, `.md`, `.csv`, `.json`, `.html`, `.pdf`, `.rst`, `.log`
- **Sliding-window chunking** — 400-word chunks, 80-word overlap
- **TF-IDF vector search** — built from scratch, no external vector library
- **Cosine similarity retrieval** — top-5 chunks per query
- **Laguna XS.2 integration** — cited answers with `[Source N]` inline
- **Conversation history** — last 6 messages included in every API call
- **Source attribution pills** + collapsible context panel
- **Dark theme** — IBM Plex Mono + Space Grotesk, animated micro-interactions
- **Privacy-first** — documents never leave the browser

---

## Project Structure

```
RAGProject/
├── client/                 ← React + Vite frontend
│   ├── src/
│   │   ├── App.jsx         ← Full RAG component (all logic inline)
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js      ← Dev proxy → localhost:3001
│   ├── .env.example
│   └── package.json
├── server/                 ← Express proxy
│   ├── index.js            ← Single /api/chat endpoint
│   ├── .env.example
│   └── package.json
└── README.md
```

---

## Local Development

### Prerequisites

- **Node.js 18+** — [nodejs.org](https://nodejs.org)
- An **OpenRouter API key** — [openrouter.ai](https://openrouter.ai)

### 1 — Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/RAGProject.git
cd RAGProject
```

### 2 — Set up the backend

```bash
cd server
cp .env.example .env
# Edit .env and paste your OpenRouter API key
npm install
npm run dev        # starts on http://localhost:3001
```

`server/.env`:
```env
# Supports either key format:
OPENROUTER_API_KEY=sk-or-v1-...your-key-here...
# Or:
OperRouterAPI_KEY=sk-or-v1-...your-key-here...
ALLOWED_ORIGIN=http://localhost:5173
```

### 3 — Set up the frontend

Open a **second terminal**:

```bash
cd client
cp .env.example .env
# No changes needed for local dev — the Vite proxy handles /api
npm install
npm run dev        # starts on http://localhost:5173
```

> **Tip**: The Vite dev proxy (`vite.config.js`) automatically forwards `/api/*` requests to  
> `http://localhost:3001`, so you don't need to set `VITE_API_URL` during local development.

### 4 — Open the app

Visit **http://localhost:5173** in your browser.

---

## Environment Variables

### `server/.env`

| Variable          | Required | Description                                         |
|-------------------|----------|-----------------------------------------------------|
| `OPENROUTER_API_KEY` or `OperRouterAPI_KEY` | ✅ Yes  | Your OpenRouter API key from openrouter.ai   |
| `ALLOWED_ORIGIN`  | Recommended | Comma-separated list of allowed frontend origins (e.g. `https://rag.vercel.app`) |
| `PORT`            | No       | Port the server listens on (default: `3001`)        |

### `client/.env`

| Variable       | Required  | Description                                              |
|----------------|-----------|----------------------------------------------------------|
| `VITE_API_URL` | Production | Full URL of the deployed backend, e.g. `https://rag-proxy.onrender.com` |

---

## Deployment

### Step 1 — Push to GitHub

```bash
cd RAGProject
git init
git add .
git commit -m "Initial commit — RAG Document Intelligence"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/RAGProject.git
git push -u origin main
```

---

### Step 2 — Deploy Backend on Render

1. Go to [render.com](https://render.com) and sign in (free account).
2. Click **New → Web Service**.
3. Connect your GitHub repo.
4. Configure the service:

   | Setting          | Value                        |
   |------------------|------------------------------|
   | **Name**         | `rag-proxy` (or any name)    |
   | **Root Dir**     | `server`                     |
   | **Environment**  | `Node`                       |
   | **Build Command**| `npm install`                |
   | **Start Command**| `npm start`                  |
   | **Plan**         | Free                         |

5. Under **Environment Variables**, add:

   | Key                 | Value                          |
   |---------------------|--------------------------------|
   | `OPENROUTER_API_KEY`| `sk-or-v1-...your-key...`      |
   | `ALLOWED_ORIGIN`    | `https://your-app.vercel.app`  |

6. Click **Create Web Service**. Wait ~2 minutes for deployment.
7. Copy the **service URL** (e.g., `https://rag-proxy.onrender.com`).

> ⚠️ **Free tier note**: Render free services spin down after 15 minutes of inactivity.  
> The first request after idle takes ~30 seconds (cold start). This is normal.

---

### Step 3 — Deploy Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in (free account).
2. Click **Add New → Project**.
3. Import your GitHub repo.
4. Configure the project:

   | Setting             | Value      |
   |---------------------|------------|
   | **Framework Preset**| Vite       |
   | **Root Directory**  | `client`   |
   | **Build Command**   | `npm run build` |
   | **Output Dir**      | `dist`     |

5. Under **Environment Variables**, add:

   | Key            | Value                                    |
   |----------------|------------------------------------------|
   | `VITE_API_URL` | `https://rag-proxy.onrender.com`         |

   *(Use the Render URL from Step 2)*

6. Click **Deploy**. Vercel builds and deploys in ~1 minute.
7. Your app is live at `https://your-app-name.vercel.app` 🎉

---

### Step 4 — Update CORS (Important!)

Once you have the Vercel URL, go back to **Render → your service → Environment**:

- Update `ALLOWED_ORIGIN` to your actual Vercel URL:
  ```
  https://your-app-name.vercel.app
  ```
- Render will auto-redeploy.

---

## Usage Guide

1. **Open the app** → you'll see a central Drag & Drop zone prompting you to load documents (with the chat box disabled).
2. **Upload files** → Drag and drop your text/PDF documents or click "Choose Files" to select them.
3. **Wait for indexing** → the system extracts text and builds the semantic search index.
4. **Chat unlocked** → once indexed, the files appear in the top document shelf, and the chat box unlocks.
5. **Ask questions** → type your query or click a suggested chip.
6. **See answers & context** → click "▸ Retrieved context" to inspect raw chunks, or toggle "Thought Process" to see the model's step-by-step thinking.

---

## How It Works (Technical)

### Ingestion Pipeline

```
File → readAsText() → normalize whitespace → sliding-window chunker
  → buildVocab() over all chunks → buildIdf() → tfidfEmbed() per chunk
  → Float32Array stored in React state
```

### Retrieval Pipeline

```
User query → tfidfEmbed(query, vocab, idf)
  → cosineSim(queryVec, chunkVec) for every chunk
  → sort descending → top 5 where score > 0.01
```

### Generation Pipeline

```
top-K chunks → build prompt with [Source N] labels
  → POST /api/chat → Express injects API key → OpenRouter (Laguna XS.2)
  → stream response back → display in UI with source pills
```

---

## Tech Stack

| Component    | Library/Tool         |
|--------------|----------------------|
| Frontend     | React 19, Vite 6     |
| Styling      | Vanilla CSS (inline) |
| Fonts        | IBM Plex Mono, Space Grotesk (Google Fonts) |
| Embeddings   | Custom TF-IDF (Float32Array) |
| Vector Search| Cosine similarity (hand-coded) |
| LLM          | Poolside: Laguna XS.2 via OpenRouter (poolside/laguna-xs.2:free) |
| Backend      | Node.js 18+, Express 4, CORS |
| Frontend Host| Vercel (free) |
| Backend Host | Render (free) |

---

## License

MIT — free to use, modify, and share.
# StudyRAG
