# RAG-Powered Document Intelligence Chatbot
## Master Build Prompt — Production-Ready System

---

## ROLE & CONTEXT

You are an expert full-stack engineer specializing in AI/ML systems, vector search, and production React applications. Your task is to build a complete, production-ready Retrieval-Augmented Generation (RAG) chatbot that allows users to upload private documents and ask questions over them using semantic search and an LLM.

The system must work end-to-end with zero placeholder code, zero TODOs, and zero "coming soon" sections. Every feature described below must be fully implemented and functional.

---

## SYSTEM ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────┐
│                    INGESTION PIPELINE                   │
│  File Upload → Text Extraction → Chunking → Embedding  │
│                  → Vector Store Index                   │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                    RETRIEVAL PIPELINE                   │
│  User Query → Query Embedding → Cosine Similarity      │
│              → Top-K Chunks Retrieved                  │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                   GENERATION PIPELINE                   │
│  Retrieved Chunks + Query → LLM Prompt → Answer        │
│                   with Source Citations                 │
└─────────────────────────────────────────────────────────┘
```

Build this as a **single-file React component** (`.jsx`) that runs entirely in the browser using the Anthropic API for LLM inference. All document processing, chunking, embedding, and vector search must happen client-side with no backend server required.

---

## SECTION 1 — DOCUMENT INGESTION PIPELINE

### 1.1 File Upload Interface
- Implement a **drag-and-drop zone** that accepts files by dragging onto it OR clicking to open a file picker
- Support these file types: `.txt`, `.md`, `.csv`, `.json`, `.html`, `.pdf`, `.rst`, `.log`
- Allow **multiple files** to be uploaded simultaneously and across multiple upload sessions (additive, not replacing)
- Show real-time feedback during file reading with a loading/indexing indicator
- Display file metadata after upload: filename, file size in KB, number of chunks generated

### 1.2 Text Extraction
- For all text-based files (`.txt`, `.md`, `.csv`, `.json`, `.html`, `.rst`, `.log`): use `FileReader.readAsText()`
- For `.pdf` files: use `FileReader.readAsText()` (works for text-layer PDFs)
- Strip excessive whitespace and normalize newlines before chunking
- Handle file read errors gracefully with a user-visible error message

### 1.3 Text Chunking Algorithm
Implement a **sliding window chunker** with the following exact parameters:
- `chunkSize = 400` words per chunk
- `overlap = 80` words between consecutive chunks (so adjacent chunks share context)
- Split on whitespace (`/\s+/`)
- Discard any chunk shorter than 20 words (noise filtering)
- Track metadata per chunk: `{ text, chunkIndex, docName, docSize, addedAt }`

### 1.4 Embedding Strategy
Implement **TF-IDF vector embeddings** built entirely from the uploaded corpus:

**Step 1 — Build Vocabulary:**
```
vocab = Map<word, index>
Iterate all chunk texts, tokenize with /\b\w+\b/g (lowercase), assign sequential indices
```

**Step 2 — Compute IDF (Inverse Document Frequency):**
```
For each word in vocab:
  df[word] = count of chunks containing that word
  idf[word] = log((totalChunks + 1) / (df[word] + 1)) + 1
```

**Step 3 — Embed a text:**
```
words = tokenize(text)
tf[word] = count(word in words) / len(words)
vec[i] = tf[vocab[i]] * idf[i]
Return Float32Array of length vocab.size
```

**Step 4 — Rebuild index** every time a document is added or removed:
- Recompute vocab + IDF over all current chunks
- Re-embed every chunk with the new vocabulary
- This ensures vocabulary stays consistent across all documents

### 1.5 Document Management
- Show a **document list panel** (in a dedicated "Docs" tab) with each uploaded file
- Each document entry shows: file icon, filename, chunk count, file size
- Provide a **remove button** (✕) per document that deletes it and rebuilds the index
- Show total stats: "N docs · M chunks indexed"
- Show an animated "indexing…" indicator while the index is being rebuilt

---

## SECTION 2 — RETRIEVAL PIPELINE

### 2.1 Query Embedding
When a user submits a question:
1. Tokenize and embed the query text using the same TF-IDF + IDF weights as the corpus
2. This produces a query vector in the same vector space as the chunk embeddings

### 2.2 Cosine Similarity Search
```
similarity(a, b) = dot(a,b) / (|a| * |b| + ε)
where ε = 1e-10 (avoid division by zero)
```

- Compute similarity between query vector and every chunk embedding
- Sort results descending by score
- Return **top 5 chunks** with score > 0.01 (filter near-zero matches)

### 2.3 Retrieved Context Format
Each retrieved chunk object must carry:
```javascript
{
  text: string,        // The chunk text
  docName: string,     // Source filename
  chunkIndex: number,  // Position in document
  score: number        // Cosine similarity score 0-1
}
```

---

## SECTION 3 — GENERATION PIPELINE (Claude API)

### 3.1 API Integration
Call the Anthropic API at `https://api.anthropic.com/v1/messages` with:
- Model: `claude-sonnet-4-20250514`
- `max_tokens: 1000`
- No hardcoded API key — the environment handles auth (do not add any Authorization header)
- Method: POST with `Content-Type: application/json`

### 3.2 Prompt Construction
Build the API request with this exact structure:

**System prompt:**
```
You are a precise document assistant. Answer questions using ONLY the provided document excerpts.
Rules:
- Always cite sources as [Source N] inline within your answer
- If the answer isn't in the context, say "I couldn't find that in the uploaded documents"
- Be concise but thorough
- Quote key phrases directly when helpful
```

**User message:**
```
Document context:

[Source 1 | {docName} | chunk {chunkIndex + 1}]
{chunk1.text}

---

[Source 2 | {docName} | chunk {chunkIndex + 1}]
{chunk2.text}

---
(repeat for all top-K chunks)

---

Question: {userQuery}
```

### 3.3 Conversation History
- Maintain a `messages` array in React state
- Include the last **6 messages** from history in every API call (sliding window)
- This gives Claude context of recent exchanges without exceeding token limits
- History format: `[{ role: "user"|"assistant", content: string }, ...]`

### 3.4 Error Handling
- Wrap the API call in try/catch
- If `data.error` exists in the response, throw it with the message
- Display errors inline in the chat as an assistant message prefixed with ❌
- The UI must remain functional after an error (do not crash or freeze)

---

## SECTION 4 — USER INTERFACE

### 4.1 Overall Layout
Two-tab interface:
- **Chat tab** (💬 Chat): The main conversation view
- **Docs tab** (📁 Docs): Document upload and management

The layout is a single column, max-width 900px, centered, full-height, dark theme.

### 4.2 Header
Fixed at the top:
- Logo mark (geometric icon) + app title "RAG Document Intelligence"
- Subtitle showing live stats: "{N} docs · {M} chunks indexed"
- Animated "● indexing…" text (pulsing opacity) shown while rebuilding the index
- Tab switcher buttons (Chat | Docs) aligned to the right

### 4.3 Chat Interface

**Empty state** (no messages yet):
- Centered placeholder with icon, headline, and subtext
- If no docs: direct user to the Docs tab
- If docs exist: show 3 **suggested question chips** ("Summarize the main topics", "What are the key findings?", "List important terms") — clicking one pre-fills the input

**Message bubbles:**
- User messages: left avatar "U", dark blue background, right-aligned feel
- Assistant messages: left avatar "⬡", deep navy background with indigo border
- All text: monospace font, font-size 13px, line-height 1.7, pre-wrap for newlines
- New messages animate in with a slide-up + fade-in keyframe animation

**Loading state:**
- Show a three-dot pulsing animation while waiting for the API
- Show label "searching & generating…" next to the dots

**Source attribution pills** (shown below each assistant message):
- One pill per retrieved source (max 4 shown)
- Format: 📄 {truncated filename} · chunk {N} · {score}%
- Style: indigo background tint, rounded pill shape, 11px font

**Retrieved context panel** (shown above the input after each answer):
- Collapsible section showing the raw chunk text used
- Shows top 3 chunks with: source label, doc name, chunk index, score percentage
- Truncate chunk text preview to 120 characters + ellipsis

**Input area:**
- `<textarea>` with 2 rows, auto-styled to match dark theme
- Placeholder changes based on state: "Upload documents first…" vs "Ask anything about your documents…"
- `Enter` to send, `Shift+Enter` for newline
- Send button (↑ arrow icon, indigo background) disabled when input is empty or loading
- Footer text: "Powered by Claude · TF-IDF vector search · Private — docs never leave your browser"

### 4.4 Docs Interface

**Drop zone:**
- Large dashed-border rectangle, centered text, upload icon
- Hover and drag-over states change border color to indigo + subtle background tint
- Clicking anywhere on the zone opens the file picker
- "Choose Files" button inside the zone (secondary action)
- Subtext listing supported file types

**Document list:**
- Each doc: icon + filename + chunk count + file size + remove button
- Remove button: subtle × icon, turns red on hover
- After all docs removed: "No documents uploaded yet" empty state
- Success banner at bottom when index is ready: "✅ Knowledge base ready · {N} chunks indexed with TF-IDF embeddings"

### 4.5 Design System

**Color palette (CSS variables or inline):**
```
Background:      #0a0a0f  (near-black)
Surface:         #111827  (card/bubble bg)
Surface raised:  #0d1117  (panels)
Border:          #1f2937  (subtle separator)
Border accent:   #1e1b4b  (indigo-tinted border for assistant)
Text primary:    #e2e8f0
Text secondary:  #9ca3af
Text muted:      #6b7280
Text disabled:   #374151
Accent:          #6366f1  (indigo-500)
Accent light:    #a5b4fc  (indigo-300)
Accent hover:    #4f46e5  (indigo-600)
User bubble:     #1e3a5f  (dark blue)
User text:       #60a5fa  (blue-400)
Error:           #ef4444
```

**Typography:**
- Body/mono: `'IBM Plex Mono', 'Courier New', monospace`
- Display/headings: `'Space Grotesk', sans-serif`
- Import both from Google Fonts via `@import` in the `<style>` tag

**Animations (CSS keyframes):**
```css
@keyframes slideIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50%       { opacity: 1; }
}
```

**Scrollbar:**
- Width: 4px
- Track: #111, Thumb: #334, border-radius: 2px

---

## SECTION 5 — STATE MANAGEMENT

Use React `useState` for all state. Required state variables:

```javascript
const [docs, setDocs] = useState([]);
// Array of { name, chunks: [{text, chunkIndex}], size, addedAt }

const [vocab, setVocab] = useState(null);
// Map<word, index> — the TF-IDF vocabulary

const [idf, setIdf] = useState(null);
// Float32Array — IDF weights per vocab word

const [embeddings, setEmbeddings] = useState([]);
// Array of { vec: Float32Array, docName, chunkIndex, text, score? }

const [messages, setMessages] = useState([]);
// Array of { role: "user"|"assistant", content: string, sources?: [...] }

const [input, setInput] = useState("");
// Current textarea value

const [loading, setLoading] = useState(false);
// True while waiting for API response

const [indexing, setIndexing] = useState(false);
// True while rebuilding vector index

const [dragOver, setDragOver] = useState(false);
// True while file is dragged over the drop zone

const [sources, setSources] = useState([]);
// Top chunks from the most recent retrieval

const [activeTab, setActiveTab] = useState("chat");
// "chat" | "docs"
```

Use `useRef` for:
- `fileRef` — hidden `<input type="file">` element
- `messagesEndRef` — bottom of message list (auto-scroll target)
- `inputRef` — textarea (focus after send)

Use `useCallback` for:
- `rebuildIndex(allDocs)` — memoized to avoid stale closure issues
- `processFiles(files)` — memoized for the same reason

Use `useEffect` for:
- Auto-scroll to bottom whenever `messages` changes: `messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })`

---

## SECTION 6 — FUNCTION SPECIFICATIONS

Implement each function exactly as described:

### `chunkText(text, chunkSize=400, overlap=80) → string[]`
Split text into overlapping word-window chunks. Filter out chunks < 20 words.

### `cosineSim(a: Float32Array, b: Float32Array) → number`
Return dot product of a and b divided by product of their L2 norms plus epsilon.

### `buildVocab(texts: string[]) → Map<string, number>`
Tokenize all texts with `/\b\w+\b/g` lowercased. Assign sequential integer indices.

### `buildIdf(texts: string[], vocab: Map) → Float32Array`
Compute document frequency per word. Return log-smoothed IDF as Float32Array.

### `tfidfEmbed(text: string, vocab: Map, idf: Float32Array) → Float32Array`
Return normalized TF-IDF vector for text. Term frequency = count/total_words.

### `readFileText(file: File) → Promise<string>`
Return file content as a string using FileReader. Works for all supported types.

### `rebuildIndex(allDocs) → void`
Wrap in `setTimeout(..., 10)` to yield the UI thread. Sets `indexing: true` at start, `false` in finally block. Rebuilds vocab, IDF, and all embeddings.

### `processFiles(files: FileList|File[]) → Promise<void>`
Async. Sets indexing true. Reads each file, chunks it, builds doc objects, appends to `docs`, calls `rebuildIndex`.

### `search(query: string, topK=5) → chunk[]`
Embed query, compute cosine sim against all embeddings, sort descending, return top topK where score > 0.01.

### `askClaude(query, chunks, history) → Promise<string>`
Build prompt from retrieved chunks. POST to Anthropic API. Return text from `data.content[0].text`. Throw on API error.

### `sendMessage() → Promise<void>`
Guard: return if loading or empty input or no embeddings (show warning message instead).
Flow: append user message → clear input → set loading → call search → call askClaude → append assistant message with sources → set sources → set loading false.

---

## SECTION 7 — TECHNICAL CONSTRAINTS

- **Single file**: Everything in one `.jsx` file. No imports from local files.
- **No external vector library**: Implement all math from scratch (no `ml-matrix`, no `faiss-node`, etc.)
- **No API key in code**: Do not include any Authorization header. The fetch call goes to `https://api.anthropic.com/v1/messages` as-is.
- **No `<form>` tags**: Use `onClick` and `onChange` handlers exclusively.
- **No localStorage**: Keep all state in React memory only.
- **Float32Array for vectors**: Memory-efficient typed arrays, not plain JavaScript arrays.
- **`setTimeout(..., 10)` for index rebuild**: Required to yield the UI thread and show the indexing indicator before the CPU-intensive work begins.
- **Google Fonts via @import**: Load `IBM Plex Mono` and `Space Grotesk` in the style tag.
- **CSS in `<style>` tag**: Use a single embedded `<style>` block for keyframes, scrollbar, hover/focus states, and utility classes. Use inline styles for component-specific styling.

---

## SECTION 8 — QUALITY CHECKLIST

Before considering the implementation complete, verify every item:

**Functionality:**
- [ ] Drag-and-drop file upload works
- [ ] Click-to-upload file picker works
- [ ] Multiple files can be added in separate batches
- [ ] Chunking produces overlapping chunks of ~400 words
- [ ] TF-IDF index rebuilds correctly after adding/removing docs
- [ ] Search returns relevant chunks with similarity scores
- [ ] Claude API call succeeds and returns a cited answer
- [ ] Conversation history is maintained across turns
- [ ] Removing a document rebuilds the index correctly
- [ ] Error messages display cleanly without crashing the app

**UI/UX:**
- [ ] Indexing indicator shows/hides correctly
- [ ] Empty state shows correct message based on whether docs are loaded
- [ ] Suggested question chips pre-fill the input
- [ ] Source pills show under assistant messages
- [ ] Retrieved context panel shows after each answer
- [ ] Loading dots animate while waiting for API
- [ ] Auto-scroll works as new messages arrive
- [ ] Enter sends, Shift+Enter adds newline
- [ ] Send button disables correctly
- [ ] Tab switching works without losing state
- [ ] Drag-over styling applies when file is dragged onto drop zone

**Code Quality:**
- [ ] No placeholder functions or stub implementations
- [ ] No console.error calls without try/catch
- [ ] All state updates use functional form where needed (`setState(prev => ...)`)
- [ ] `useCallback` used for `processFiles` and `rebuildIndex`
- [ ] `useEffect` scroll runs on every message change
- [ ] No hardcoded API keys anywhere in the file

---

## SECTION 9 — EXAMPLE COMPLETE FLOW

To verify the system works end-to-end, trace this scenario:

1. User opens the app → sees empty chat with "Upload documents first" hint
2. User clicks "Docs" tab → sees the drop zone
3. User drags a `.txt` file onto the drop zone → "● indexing…" appears
4. File is read, chunked into ~N chunks, vocab built, IDF computed, embeddings generated
5. "✅ Knowledge base ready · N chunks indexed" banner appears
6. User clicks "Chat" tab → sees subtitle updated "1 doc · N chunks indexed"
7. User types "What is this document about?" and hits Enter
8. Input clears, "searching & generating…" dots appear
9. Query is embedded, top 5 chunks retrieved by cosine similarity
10. Claude receives chunks + query, returns answer with [Source 1] citations
11. Answer appears with slide-in animation, source pills below it
12. Retrieved context panel shows the 3 raw chunks used
13. User asks a follow-up → history is included in next API call

---

## DELIVERABLE

Produce a single, complete, runnable `.jsx` file that implements every section above. The file must:
- Export a default React functional component
- Contain all logic inline (no external imports except React hooks)
- Be immediately runnable in a Claude artifact / React sandbox environment
- Produce a visually polished, professional dark-themed interface
- Handle all error cases gracefully

Do not truncate any section. Do not add placeholder comments. Write the entire implementation.
