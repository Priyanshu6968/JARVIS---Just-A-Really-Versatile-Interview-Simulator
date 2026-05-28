const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '20mb' }));

// ─── helpers ──────────────────────────────────────────────────────────────────

function stripFences(text) {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}

function safeParseJSON(raw) {
  try { return JSON.parse(raw); } catch (_) {}
  const stripped = stripFences(raw);
  try { return JSON.parse(stripped); } catch (_) {}
  // Extract first {...} block
  const m = stripped.match(/\{[\s\S]*\}/);
  if (m) try { return JSON.parse(m[0]); } catch (_) {}
  return null;
}

// ─── mock responses ───────────────────────────────────────────────────────────

const MOCK = {
  start: (phase, title) => {
    if (phase === 1) return {
      proceed_to_next_step: false, summary: '',
      response: `Hello! Welcome to your Low Level Design interview at Flipkart. I'm your interviewer today.\n\nWe'll be designing a **${title}**. This is a great problem that covers a lot of interesting design aspects.\n\nLet's start by gathering requirements. Could you please tell me what features you think are essential for this system?`
    };
    if (phase === 3) return {
      proceed_to_next_step: false, summary: '',
      response: 'Can you please start creating your class diagram on the screen on the left? Let me know when you are done.'
    };
    if (phase === 4) return {
      proceed_to_next_step: false, summary: '',
      response: 'Can you please start creating your schema design on the screen on the left? Let me know when you are done.'
    };
    return { proceed_to_next_step: false, summary: '', response: 'Let\'s continue with the next phase.' };
  },

  respond: (phase, userText, turnCount) => {
    const txt = (userText || '').toLowerCase();

    if (phase <= 2) {
      const wantsNext = txt.includes('done') || txt.includes('clear') || txt.includes('next') ||
        txt.includes('move on') || txt.includes('clarify') || turnCount >= 4;
      if (phase === 1 && (txt.includes('clarif') || turnCount >= 4)) return {
        proceed_to_next_step: true,
        summary: 'Requirements gathered: search, booking, seat selection, payment, cancellations.',
        response: 'Great! You\'ve covered the key requirements well. Let\'s move to the Clarifying Requirements phase. Please ask me any clarifying questions you have about the features.'
      };
      if (phase === 2 && wantsNext) return {
        proceed_to_next_step: true,
        summary: 'Seat types: recliner/premium/normal. Cancellation: 30min window for full refund. Concurrency via row-level locks.',
        response: 'Excellent! Requirements are now clear. Let\'s move to the Class Diagram phase. Please open the canvas on the left and start drawing your class diagram.'
      };
      return {
        proceed_to_next_step: false, summary: '',
        response: phase === 1
          ? 'Sounds good, let\'s include that in our design. Are there any other core features you think we should support?'
          : 'Good question! For concurrency, we\'ll use optimistic locking on seat reservations. Any other clarifications needed?'
      };
    }

    if (phase === 3) {
      const wantsNext = txt.includes('done') || txt.includes('finish') || txt.includes('schema') || turnCount >= 3;
      if (wantsNext) return {
        proceed_to_next_step: true, summary: '',
        response: 'Thanks! That\'s all I had on Class Diagram. You can move to Schema Design now.'
      };
      return {
        proceed_to_next_step: false, summary: '',
        response: 'I can see your diagram taking shape. How are you representing the relationship between Movie, Show, and Theatre in your class structure?'
      };
    }

    if (phase === 4) {
      const wantsNext = txt.includes('done') || txt.includes('finish') || txt.includes('complete') || turnCount >= 3;
      if (wantsNext) return {
        proceed_to_next_step: true, summary: '',
        response: 'Thanks! That\'s all I had for the interview. I will be sharing your detailed feedback soon. Best wishes!'
      };
      return {
        proceed_to_next_step: false, summary: '',
        response: 'In which table will you store the city information, and how does it relate to the Theatre table?'
      };
    }

    return { proceed_to_next_step: false, summary: '', response: 'Please continue.' };
  },

  feedback: (phase) => {
    const fb = {
      1: `## Phase 1 & 2 — Requirements Feedback\n\n**Rating: Strong (4/5)**\n\n### What went well\n- Identified all core features: search, booking, payments, cancellation\n- Asked good clarifying questions about seat types and cancellation windows\n- Kept scope reasonable\n\n### Areas to Improve\n- Could have probed about scalability constraints earlier\n- Payment failure scenarios worth discussing\n- Consider idempotency for booking requests`,
      3: `## Phase 3 — Class Diagram Feedback\n\n**Rating: Good (3.5/5)**\n\n### What went well\n- Correct core entities: Movie, Theatre, Show, Seat, Booking, User\n- State pattern for booking status was a great choice\n\n### Areas to Improve\n- Missing a \`SeatType\` enum or subclass hierarchy\n- \`BookingManager\` singleton pattern not represented\n- Thread-safety not captured in the diagram`,
      4: `## Phase 4 — Schema Design Feedback\n\n**Rating: Good (3.5/5)**\n\n### What went well\n- Clean separation between static (movies, seats) and dynamic (show_seats) data\n- Appropriate foreign key relationships\n\n### Areas to Improve\n- Add composite index on \`(show_id, seat_status)\` for fast availability queries\n- \`booking_id\` should be idempotency key for payment retries\n- Consider partitioning \`bookings\` table by date`
    };
    return { proceed_to_next_step: false, summary: '', response: fb[phase] || '## Feedback\n\nGood effort overall!' };
  }
};

// ─── live Claude call ─────────────────────────────────────────────────────────

async function callClaude(systemPrompt, messages, apiKey) {
  const resp = await axios.post(
    'https://api.anthropic.com/v1/messages',
    { model: 'claude-sonnet-4-20250514', max_tokens: 2048, system: systemPrompt, messages },
    {
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      timeout: 30000
    }
  );
  return resp.data.content[0].text;
}

// ─── main route ───────────────────────────────────────────────────────────────

app.post('/api/interview', async (req, res) => {
  const { phase, systemPrompt, messages, message_type, problemTitle, turnCount } = req.body;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const useMock = !apiKey || apiKey === 'your_anthropic_api_key_here';

  if (useMock) {
    console.log(`[MOCK] phase=${phase} message_type=${message_type}`);
    await new Promise(r => setTimeout(r, 900 + Math.random() * 600));

    let result;
    if (message_type === 'start')             result = MOCK.start(phase, problemTitle || 'Movie Booking App');
    else if (message_type === 'generate_feedback') result = MOCK.feedback(phase);
    else {
      const lastUser = messages?.findLast?.(m => m.role === 'user');
      const userText = typeof lastUser?.content === 'string'
        ? lastUser.content
        : lastUser?.content?.find?.(b => b.type === 'text')?.text || '';
      result = MOCK.respond(phase, userText, turnCount || 0);
    }
    return res.json(result);
  }

  // Live mode
  try {
    console.log(`[LIVE] phase=${phase} message_type=${message_type} msgs=${messages?.length}`);
    let raw;
    try {
      raw = await callClaude(systemPrompt, messages, apiKey);
    } catch (err) {
      console.warn('Claude first attempt failed, retrying...', err.message);
      await new Promise(r => setTimeout(r, 1500));
      raw = await callClaude(systemPrompt, messages, apiKey);
    }

    const parsed = safeParseJSON(raw);
    if (!parsed) return res.json({ proceed_to_next_step: false, summary: '', response: raw });
    return res.json(parsed);
  } catch (err) {
    console.error('Claude API error:', err.response?.data || err.message);
    return res.status(500).json({ error: 'Claude API failed', details: err.message });
  }
});

app.get('/api/health', (_, res) =>
  res.json({ ok: true, mock: !process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_anthropic_api_key_here' })
);

app.listen(PORT, () => console.log(`JARVIS backend on :${PORT} | mock=${!process.env.ANTHROPIC_API_KEY}`));
