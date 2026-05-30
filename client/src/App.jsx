import { useState, useRef, useCallback, useEffect } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// EMBEDDED STYLES  (keyframes, scrollbar, global resets, utility classes)
// ═══════════════════════════════════════════════════════════════════════════
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Space+Grotesk:wght@400;500;600;700&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: #0a0a0f;
  color: #e2e8f0;
  font-family: 'IBM Plex Mono', 'Courier New', monospace;
}

::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: #111; }
::-webkit-scrollbar-thumb { background: #334155; border-radius: 2px; }

@keyframes slideIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes pulse {
  0%, 100% { opacity: 0.35; }
  50%       { opacity: 1; }
}

@keyframes dotPulse {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
  40%            { transform: scale(1);   opacity: 1; }
}

.msg-slide {
  animation: slideIn 0.22s ease forwards;
}

.dot-1 { animation: dotPulse 1.3s ease infinite; }
.dot-2 { animation: dotPulse 1.3s ease infinite 0.2s; }
.dot-3 { animation: dotPulse 1.3s ease infinite 0.4s; }

.indexing-pulse { animation: pulse 1.6s ease infinite; }

.remove-btn:hover { color: #ef4444 !important; }
.chip-btn:hover   { background: #1e1b4b !important; border-color: #6366f1 !important; }
.tab-btn:hover:not(.tab-active) { border-color: #6366f1 !important; color: #a5b4fc !important; }
.send-btn:hover:not(:disabled)  { background: #4f46e5 !important; }
.choose-btn:hover { background: #1e1b4b !important; }
.ctx-toggle:hover { color: #a5b4fc !important; }
`;

// ═══════════════════════════════════════════════════════════════════════════
// DESIGN TOKENS
// ═══════════════════════════════════════════════════════════════════════════
const C = {
  bg:            '#0a0a0f',
  surface:       '#111827',
  surfaceRaised: '#0d1117',
  border:        '#1f2937',
  borderAccent:  '#1e1b4b',
  textPrimary:   '#e2e8f0',
  textSecondary: '#9ca3af',
  textMuted:     '#6b7280',
  textDisabled:  '#374151',
  accent:        '#6366f1',
  accentLight:   '#a5b4fc',
  accentHover:   '#4f46e5',
  userBubble:    '#1e3a5f',
  userText:      '#60a5fa',
  error:         '#ef4444',
};

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/** Sliding-window chunker — 400 words, 80-word overlap, min 20 words */
function chunkText(text, chunkSize = 400, overlap = 80) {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks = [];
  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length);
    const chunkWords = words.slice(start, end);
    if (chunkWords.length >= 20) {
      chunks.push(chunkWords.join(' '));
    }
    if (end === words.length) break;
    start += chunkSize - overlap;
  }
  return chunks;
}

/** Cosine similarity with epsilon guard */
function cosineSim(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-10);
}

const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'arent', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'cant', 'cannot', 'could',
  'couldnt', 'did', 'didnt', 'do', 'does', 'doesnt', 'doing', 'dont', 'down', 'during', 'each', 'few', 'for', 'from',
  'further', 'had', 'hadnt', 'has', 'hasnt', 'have', 'havent', 'having', 'he', 'hed', 'hell', 'hes', 'her', 'here',
  'heres', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'hows', 'i', 'id', 'ill', 'im', 'ive', 'if', 'in',
  'into', 'is', 'isnt', 'it', 'its', 'itself', 'lets', 'me', 'more', 'most', 'mustnt', 'my', 'myself', 'no', 'nor',
  'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
  'same', 'shant', 'she', 'shed', 'shell', 'shes', 'should', 'shouldnt', 'so', 'some', 'such', 'than', 'that', 'thats',
  'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'theres', 'these', 'they', 'theyd', 'theyll',
  'theyre', 'theyve', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasnt', 'we',
  'wed', 'well', 'were', 'weve', 'werent', 'what', 'whats', 'when', 'whens', 'where', 'wheres', 'which', 'while',
  'who', 'whos', 'whom', 'why', 'whys', 'with', 'wont', 'would', 'wouldnt', 'you', 'youd', 'youll', 'youre', 'youve',
  'your', 'yours', 'yourself', 'yourselves'
]);

/** Build word → index vocabulary from a list of texts (ignoring common stop words) */
function buildVocab(texts) {
  const vocab = new Map();
  let idx = 0;
  for (const text of texts) {
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    for (const w of words) {
      if (w.length > 1 && !STOP_WORDS.has(w) && !vocab.has(w)) {
        vocab.set(w, idx++);
      }
    }
  }
  return vocab;
}

/** Log-smoothed IDF weights as Float32Array */
function buildIdf(texts, vocab) {
  const N  = texts.length;
  const df = new Float32Array(vocab.size);
  for (const text of texts) {
    const seen = new Set((text.toLowerCase().match(/\b\w+\b/g) || []));
    for (const w of seen) {
      if (vocab.has(w)) df[vocab.get(w)]++;
    }
  }
  const idf = new Float32Array(vocab.size);
  for (let i = 0; i < vocab.size; i++) {
    idf[i] = Math.log((N + 1) / (df[i] + 1)) + 1;
  }
  return idf;
}

/** L2-normalized TF-IDF vector */
function tfidfEmbed(text, vocab, idf) {
  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  const tf    = new Float32Array(vocab.size);
  for (const w of words) {
    if (vocab.has(w)) tf[vocab.get(w)]++;
  }
  const len = words.length || 1;
  const vec = new Float32Array(vocab.size);
  let norm  = 0;
  for (let i = 0; i < vocab.size; i++) {
    vec[i] = (tf[i] / len) * idf[i];
    norm   += vec[i] * vec[i];
  }
  norm = Math.sqrt(norm);
  if (norm > 0) for (let i = 0; i < vec.length; i++) vec[i] /= norm;
  return vec;
}

/** FileReader wrapper → Promise<string> */
function readFileText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = (e) => resolve(e.target.result);
    reader.onerror = ()  => reject(new Error(`Failed to read "${file.name}"`));
    reader.readAsText(file);
  });
}

/** Extract text from PDF using PDF.js */
function extractPdfText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const typedarray = new Uint8Array(e.target.result);
        const pdfjsLib = window['pdfjs-dist/build/pdf'];
        if (!pdfjsLib) {
          throw new Error('PDF.js library is not loaded. Please check your internet connection.');
        }
        
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
        
        const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
        let fullText = '';
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item) => item.str).join(' ');
          fullText += pageText + '\n';
        }
        resolve(fullText);
      } catch (err) {
        reject(new Error(`Failed to extract text from PDF: ${err.message}`));
      }
    };
    reader.onerror = () => reject(new Error(`Failed to read PDF file binary data`));
    reader.readAsArrayBuffer(file);
  });
}

/** File text extractor router based on extension */
function extractText(file) {
  if (file.name.toLowerCase().endsWith('.pdf')) {
    return extractPdfText(file);
  }
  return readFileText(file);
}

/** Human-readable file size */
function fmtSize(bytes) {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Truncate string with ellipsis */
function trunc(str, n) {
  return str.length > n ? str.slice(0, n) + '…' : str;
}

/** Render basic markdown content safely into React HTML elements */
function renderMarkdown(text) {
  if (!text) return '';

  // 1. Escape HTML
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 2. Parse code blocks: ```lang\ncode\n```
  html = html.replace(/```(?:[a-zA-Z0-9]+)?\n([\s\S]*?)```/g, (match, p1) => {
    return `<pre style="background:#0d1117;padding:14px;border-radius:8px;font-family:'IBM Plex Mono',monospace;overflow-x:auto;border:1px solid #30363d;margin:12px 0;white-space:pre;font-size:12px;line-height:1.5;"><code>${p1.trim()}</code></pre>`;
  });
  html = html.replace(/```([\s\S]*?)```/g, (match, p1) => {
    return `<pre style="background:#0d1117;padding:14px;border-radius:8px;font-family:'IBM Plex Mono',monospace;overflow-x:auto;border:1px solid #30363d;margin:12px 0;white-space:pre;font-size:12px;line-height:1.5;"><code>${p1.trim()}</code></pre>`;
  });

  // 3. Inline code: `code`
  html = html.replace(/`([^`\n]+)`/g, '<code style="background:#1e1b4b;border:1px solid #312e81;padding:2px 6px;border-radius:4px;font-family:\'IBM Plex Mono\',monospace;color:#a5b4fc;font-size:12px;">$1</code>');

  // 4. Headings
  html = html.replace(/^(?:###)\s+(.*$)/gim, '<h3 style="font-family:\'Space Grotesk\',sans-serif;font-weight:600;margin:16px 0 6px;color:#ffffff;font-size:15px;">$1</h3>');
  html = html.replace(/^(?:##)\s+(.*$)/gim, '<h2 style="font-family:\'Space Grotesk\',sans-serif;font-weight:600;margin:20px 0 8px;color:#ffffff;font-size:17px;border-bottom:1px solid #1f2937;padding-bottom:4px;">$1</h2>');
  html = html.replace(/^(?:#)\s+(.*$)/gim, '<h1 style="font-family:\'Space Grotesk\',sans-serif;font-weight:700;margin:24px 0 10px;color:#ffffff;font-size:20px;">$1</h1>');

  // 5. Bold text: **bold**
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong style="color:#ffffff;font-weight:600;">$1</strong>');

  // 6. Italic text: *italic* or _italic_
  html = html.replace(/\*([^*]+)\*/g, '<em style="font-style:italic;">$1</em>');

  // 7. Unordered lists: lines starting with - or *
  html = html.replace(/^(?:\s*[-*])\s+(.*$)/gim, '<li style="margin-left:16px;margin-bottom:6px;list-style-type:disc;font-size:13px;line-height:1.6;">$1</li>');

  // 8. Ordered lists: lines starting with numbers
  html = html.replace(/^(?:\s*\d+\.)\s+(.*$)/gim, '<li style="margin-left:16px;margin-bottom:6px;list-style-type:decimal;font-size:13px;line-height:1.6;">$1</li>');

  // 9. Line breaks / paragraph splits
  const lines = html.split('\n');
  let insidePre = false;
  const processedLines = lines.map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('<pre')) {
      insidePre = true;
      return line;
    }
    if (trimmed.endsWith('</pre>')) {
      insidePre = false;
      return line;
    }
    if (insidePre) {
      return line;
    }

    if (
      trimmed.startsWith('<li') ||
      trimmed.startsWith('<h') ||
      trimmed.startsWith('<div') ||
      trimmed.startsWith('</div')
    ) {
      return line;
    }
    return line ? `${line}<br />` : '<div style="height:10px;"></div>';
  });

  html = processedLines.join('\n');

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

const DB_NAME = 'rag_docs_db';
const DB_VERSION = 1;
const STORE_NAME = 'documents';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'name' });
      }
    };
  });
}

function saveDocsToDB(docsList) {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => {
        if (docsList.length === 0) {
          resolve();
          return;
        }
        let count = 0;
        for (const doc of docsList) {
          const putRequest = store.put({
            name: doc.name,
            size: doc.size,
            chunks: doc.chunks,
            addedAt: doc.addedAt
          });
          putRequest.onsuccess = () => {
            count++;
            if (count === docsList.length) {
              resolve();
            }
          };
          putRequest.onerror = () => reject(putRequest.error);
        }
      };
      clearRequest.onerror = () => reject(clearRequest.error);
    });
  });
}

function loadDocsFromDB() {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function App() {
  // ── State ────────────────────────────────────────────────────────────────
  const [docs,      setDocs]      = useState([]);
  const [vocab,     setVocab]     = useState(null);
  const [idf,       setIdf]       = useState(null);
  const [embeddings,setEmbeddings]= useState([]);
  const [messages,  setMessages]  = useState(() => {
    try {
      const saved = localStorage.getItem('rag_chat_messages');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      return [];
    } catch {
      return [];
    }
  });
  const [input,     setInput]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [indexing,  setIndexing]  = useState(false);
  const [dragOver,  setDragOver]  = useState(false);
  const [sources,   setSources]   = useState([]);
  const [activeTab, setActiveTab] = useState('chat');
  const [ctxOpen,   setCtxOpen]   = useState(false);
  const [model,     setModel]     = useState('poolside/laguna-xs.2:free');

  const getModelLabel = (m) => {
    if (m === 'poolside/laguna-xs.2:free') return 'Laguna XS.2';
    return m;
  };

  // ── Refs ─────────────────────────────────────────────────────────────────
  const fileRef       = useRef(null);
  const messagesEndRef= useRef(null);
  const inputRef      = useRef(null);
  // ── rebuildIndex ──────────────────────────────────────────────────────────
  const rebuildIndex = useCallback((allDocs) => {
    setIndexing(true);
    setTimeout(() => {
      try {
        if (!allDocs || !Array.isArray(allDocs)) return;
        const allChunks = allDocs.flatMap((d) => {
          if (!d || !d.chunks || !Array.isArray(d.chunks)) return [];
          return d.chunks.map((c) => ({ ...c, docName: d.name }));
        });
        if (allChunks.length === 0) {
          setVocab(null);
          setIdf(null);
          setEmbeddings([]);
          return;
        }
        const texts    = allChunks.map((c) => c.text);
        const newVocab = buildVocab(texts);
        const newIdf   = buildIdf(texts, newVocab);
        const newEmbs  = allChunks.map((chunk) => ({
          vec:        tfidfEmbed(chunk.text, newVocab, newIdf),
          docName:    chunk.docName,
          chunkIndex: chunk.chunkIndex,
          text:       chunk.text,
        }));
        setVocab(newVocab);
        setIdf(newIdf);
        setEmbeddings(newEmbs);
      } catch (err) {
        console.error('Failed to rebuild index:', err);
      } finally {
        setIndexing(false);
      }
    }, 10);
  }, []);

  // ── Auto-scroll ──────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Sync messages to localStorage ────────────────────────────────────────
  useEffect(() => {
    try {
      localStorage.setItem('rag_chat_messages', JSON.stringify(messages));
    } catch (err) {
      console.error('Failed to save messages to localStorage:', err);
    }
  }, [messages]);

  // ── Load documents from IndexedDB on mount ───────────────────────────────
  useEffect(() => {
    let active = true;
    async function loadSavedData() {
      try {
        const savedDocs = await loadDocsFromDB();
        if (active && Array.isArray(savedDocs) && savedDocs.length > 0) {
          setDocs(savedDocs);
          rebuildIndex(savedDocs);
        }
      } catch (err) {
        console.error('Failed to load documents from database:', err);
      }
    }
    loadSavedData();
    return () => {
      active = false;
    };
  }, [rebuildIndex]);

  // ── processFiles ──────────────────────────────────────────────────────────
  const processFiles = useCallback(
    async (files) => {
      setIndexing(true);
      const fileArray = Array.from(files);
      const newDocs   = [];

      for (const file of fileArray) {
        try {
          const text       = await extractText(file);
          const normalized = text.replace(/\s+/g, ' ').trim();
          
          // Check if document has readable text (at least 10 letters/numbers)
          const hasAlphanumeric = /[a-zA-Z0-9]/.test(normalized);
          if (!hasAlphanumeric || normalized.length < 10) {
            setMessages((prev) => [
              ...prev,
              { 
                role: 'assistant', 
                content: `⚠️ **Warning for "${file.name}":** No readable text was extracted. If this is a scanned PDF, please upload a version with OCR text enabled so it can be indexed.` 
              },
            ]);
          }

          const chunkList  = chunkText(normalized);
          const chunks     = chunkList.map((t, i) => ({
            text:       t,
            chunkIndex: i,
            docName:    file.name,
            docSize:    file.size,
            addedAt:    new Date().toISOString(),
          }));
          newDocs.push({
            name:    file.name,
            size:    file.size,
            chunks,
            addedAt: new Date().toISOString(),
          });
        } catch (err) {
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: `❌ Error reading "${file.name}": ${err.message}` },
          ]);
        }
      }

      setDocs((prev) => {
        const updated = [...prev, ...newDocs];
        saveDocsToDB(updated).catch((err) => console.error('Failed to save docs to DB:', err));
        rebuildIndex(updated);
        return updated;
      });
    },
    [rebuildIndex]
  );

  // ── search ────────────────────────────────────────────────────────────────
  const search = (query, topK = 5) => {
    if (!vocab || !idf || embeddings.length === 0) return [];
    const qVec = tfidfEmbed(query, vocab, idf);
    
    let results = embeddings
      .map((e) => ({ ...e, score: cosineSim(qVec, e.vec) }))
      .filter((e) => e.score > 0.01)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    // Fallback: If no direct keyword matches are found, return the first few chunks
    // as general context so the model can still answer overview/summarization queries.
    if (results.length === 0) {
      results = embeddings.slice(0, topK).map((e) => ({ ...e, score: 0 }));
    }
    
    return results;
  };

  // ── askLLM ─────────────────────────────────────────────────────────────
  const askLLM = async (query, chunks, history) => {
    const contextText = chunks
      .map(
        (c, i) =>
          `[Source ${i + 1} | ${c.docName} | chunk ${c.chunkIndex + 1}]\n${c.text}`
      )
      .join('\n\n---\n\n');

    const userContent  = `Document context:\n\n${contextText}\n\n---\n\nQuestion: ${query}`;
    const recentHistory= history.slice(-6);
    const payload      = [...recentHistory, { role: 'user', content: userContent }];

    const systemPrompt =
      'You are a precise document assistant. Answer questions using ONLY the provided document excerpts.\n' +
      'Rules:\n' +
      '- Always cite sources as [Source N] inline within your answer\n' +
      '- If the answer isn\'t in the context, say "I couldn\'t find that in the uploaded documents"\n' +
      '- Be concise but thorough\n' +
      '- Quote key phrases directly when helpful';

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const res    = await fetch(`${apiUrl}/api/chat`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        model:      model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...payload,
        ],
        // Enable reasoning options on OpenRouter
        reasoning: {
          effort: 'medium'
        }
      }),
    });

    const data = await res.json();
    if (data.error) {
      const errMsg = data.error.metadata?.raw || data.error.message || 'API error';
      throw new Error(errMsg);
    }
    
    const choiceMessage = data.choices[0].message;
    let content = choiceMessage.content || '';
    content = content.replace(/<\/assistant>/gi, '').trim();
    return {
      content: content,
      reasoning: choiceMessage.reasoning || null,
      reasoning_details: choiceMessage.reasoning_details || null
    };
  };

  // ── sendMessage ───────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (loading || !input.trim()) return;

    if (embeddings.length === 0) {
      setMessages((prev) => [
        ...prev,
        {
          role:    'assistant',
          content: '⚠️  Please upload and index documents first. Head to the 📁 Docs tab to get started.',
        },
      ]);
      return;
    }

    const query = input.trim();
    setMessages((prev) => [...prev, { role: 'user', content: query }]);
    setInput('');
    setLoading(true);
    setSources([]);
    setCtxOpen(false);

    try {
      const topChunks    = search(query);
      setSources(topChunks);
      const historyForApi = messages.map((m) => {
        const payloadMsg = { role: m.role, content: m.content };
        if (m.role === 'assistant') {
          if (m.reasoning) payloadMsg.reasoning = m.reasoning;
          if (m.reasoning_details) payloadMsg.reasoning_details = m.reasoning_details;
        }
        return payloadMsg;
      });
      const result        = await askLLM(query, topChunks, historyForApi);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: result.content,
          reasoning: result.reasoning,
          reasoning_details: result.reasoning_details,
          sources: topChunks
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `❌ Error: ${err.message}` },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  // ── removeDoc ─────────────────────────────────────────────────────────────
  const removeDoc = (name) => {
    setDocs((prev) => {
      const updated = prev.filter((d) => d.name !== name);
      saveDocsToDB(updated).catch((err) => console.error('Failed to save docs to DB:', err));
      rebuildIndex(updated);
      return updated;
    });
  };

  const clearChat = () => {
    const confirmClear = window.confirm("Are you sure you want to clear the chat history? This will delete all messages but keep your uploaded documents.");
    if (confirmClear) {
      setMessages([]);
      localStorage.removeItem('rag_chat_messages');
    }
  };

  const resetWorkspace = async () => {
    const confirmReset = window.confirm("Are you sure you want to reset the workspace? This will delete all messages, remove all uploaded documents, and wipe the search index.");
    if (confirmReset) {
      setMessages([]);
      setDocs([]);
      setVocab(null);
      setIdf(null);
      setEmbeddings([]);
      setSources([]);
      localStorage.removeItem('rag_chat_messages');
      try {
        await saveDocsToDB([]);
      } catch (err) {
        console.error('Failed to clear database:', err);
      }
    }
  };

  const exportChat = () => {
    if (messages.length === 0) return;
    let markdownContent = `# RAG Chat Transcript - ${new Date().toLocaleDateString()}\n\n`;
    
    messages.forEach((msg, idx) => {
      const roleName = msg.role === 'user' ? 'User' : 'Assistant';
      markdownContent += `### **${roleName}**\n\n${msg.content}\n\n`;
      
      if (msg.role === 'assistant' && msg.sources && msg.sources.length > 0) {
        markdownContent += `*Sources cited:*\n`;
        msg.sources.slice(0, 4).forEach((src) => {
          markdownContent += `- 📄 ${src.docName} (chunk ${src.chunkIndex + 1}) · Match: ${Math.round(src.score * 100)}%\n`;
        });
        markdownContent += `\n`;
      }
      markdownContent += `---\n\n`;
    });
    
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `rag_chat_export_${new Date().toISOString().slice(0,10)}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── Derived values ────────────────────────────────────────────────────────
  const totalChunks = (docs || []).reduce((s, d) => {
    if (!d || !d.chunks || !Array.isArray(d.chunks)) return s;
    return s + d.chunks.length;
  }, 0);
  const SUGGESTED   = [
    'Summarize the main topics',
    'What are the key findings?',
    'List important terms',
  ];
  const ACCEPT = '.txt,.md,.csv,.json,.html,.pdf,.rst,.log';

  // ── Drag handlers ─────────────────────────────────────────────────────────
  const onDragOver  = (e) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave = ()  => setDragOver(false);
  const onDrop      = (e) => {
    e.preventDefault();
    setDragOver(false);
    processFiles(e.dataTransfer.files);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ═════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════
  return (
    <>
      <style>{CSS}</style>

      {/* Hidden file input */}
      <input
        ref={fileRef}
        id="file-input"
        type="file"
        multiple
        accept={ACCEPT}
        style={{ display: 'none' }}
        onChange={(e) => { processFiles(e.target.files); e.target.value = ''; }}
      />

      {/* ── ROOT ── */}
      <div style={{
        background:    C.bg,
        color:         C.textPrimary,
        minHeight:     '100vh',
        display:       'flex',
        flexDirection: 'column',
        fontFamily:    "'IBM Plex Mono', 'Courier New', monospace",
        maxWidth:      '900px',
        margin:        '0 auto',
      }}>

        {/* ══════════════════════════════════════════════════════════════════
            HEADER
        ══════════════════════════════════════════════════════════════════ */}
        <header style={{
          position:      'sticky',
          top:           0,
          zIndex:        100,
          background:    C.surfaceRaised,
          borderBottom:  `1px solid ${C.border}`,
          padding:       '14px 24px',
          display:       'flex',
          alignItems:    'center',
          justifyContent:'space-between',
          gap:           '16px',
        }}>
          {/* Left — logo + title */}
          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
            <div style={{
              width:          '38px',
              height:         '38px',
              background:     `linear-gradient(135deg, ${C.accent}, #8b5cf6)`,
              borderRadius:   '10px',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              fontSize:       '20px',
              flexShrink:     0,
            }}>⬡</div>
            <div>
              <div style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700,
                fontSize:   '15px',
                color:      C.textPrimary,
                letterSpacing: '-0.01em',
              }}>RAG Document Intelligence</div>
              <div style={{ fontSize:'11px', color: C.textSecondary, marginTop:'2px' }}>
                {indexing ? (
                  <span className="indexing-pulse" style={{ color: C.accentLight }}>
                    ● indexing…
                  </span>
                ) : (
                  <span>
                    {docs.length} doc{docs.length !== 1 ? 's' : ''} · {totalChunks} chunks indexed
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{
            fontSize: '11px',
            color: C.textMuted,
            fontFamily: "'IBM Plex Mono', monospace"
          }}>
            Model: <span style={{ color: C.accentLight }}>{getModelLabel(model)}</span>
          </div>
        </header>

        {/* ══════════════════════════════════════════════════════════════════
            MAIN CONTENT AREA
        ══════════════════════════════════════════════════════════════════ */}
        <div style={{
          flex:          1,
          display:       'flex',
          flexDirection: 'column',
          height:        'calc(100vh - 69px)',
          overflow:      'hidden',
        }}>
          
          {/* ── Document shelf at the top (only visible when files are uploaded) ── */}
          {docs.length > 0 && (
            <div style={{
              background: C.surfaceRaised,
              borderBottom: `1px solid ${C.border}`,
              padding: '10px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', flex: 1, padding: '2px 0' }}>
                {docs.map((doc, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      background: C.surface,
                      border: `1px solid ${C.border}`,
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      gap: '6px',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    <span>📄 {trunc(doc.name, 22)}</span>
                    <span style={{ color: C.textMuted }}>({(doc.chunks || []).length} chunks)</span>
                    <button
                      onClick={() => removeDoc(doc.name)}
                      title={`Remove ${doc.name}`}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: C.textMuted,
                        cursor: 'pointer',
                        fontSize: '12px',
                        padding: '0 2px',
                        transition: 'color 0.15s',
                      }}
                    >✕</button>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {indexing && (
                  <span className="indexing-pulse" style={{ color: C.accentLight, fontSize: '11px' }}>
                    ● indexing…
                  </span>
                )}
                <button
                  id="add-doc-shelf-btn"
                  onClick={() => fileRef.current?.click()}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${C.accent}`,
                    borderRadius: '6px',
                    color: C.accent,
                    cursor: 'pointer',
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '11px',
                    padding: '6px 14px',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  + Add Document
                </button>
              </div>
            </div>
          )}

          {/* ── Active workspace ── */}
          <div style={{
            flex:          1,
            overflowY:     'auto',
            padding:       '24px',
            display:       'flex',
            flexDirection: 'column',
            gap:           '16px',
          }}>
            
            {/* Case A: No documents uploaded */}
            {docs.length === 0 ? (
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '48px 24px',
                gap: '24px',
              }}>
                {indexing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', color: C.accent }} className="indexing-pulse">⬡</div>
                    <div style={{ fontSize: '15px', color: C.accentLight, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
                      Building knowledge base…
                    </div>
                    <div style={{ fontSize: '12px', color: C.textSecondary, fontFamily: "'IBM Plex Mono', monospace" }}>
                      Extracting text and building TF-IDF semantic embeddings.
                    </div>
                  </div>
                ) : (
                  <div
                    id="drop-zone"
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    onClick={() => fileRef.current?.click()}
                    style={{
                      border:         `2px dashed ${dragOver ? C.accent : C.border}`,
                      borderRadius:   '18px',
                      cursor:         'pointer',
                      display:        'flex',
                      flexDirection:  'column',
                      alignItems:     'center',
                      justifyContent: 'center',
                      gap:            '16px',
                      padding:        '64px 32px',
                      maxWidth:       '600px',
                      width:          '100%',
                      textAlign:      'center',
                      background:     dragOver ? '#1e1b4b18' : C.surfaceRaised,
                      transition:     'all 0.2s ease',
                    }}
                  >
                    <div style={{ fontSize:'54px', userSelect:'none' }}>📂</div>
                    <div style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize:   '18px',
                      fontWeight: 600,
                      color:      C.textPrimary,
                    }}>
                      Upload documents to unlock chat
                    </div>
                    <div style={{ color: C.textSecondary, fontSize: '13px', lineHeight: 1.6, maxWidth: '400px' }}>
                      Drag and drop your lecture slides or documents here, or click to choose files. All analysis is private and runs in your browser.
                    </div>
                    <div style={{ color: C.textMuted, fontSize:'11px' }}>
                      Supports: .txt · .md · .csv · .json · .html · .pdf · .rst · .log
                    </div>
                    <button
                      id="choose-files-btn"
                      className="choose-btn"
                      onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
                      style={{
                        background:   'transparent',
                        border:       `1px solid ${C.accent}`,
                        borderRadius: '8px',
                        color:        C.accent,
                        cursor:       'pointer',
                        fontFamily:   "'IBM Plex Mono', monospace",
                        fontSize:     '12px',
                        marginTop:    '8px',
                        padding:      '8px 24px',
                        transition:   'background 0.15s',
                      }}
                    >
                      Choose Files
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Case B: Documents uploaded, empty chat state */}
                {messages.length === 0 && (
                  <div style={{
                    flex:           1,
                    display:        'flex',
                    flexDirection:  'column',
                    alignItems:     'center',
                    justifyContent: 'center',
                    textAlign:      'center',
                    padding:        '64px 24px',
                    gap:            '12px',
                  }}>
                    <div style={{
                      fontSize:   '52px',
                      color:      C.border,
                      marginBottom:'8px',
                      fontFamily: "'Space Grotesk', sans-serif",
                    }}>⬡</div>
                    <div style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize:   '20px',
                      fontWeight: 600,
                      color:      C.textPrimary,
                    }}>Knowledge base ready</div>
                    <div style={{ fontSize:'13px', color: C.textSecondary, maxWidth:'340px', lineHeight:1.7 }}>
                      Ask anything about your {docs.length} uploaded document{docs.length !== 1 ? 's' : ''}.
                    </div>
                    {/* Suggested chips */}
                    <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', justifyContent:'center', marginTop:'8px' }}>
                      {SUGGESTED.map((q) => (
                        <button
                          key={q}
                          className="chip-btn"
                          id={`chip-${q.replace(/\s+/g,'-').toLowerCase()}`}
                          onClick={() => { setInput(q); inputRef.current?.focus(); }}
                          style={{
                            background:   C.surface,
                            border:       `1px solid ${C.border}`,
                            borderRadius: '20px',
                            color:        C.accentLight,
                            cursor:       'pointer',
                            fontFamily:   "'IBM Plex Mono', monospace",
                            fontSize:     '12px',
                            padding:      '7px 16px',
                            transition:   'all 0.15s ease',
                          }}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message bubbles */}
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    id={`msg-${i}`}
                    className="msg-slide"
                    style={{ display:'flex', gap:'12px', alignItems:'flex-start' }}
                  >
                    {/* Avatar */}
                    <div style={{
                      background:     msg.role === 'user' ? C.userBubble : '#1e1b4b',
                      border:         `1px solid ${msg.role === 'user' ? '#1e3a5f' : '#312e81'}`,
                      borderRadius:   '8px',
                      color:          msg.role === 'user' ? C.userText : C.accentLight,
                      fontSize:       msg.role === 'user' ? '12px' : '14px',
                      fontWeight:     600,
                      height:         '32px',
                      width:          '32px',
                      minWidth:       '32px',
                      display:        'flex',
                      alignItems:     'center',
                      justifyContent: 'center',
                      marginTop:      '2px',
                    }}>
                      {msg.role === 'user' ? 'U' : '⬡'}
                    </div>

                    <div style={{ flex:1, minWidth:0 }}>
                      {/* Bubble */}
                      <div style={{
                        background:   msg.role === 'user' ? C.userBubble : C.surface,
                        border:       `1px solid ${msg.role === 'user' ? '#2d4f7a' : C.borderAccent}`,
                        borderRadius: '12px',
                        color:        msg.role === 'user' ? C.userText : C.textPrimary,
                        fontSize:     '13px',
                        fontFamily:   msg.role === 'user' ? "'IBM Plex Mono', monospace" : "system-ui, -apple-system, sans-serif",
                        lineHeight:   1.75,
                        padding:      '12px 16px',
                        whiteSpace:   msg.role === 'user' ? 'pre-wrap' : 'normal',
                        wordBreak:    'break-word',
                      }}>
                        {msg.role === 'user' ? msg.content : renderMarkdown(msg.content)}
                      </div>

                      {/* Reasoning thinking block */}
                      {msg.role === 'assistant' && (msg.reasoning || (msg.reasoning_details && msg.reasoning_details.some(d => d.text))) && (
                        <details style={{
                          marginTop: '8px',
                          background: '#161b22',
                          border: '1px solid #30363d',
                          borderRadius: '8px',
                          padding: '10px 14px',
                        }}>
                          <summary style={{
                            color: C.accentLight,
                            fontSize: '11px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            outline: 'none',
                            userSelect: 'none',
                            fontFamily: "'Space Grotesk', sans-serif"
                          }}>
                            Thought Process
                          </summary>
                          <div style={{
                            marginTop: '8px',
                            color: C.textSecondary,
                            fontSize: '12px',
                            lineHeight: 1.65,
                            whiteSpace: 'pre-wrap',
                            fontFamily: "'IBM Plex Mono', monospace",
                            borderLeft: `2px solid ${C.accent}`,
                            paddingLeft: '10px',
                          }}>
                            {msg.reasoning || msg.reasoning_details.map(d => d.text).join('\n')}
                          </div>
                        </details>
                      )}

                      {/* Source pills */}
                      {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                        <div style={{
                          display:   'flex',
                          gap:       '6px',
                          flexWrap:  'wrap',
                          marginTop: '8px',
                        }}>
                          {msg.sources.slice(0, 4).map((src, j) => (
                            <span
                              key={j}
                              style={{
                                background:   '#1e1b4b',
                                border:       '1px solid #312e81',
                                borderRadius: '20px',
                                color:        C.accentLight,
                                fontSize:     '11px',
                                padding:      '3px 10px',
                              }}
                            >
                              📄 {trunc(src.docName, 22)} · chunk {src.chunkIndex + 1} · {src.score > 0 ? `${Math.round(src.score * 100)}%` : 'General Context'}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Loading indicator */}
                {loading && (
                  <div className="msg-slide" style={{ display:'flex', gap:'12px', alignItems:'flex-start' }}>
                    <div style={{
                      background:     '#1e1b4b',
                      border:         '1px solid #312e81',
                      borderRadius:   '8px',
                      color:          C.accentLight,
                      fontSize:       '14px',
                      height:         '32px',
                      width:          '32px',
                      minWidth:       '32px',
                      display:        'flex',
                      alignItems:     'center',
                      justifyContent: 'center',
                    }}>⬡</div>
                    <div style={{
                      display:      'flex',
                      alignItems:   'center',
                      gap:          '6px',
                      background:   C.surface,
                      border:       `1px solid ${C.borderAccent}`,
                      borderRadius: '12px',
                      padding:      '14px 18px',
                    }}>
                      <span className="dot-1" style={{
                        display:      'inline-block',
                        width:        '7px',
                        height:       '7px',
                        borderRadius: '50%',
                        background:   C.accent,
                      }}/>
                      <span className="dot-2" style={{
                        display:      'inline-block',
                        width:        '7px',
                        height:       '7px',
                        borderRadius: '50%',
                        background:   C.accent,
                      }}/>
                      <span className="dot-3" style={{
                        display:      'inline-block',
                        width:        '7px',
                        height:       '7px',
                        borderRadius: '50%',
                        background:   C.accent,
                      }}/>
                      <span style={{ color: C.textMuted, fontSize:'12px', marginLeft:'6px' }}>
                        searching &amp; generating…
                      </span>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* ── Retrieved context panel (only when context exists and docs uploaded) ── */}
          {docs.length > 0 && sources.length > 0 && !loading && (
            <div style={{
              borderTop:  `1px solid ${C.border}`,
              padding:    '10px 24px',
              background: C.surfaceRaised,
            }}>
              <button
                id="ctx-toggle-btn"
                className="ctx-toggle"
                onClick={() => setCtxOpen((o) => !o)}
                style={{
                  background: 'none',
                  border:     'none',
                  color:      C.textMuted,
                  cursor:     'pointer',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize:   '11px',
                  padding:    '2px 0',
                  transition: 'color 0.15s',
                }}
              >
                {ctxOpen ? '▾' : '▸'} Retrieved context ({sources.length} chunks)
              </button>

              {ctxOpen && (
                <div style={{
                  marginTop: '10px',
                  display:   'flex',
                  flexDirection:'column',
                  gap:       '8px',
                }}>
                  {sources.slice(0, 3).map((src, i) => (
                    <div
                      key={i}
                      style={{
                        background:   C.surface,
                        border:       `1px solid ${C.border}`,
                        borderRadius: '8px',
                        padding:      '10px 14px',
                      }}
                    >
                      <div style={{ color: C.textSecondary, fontSize:'11px', marginBottom:'4px' }}>
                        [Source {i + 1}]{' '}
                        <span style={{ color: C.textMuted }}>{src.docName}</span> · chunk {src.chunkIndex + 1} ·{' '}
                        <span style={{ color: C.accent }}>{src.score > 0 ? `${Math.round(src.score * 100)}% match` : 'general context'}</span>
                      </div>
                      <div style={{ color: C.textMuted, fontSize:'12px', lineHeight:1.65, fontFamily:"'IBM Plex Mono', monospace" }}>
                        {trunc(src.text, 120)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Input area ── */}
          <div style={{
            borderTop:  `1px solid ${C.border}`,
            padding:    '16px 24px 12px',
            background: C.surfaceRaised,
          }}>
            {(messages.length > 0 || docs.length > 0) && (
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '14px',
                marginBottom: '10px',
                fontSize: '11px',
              }}>
                {messages.length > 0 && (
                  <>
                    <button
                      onClick={exportChat}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: C.accentLight,
                        cursor: 'pointer',
                        fontFamily: "'IBM Plex Mono', monospace",
                        transition: 'color 0.15s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                      onMouseOver={(e) => e.currentTarget.style.color = '#fff'}
                      onMouseOut={(e) => e.currentTarget.style.color = C.accentLight}
                    >
                      📥 Export Chat (.md)
                    </button>
                    <button
                      onClick={clearChat}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: C.textSecondary,
                        cursor: 'pointer',
                        fontFamily: "'IBM Plex Mono', monospace",
                        transition: 'color 0.15s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                      onMouseOver={(e) => e.currentTarget.style.color = C.error}
                      onMouseOut={(e) => e.currentTarget.style.color = C.textSecondary}
                    >
                      🗑️ Clear Chat
                    </button>
                  </>
                )}
                {docs.length > 0 && (
                  <button
                    onClick={resetWorkspace}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: C.textMuted,
                      cursor: 'pointer',
                      fontFamily: "'IBM Plex Mono', monospace",
                      transition: 'color 0.15s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                    onMouseOver={(e) => e.currentTarget.style.color = C.error}
                    onMouseOut={(e) => e.currentTarget.style.color = C.textMuted}
                  >
                    🔄 Reset Workspace
                  </button>
                )}
              </div>
            )}
            <div style={{ display:'flex', gap:'10px', alignItems:'flex-end' }}>
              <textarea
                id="chat-input"
                ref={inputRef}
                rows={2}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={
                  docs.length === 0
                    ? '⚠️ Please upload documents above to unlock chat…'
                    : 'Ask anything about your documents…'
                }
                disabled={loading || docs.length === 0}
                style={{
                  flex:        1,
                  background:  docs.length === 0 ? C.bg : C.surface,
                  border:      `1px solid ${C.border}`,
                  borderRadius:'12px',
                  color:       docs.length === 0 ? C.textDisabled : C.textPrimary,
                  fontFamily:  "'IBM Plex Mono', monospace",
                  fontSize:    '13px',
                  lineHeight:  1.7,
                  outline:     'none',
                  padding:     '12px 16px',
                  resize:      'none',
                  cursor:      docs.length === 0 ? 'not-allowed' : 'text',
                  transition:  'border-color 0.15s',
                }}
                onFocus={(e) => { if (docs.length > 0) e.target.style.borderColor = C.accent; }}
                onBlur={(e)  => (e.target.style.borderColor = C.border)}
              />
              <button
                id="send-btn"
                className="send-btn"
                onClick={sendMessage}
                disabled={loading || docs.length === 0 || !input.trim()}
                style={{
                  background:   loading || docs.length === 0 || !input.trim() ? C.textDisabled : C.accent,
                  border:       'none',
                  borderRadius: '12px',
                  color:        loading || docs.length === 0 || !input.trim() ? C.textMuted : '#fff',
                  cursor:       loading || docs.length === 0 || !input.trim() ? 'not-allowed' : 'pointer',
                  fontSize:     '20px',
                  fontWeight:   700,
                  height:       '48px',
                  width:        '48px',
                  minWidth:     '48px',
                  display:      'flex',
                  alignItems:   'center',
                  justifyContent:'center',
                  transition:   'background 0.15s',
                }}
              >↑</button>
            </div>
            <div style={{ color: C.textDisabled, fontSize:'10px', marginTop:'8px', textAlign:'center' }}>
              Powered by {getModelLabel(model)} (via OpenRouter) · TF-IDF vector search · Private — docs never leave your browser
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
