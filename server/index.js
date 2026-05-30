import 'dotenv/config';   // loads server/.env automatically in local dev
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

// ── CORS ──────────────────────────────────────────────────────────────────
// Allow the Vercel frontend domain (set ALLOWED_ORIGIN in production).
// Falls back to all origins in dev.
const allowedOrigins = process.env.ALLOWED_ORIGIN
  ? process.env.ALLOWED_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:5173', 'http://localhost:4173'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., curl, Postman) and listed origins
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked for origin: ${origin}`));
      }
    },
    methods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  })
);

app.use(express.json({ limit: '2mb' }));

// ── HEALTH CHECK ──────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

// ── PROXY ENDPOINT ────────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.OperRouterAPI_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: {
        type: 'config_error',
        message:
          'OPENROUTER_API_KEY / OperRouterAPI_KEY environment variable is not set. ' +
          'Add it to your Render dashboard (or server/.env for local dev).',
      },
    });
  }

  try {
    const openRouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://github.com/google-deepmind/antigravity',
        'X-Title': 'RAG Document Intelligence',
      },
      body: JSON.stringify(req.body),
    });

    const data = await openRouterRes.json();

    if (!openRouterRes.ok) {
      console.error(`❌ [/api/chat] OpenRouter returned error status ${openRouterRes.status}:`, JSON.stringify(data, null, 2));
    }

    // Forward the exact status code so the frontend can detect rate-limit errors etc.
    res.status(openRouterRes.status).json(data);
  } catch (err) {
    console.error('[/api/chat] Upstream fetch failed:', err.message);
    res.status(502).json({
      error: {
        type: 'upstream_error',
        message: `Failed to reach OpenRouter API: ${err.message}`,
      },
    });
  }
});

// ── START ──────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  const configured = !!(process.env.OPENROUTER_API_KEY || process.env.OperRouterAPI_KEY);
  console.log(`✅  RAG proxy server running on http://localhost:${PORT}`);
  console.log(`    API key configured (OpenRouter): ${configured ? 'YES' : '❌ NO'}`);
});
