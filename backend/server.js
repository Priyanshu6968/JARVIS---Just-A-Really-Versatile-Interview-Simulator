const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '20mb' }));

// ─── JSON helpers ──────────────────────────────────────────────────────────────
function stripFences(text) {
  return text.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}

function safeParseJSON(raw) {
  try { return JSON.parse(raw); } catch (_) {}
  const s = stripFences(raw);
  try { return JSON.parse(s); } catch (_) {}
  const m = s.match(/\{[\s\S]*\}/);
  if (m) try { return JSON.parse(m[0]); } catch (_) {}
  return null;
}

// ─── SMART MOCK ENGINE ─────────────────────────────────────────────────────────
// Detects whether a response is relevant to an LLD interview

const LLD_KEYWORDS = [
  'book','booking','movie','ticket','seat','user','payment','cancel','refund','search',
  'theatre','theater','show','screen','schedule','notification','review','rating','class',
  'database','schema','table','entity','design','feature','requirement','system','service',
  'api','interface','method','attribute','property','inherit','extend','implement','pattern',
  'singleton','factory','observer','strategy','queue','cache','concurrent','lock','transaction',
  'sql','nosql','index','primary key','foreign key','normalize','column','row','query',
  'parking','slot','vehicle','car','bike','floor','level','entry','exit','ticket',
  'splitwise','expense','group','split','settle','balance','debt','amount','percentage',
  'login','auth','authentication','register','profile','wallet','status','type','category',
  'city','location','address','availability', 'capacity', 'map','price','rate',
  'upload','image','video','recommendation','genre','director','actor','language','duration',
  'multiple','single','support','add','remove','update','delete','create','manage','handle',
  'real time','realtime','concurrent','distributed','scalable','microservice','event',
  'yes', 'sure', 'okay', 'ok', 'agree', 'good', 'done', 'next', 'move', 'clarify', 'clear',
  'what', 'how', 'why', 'when', 'which', 'where', 'can', 'should', 'will', 'would', 'could',
  'need', 'want', 'think', 'believe', 'suggest', 'propose', 'consider', 'include', 'support',
  'also', 'another', 'other', 'more', 'additional', 'further', 'plus', 'and', 'or',
];

const OFFTRACK_RESPONSES = [
  "That doesn't seem related to our LLD interview. Let's stay focused — what features do you think this system should support?",
  "Hmm, I'm not sure that's relevant to the design. Let's get back on track — what are the core requirements you see?",
  "Let's keep our focus on the system design. What key features would you like to include in the architecture?",
  "That's outside the scope of our interview. Let's continue — what design considerations do you have in mind?",
];

const ENCOURAGE_RESPONSES_P1 = [
  "Solid choice. Let's definitely support that. What else should be part of the core design?",
  "Good thinking — that's an important feature. Are there any other capabilities you'd want to include?",
  "Agreed, that's a good requirement to have. Any other core features come to mind?",
  "That makes sense for this system. What other features do you think are essential?",
  "Yes, we'll want to support that. Can you think of any edge cases or additional features worth including?",
];

const CLARIFY_RESPONSES = [
  "Good question. For that feature, let me clarify — the system will support concurrent access with optimistic locking to prevent double booking. Any other questions?",
  "Great clarification question. The system will handle that via a state machine with defined transitions. What else would you like to clarify?",
  "Good point to raise. We'll rely on event-driven processing for that, with appropriate retry logic. Any other clarifications needed?",
  "That's worth clarifying. We'll use a queue-based approach with idempotency keys to handle that scenario safely. Anything else?",
];

function isOffTopic(text) {
  const lower = (text || '').toLowerCase().trim();
  if (!lower || lower.length < 2) return false;
  const words = lower.split(/\s+/);
  const matched = words.filter(w => LLD_KEYWORDS.some(kw => w.includes(kw) || kw.includes(w)));
  // If less than 15% of words match any LLD keyword, it's off-topic
  return words.length > 0 && (matched.length / words.length) < 0.15 && lower.length > 3;
}

function pick(arr, seed) {
  return arr[Math.abs(seed || Math.floor(Math.random() * 100)) % arr.length];
}

const MOCK = {
  // ── Phase 1 & 2 start greeting ──
  startPhase1(title) {
    return {
      proceed_to_next_step: false,
      summary: '',
      response: `Hello! Welcome to your Low Level Design interview at Flipkart. I'm your interviewer today.\n\nWe'll be designing a **${title}**. It's a great problem that touches on concurrency, database design, and object-oriented design patterns.\n\nLet's start by gathering requirements. Could you please tell me what core features you think this system should support?`
    };
  },

  // ── Phase 1: Gathering Requirements ──
  respondPhase1(userText, turnCount) {
    const txt = (userText || '').toLowerCase();

    // Off-topic input
    if (isOffTopic(txt)) {
      return {
        proceed_to_next_step: false,
        summary: '',
        response: pick(OFFTRACK_RESPONSES, turnCount),
      };
    }

    // User signals readiness to move on
    const wantsNext = txt.includes('clarif') || txt.includes('next') ||
      txt.includes('move on') || txt.includes('i think that') || txt.includes("that's all") ||
      txt.includes("that covers") || txt.includes('enough') || txt.includes('done');

    // Auto-transition after 5 substantial turns
    if (wantsNext || turnCount >= 5) {
      return {
        proceed_to_next_step: true,
        summary: 'Requirements gathered: search by city/theatre/date, seat selection, booking, payment processing, booking cancellation with refund, show management.',
        response: "Great work! You've covered the key requirements well. Let's move to the **Clarifying Requirements** phase.\n\nPlease ask me any clarifying questions you have about the features — constraints, edge cases, scale, etc.",
      };
    }

    return {
      proceed_to_next_step: false,
      summary: '',
      response: pick(ENCOURAGE_RESPONSES_P1, turnCount),
    };
  },

  // ── Phase 2: Clarifying Requirements ──
  startPhase2() {
    return {
      proceed_to_next_step: false,
      summary: '',
      response: "Now let's clarify the requirements. Please ask me any questions about the features, constraints, or assumptions you'd like to confirm before designing.",
    };
  },

  respondPhase2(userText, turnCount) {
    const txt = (userText || '').toLowerCase();

    if (isOffTopic(txt)) {
      return {
        proceed_to_next_step: false,
        summary: '',
        response: pick(OFFTRACK_RESPONSES, turnCount),
      };
    }

    const wantsNext = txt.includes('class') || txt.includes('diagram') || txt.includes('design') ||
      txt.includes("i'm clear") || txt.includes("i am clear") || txt.includes('clear on') ||
      txt.includes('no more') || txt.includes('ready') || txt.includes('start design') ||
      txt.includes('move') || txt.includes('next phase');

    if (wantsNext || turnCount >= 4) {
      return {
        proceed_to_next_step: true,
        summary: 'Requirements clarified: seat types (recliner/premium/normal), cancellation window 30 min for full refund, concurrent booking via optimistic locking, single active booking per user per show.',
        response: "Excellent! All requirements are now clear. Let's move to the **Class Diagram** phase.\n\nPlease open the Excalidraw canvas on the left and start drawing your class diagram. Let me know when you're done.",
      };
    }

    return {
      proceed_to_next_step: false,
      summary: '',
      response: pick(CLARIFY_RESPONSES, turnCount),
    };
  },

  // ── Phase 3: Class Diagram ──
  startPhase3(reqSummary) {
    return {
      proceed_to_next_step: false,
      summary: '',
      response: "Can you please start creating your class diagram on the screen on the left? Include the key entities, their relationships, and any design patterns you're using. Let me know when you're done.",
    };
  },

  respondPhase3(userText, turnCount) {
    const txt = (userText || '').toLowerCase();

    if (isOffTopic(txt)) {
      return {
        proceed_to_next_step: false,
        summary: '',
        response: "Let's stay focused on the class diagram. What entities have you identified so far?",
      };
    }

    const probes = [
      "I can see your diagram taking shape. How are you representing the relationship between **Movie**, **Show**, and **Theatre** in your class structure?",
      "Good start. Have you considered adding a **BookingManager** class to handle the booking workflow and concurrency?",
      "Interesting. How does your design handle different **seat types** — recliner, premium, normal? Is that captured in a separate class or an enum?",
      "I see the core entities. What **design pattern** are you using to manage booking status transitions (pending → confirmed → cancelled)?",
    ];

    const wantsDone = txt.includes('done') || txt.includes('finish') ||
      txt.includes('complete') || txt.includes('schema') || txt.includes('next') ||
      txt.includes('move') || turnCount >= 4;

    if (wantsDone) {
      return {
        proceed_to_next_step: true,
        summary: 'Class diagram completed with entities: Movie, Theatre, Show, Seat, SeatType, Booking, User, Payment, BookingManager. State pattern for booking status.',
        response: "Thanks! That's all I had on Class Diagram. You can move to **Schema Design** now.\n\nPlease clear or update the canvas for your schema diagram and let me know when you're ready.",
      };
    }

    return {
      proceed_to_next_step: false,
      summary: '',
      response: pick(probes, turnCount),
    };
  },

  // ── Phase 4: Schema Design ──
  startPhase4() {
    return {
      proceed_to_next_step: false,
      summary: '',
      response: "Can you please start creating your schema design on the screen on the left? Focus on normalized tables, primary/foreign keys, and indexing strategy. Let me know when you're done.",
    };
  },

  respondPhase4(userText, turnCount) {
    const txt = (userText || '').toLowerCase();

    if (isOffTopic(txt)) {
      return {
        proceed_to_next_step: false,
        summary: '',
        response: "Let's stay focused on the schema. Which tables have you defined so far?",
      };
    }

    const probes = [
      "In which table will you store **city** information, and how does it relate to the **Theatre** table?",
      "How are you representing the **many-to-many** relationship between Movies and Theatres through Shows?",
      "What columns would the **show_seats** table have, and how will you prevent concurrent double-booking at the row level?",
      "Have you considered adding a **composite index** on `(show_id, seat_status)` for fast seat availability queries?",
    ];

    const wantsDone = txt.includes('done') || txt.includes('finish') ||
      txt.includes('complete') || txt.includes('that') || txt.includes('all') ||
      turnCount >= 4;

    if (wantsDone) {
      return {
        proceed_to_next_step: true,
        summary: 'Schema completed with tables: users, movies, theatres, shows, seats, show_seats, bookings, payments. Proper normalization and indexing strategy defined.',
        response: "Thanks! That's all I had for the interview. I will be sharing your detailed feedback soon. **Best wishes!** 🎉\n\nClick **Get Scorecard** to see your detailed performance review.",
      };
    }

    return {
      proceed_to_next_step: false,
      summary: '',
      response: pick(probes, turnCount),
    };
  },

  // ── Feedback ──
  feedback(phase) {
    const fb = {
      1: `## Requirements Gathering & Clarification Feedback

**Overall Rating: Strong (4/5)** ⭐⭐⭐⭐

---

### Phase 1 — Gathering Requirements

#### ✅ What Went Well
- Identified the core user-facing features: search, booking, seat selection, payments
- Considered operational features like show management
- Kept scope within the problem boundaries

#### ⚠️ Areas to Improve
- Could probe earlier about **notification** features (booking confirmation, cancellation alerts)
- **Scalability constraints** (e.g. peak-time load) worth mentioning in requirements
- Should clarify assumptions about **guest bookings** vs registered users

---

### Phase 2 — Clarifying Requirements

#### ✅ What Went Well
- Good questions about concurrent booking handling
- Asked about seat type taxonomy

#### ⚠️ Areas to Improve
- Could ask about **payment failure** and retry scenarios
- **Idempotency** of booking requests — what happens on double-tap?
- Cancellation partial refund tiers (0-30min: full, 30-60min: 50%, etc.)`,

      3: `## Class Diagram Feedback

**Overall Rating: Good (3.5/5)** ⭐⭐⭐½

---

### ✅ What Went Well
- Correct core entities identified: Movie, Theatre, Show, Seat, Booking, User
- Meaningful associations between entities
- Payment as a separate entity — good separation of concerns

### ⚠️ Areas to Improve
- **Missing SeatType** as a separate class or enum — normal/premium/recliner should be explicit
- **BookingManager** singleton not present — centralizing booking logic is important
- **State pattern** for Booking status (PENDING → CONFIRMED → CANCELLED) not shown
- Thread-safety annotations missing — how do you show concurrency handling in the diagram?

### 💡 Recommended Design Patterns
- **State Pattern** for booking lifecycle
- **Strategy Pattern** for pricing (peak vs off-peak)
- **Observer Pattern** for notification triggers`,

      4: `## Schema Design Feedback

**Overall Rating: Good (3.5/5)** ⭐⭐⭐½

---

### ✅ What Went Well
- Clean separation of static (movies, seats) and dynamic (show_seats) data
- Appropriate foreign key relationships
- Booking table with status column shows good understanding

### ⚠️ Areas to Improve
- Missing **composite index** on \`(show_id, seat_status)\` — critical for seat availability queries
- \`booking_id\` should be an **idempotency key** for safe payment retries
- Should discuss **row-level locking** on \`show_seats\` to handle concurrency
- Consider **partitioning** the \`bookings\` table by date for scalability

### 💡 Recommended Indexes
\`\`\`sql
CREATE INDEX idx_show_seats ON show_seats(show_id, status);
CREATE INDEX idx_bookings_user ON bookings(user_id, created_at DESC);
CREATE UNIQUE INDEX idx_booking_idempotency ON bookings(idempotency_key);
\`\`\``
    };
    return { proceed_to_next_step: false, summary: '', response: fb[phase] || '## Feedback\n\nGood effort overall!' };
  },
};

// ─── extract user text from message content ────────────────────────────────────
function extractUserText(messages) {
  const lastUser = [...(messages || [])].reverse().find(m => m.role === 'user');
  if (!lastUser) return '';
  const c = lastUser.content;
  if (typeof c === 'string') {
    try { return JSON.parse(c).content || JSON.parse(c).response || c; } catch { return c; }
  }
  if (Array.isArray(c)) {
    const textBlock = c.find(b => b.type === 'text');
    if (!textBlock) return '';
    try { return JSON.parse(textBlock.text).response || JSON.parse(textBlock.text).content || textBlock.text; }
    catch { return textBlock.text; }
  }
  return '';
}

// ─── Mock dispatcher ───────────────────────────────────────────────────────────
function runMock(phase, messageType, messages, problemTitle, turnCount) {
  const tc = parseInt(turnCount) || 0;
  const userText = extractUserText(messages);

  if (messageType === 'generate_feedback') return MOCK.feedback(phase);

  if (messageType === 'start') {
    if (phase === 1) return MOCK.startPhase1(problemTitle || 'the system');
    if (phase === 2) return MOCK.startPhase2();
    if (phase === 3) return MOCK.startPhase3();
    if (phase === 4) return MOCK.startPhase4();
  }

  if (messageType === 'learner_response') {
    if (phase === 1) return MOCK.respondPhase1(userText, tc);
    if (phase === 2) return MOCK.respondPhase2(userText, tc);
    if (phase === 3) return MOCK.respondPhase3(userText, tc);
    if (phase === 4) return MOCK.respondPhase4(userText, tc);
  }

  return { proceed_to_next_step: false, summary: '', response: 'Please continue.' };
}

// ─── Live Claude call ──────────────────────────────────────────────────────────
async function callClaude(systemPrompt, messages, apiKey) {
  const resp = await axios.post(
    'https://api.anthropic.com/v1/messages',
    { model: 'claude-sonnet-4-20250514', max_tokens: 2048, system: systemPrompt, messages },
    {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      timeout: 35000,
    }
  );
  return resp.data.content[0].text;
}

// ─── Main route ────────────────────────────────────────────────────────────────
app.post('/api/interview', async (req, res) => {
  const { phase, systemPrompt, messages, message_type, problemTitle, turnCount } = req.body;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const useMock = !apiKey || apiKey === 'your_anthropic_api_key_here';

  // ── MOCK MODE ──
  if (useMock) {
    console.log(`[MOCK] phase=${phase} type=${message_type} turn=${turnCount} text="${extractUserText(messages).slice(0,60)}"`);
    await new Promise(r => setTimeout(r, 700 + Math.random() * 500));
    const result = runMock(phase, message_type, messages, problemTitle, turnCount);
    console.log(`[MOCK] → proceed=${result.proceed_to_next_step}`);
    return res.json(result);
  }

  // ── LIVE CLAUDE MODE ──
  console.log(`[LIVE] phase=${phase} type=${message_type} msgs=${messages?.length}`);
  try {
    let raw;
    try {
      raw = await callClaude(systemPrompt, messages, apiKey);
    } catch (e1) {
      console.warn('Claude attempt 1 failed:', e1.message, '— retrying in 1.5s');
      await new Promise(r => setTimeout(r, 1500));
      raw = await callClaude(systemPrompt, messages, apiKey);
    }

    const parsed = safeParseJSON(raw);
    if (!parsed) {
      return res.json({ proceed_to_next_step: false, summary: '', response: raw });
    }
    return res.json(parsed);
  } catch (err) {
    console.error('Claude API error:', err.response?.data || err.message);
    return res.status(500).json({ error: 'Claude API failed', details: err.message });
  }
});

app.get('/api/health', (_, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const mock = !apiKey || apiKey === 'your_anthropic_api_key_here';
  res.json({ ok: true, mode: mock ? 'mock' : 'live' });
});

app.listen(PORT, () => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const mock = !apiKey || apiKey === 'your_anthropic_api_key_here';
  console.log(`JARVIS backend :${PORT} | mode=${mock ? 'MOCK' : 'LIVE (Claude API)'}`);
});
