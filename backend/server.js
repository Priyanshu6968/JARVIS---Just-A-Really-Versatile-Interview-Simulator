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
  return words.length > 0 && lower.length > 3;
}

function pick(arr, seed) {
  return arr[Math.abs(seed || Math.floor(Math.random() * 100)) % arr.length];
}

const MOCK = {
  // ── Stage 1: DSA & Algorithms ──
  startPhase1(title) {
    return {
      proceed_to_next_step: false,
      stage: 1,
      summary: '',
      response: `Hello! Welcome to your Software Engineering Technical Interview. I'm your interviewer today.\n\nWe'll be conducting this interview across 6 core SWE areas in one go. You have an interactive Excalidraw canvas on the left that you can use at any time as a scratchpad.\n\nLet's start with **Stage 1: DSA & Algorithms**.\n\nCould you write a function to detect if a cycle exists in a singly linked list? Tell me what algorithm you would use, what time and space complexities it has, and any edge cases you'd validate.`
    };
  },

  respondPhase1(userText, turnCount) {
    const txt = (userText || '').toLowerCase();

    if (isOffTopic(txt)) {
      return {
        proceed_to_next_step: false,
        stage: 1,
        summary: '',
        response: pick(OFFTRACK_RESPONSES, turnCount),
      };
    }

    const wantsNext = txt.includes('project') || txt.includes('next') ||
      txt.includes('move on') || txt.includes("that's all") ||
      txt.includes("that covers") || txt.includes('enough') || txt.includes('done');

    if (wantsNext || turnCount >= 3) {
      return {
        proceed_to_next_step: false,
        stage: 2,
        summary: 'DSA completed. Selected Floyds cycle detection with O(N) time and O(1) space constraints.',
        response: "Excellent work on the DSA section! Let's proceed to **Stage 2: Candidate Projects**.\n\nPlease write or describe the projects you have built in your career. Tell me about their primary technical stacks, architectures, and main engineering objectives.",
      };
    }

    const screeningEncouragements = [
      "Excellent. Let's definitely support Floyd's Tortoise and Hare approach. How would you handle pointer boundaries to prevent NullPointerExceptions?",
      "Good thinking — that handles the cycle search. What would be the space-time trade-off if we used a Hash Set instead?",
      "Yes, that's exactly O(1) auxiliary space. If the linked list structure was read-only, would your logic still hold?",
    ];

    return {
      proceed_to_next_step: false,
      stage: 1,
      summary: '',
      response: pick(screeningEncouragements, turnCount),
    };
  },

  // ── Stage 2: Candidate Projects ──
  startPhase2() {
    return {
      proceed_to_next_step: false,
      stage: 2,
      summary: '',
      response: "Let's move to Stage 2: Candidate Projects. Please write or describe the projects you have built in your career, their technical stacks, and primary architectural goals.",
    };
  },

  respondPhase2(userText, turnCount) {
    const txt = (userText || '').toLowerCase();

    if (isOffTopic(txt)) {
      return {
        proceed_to_next_step: false,
        stage: 2,
        summary: '',
        response: pick(OFFTRACK_RESPONSES, turnCount),
      };
    }

    if (turnCount === 0) {
      return {
        proceed_to_next_step: false,
        stage: 2,
        summary: '',
        response: "That sounds like a highly robust implementation! Let's deep dive: How did you design the microservice boundaries, and how did you guarantee consistent data replication across service lines?",
      };
    }

    if (turnCount === 1) {
      return {
        proceed_to_next_step: false,
        stage: 2,
        summary: '',
        response: "Excellent. Regarding DB bottlenecks under peak write load: What database choice did you make, what indexing keys did you select, and how did you manage lock contention?",
      };
    }

    return {
      proceed_to_next_step: false,
      stage: 3,
      summary: 'Projects deep-dive completed. Described system stack and answered 2 follow-up architecture questions with solid technical arguments.',
      response: "Excellent project review! Let's move to **Stage 3: JavaScript & Language Fundamentals**.\n\nCould you explain the difference between microtasks and macrotasks in the JS event loop, and how closures utilize lexical scope?",
    };
  },

  // ── Stage 3: JS Fundamentals ──
  startPhase3() {
    return {
      proceed_to_next_step: false,
      stage: 3,
      summary: '',
      response: "Let's move to Stage 3: JavaScript & Language Fundamentals. Can you explain the difference between microtasks and macrotasks in the JS event loop, and how closures utilize lexical scope?",
    };
  },

  respondPhase3(userText, turnCount) {
    const txt = (userText || '').toLowerCase();

    if (isOffTopic(txt)) {
      return {
        proceed_to_next_step: false,
        stage: 3,
        summary: '',
        response: "Let's stay focused on JavaScript language fundamentals. Tell me about closures or scope chains.",
      };
    }

    const wantsNext = txt.includes('react') || txt.includes('frontend') ||
      txt.includes('next') || txt.includes('move') || turnCount >= 3;

    if (wantsNext) {
      return {
        proceed_to_next_step: false,
        stage: 4,
        summary: 'JS completed. Mapped event loop microtask priorities and closures correctly.',
        response: "Exceptional language fundamentals! Let's move to **Stage 4: React & Frontend Concepts**.\n\nPlease explain how the Virtual DOM reconciliation algorithm works in React, and how state batching optimizes render cycles.",
      };
    }

    const jsProbes = [
      "Good explanation of microtasks. In what order would a Promise callback, a setTimeout, and a process.nextTick execute?",
      "Excellent. How do closures prevent garbage collection of their outer lexical environment, and is that a memory concern?",
      "That's exactly right. Can you explain how prototypal inheritance works and how it differs from class-based inheritance?",
    ];

    return {
      proceed_to_next_step: false,
      stage: 3,
      summary: '',
      response: pick(jsProbes, turnCount),
    };
  },

  // ── Stage 4: React & Frontend Concepts ──
  startPhase4() {
    return {
      proceed_to_next_step: false,
      stage: 4,
      summary: '',
      response: "Please explain how the Virtual DOM reconciliation algorithm works in React, and how state batching optimizes render cycles.",
    };
  },

  respondPhase4(userText, turnCount) {
    const txt = (userText || '').toLowerCase();

    if (isOffTopic(txt)) {
      return {
        proceed_to_next_step: false,
        stage: 4,
        summary: '',
        response: "Let's stay focused on React frontend concepts. What hooks or component lifecycle details are you considering?",
      };
    }

    const wantsNext = txt.includes('backend') || txt.includes('db') || txt.includes('next') ||
      txt.includes('move') || turnCount >= 3;

    if (wantsNext) {
      return {
        proceed_to_next_step: false,
        stage: 5,
        summary: 'React completed. Outlined fiber reconciliation and automatic state batching.',
        response: "Incredible frontend depth! Let's proceed to **Stage 5: Backend & Database Design**.\n\nExplain your database indexing strategies (e.g. B-Tree vs Hash index), ACID consistency properties, and how you would design a robust rate-limiter for your REST APIs.",
      };
    }

    const reactProbes = [
      "Excellent. How does React's key prop optimize the reconciliation diffing algorithm under lists?",
      "Good point. How does the custom hooks lifecycle tie into fiber rendering, and what are the rules of hooks?",
      "That makes sense. Can you explain the difference between client-side state hooks (useState) and reference hooks (useRef) in terms of component re-renders?",
    ];

    return {
      proceed_to_next_step: false,
      stage: 4,
      summary: '',
      response: pick(reactProbes, turnCount),
    };
  },

  // ── Stage 5: Backend & Database Design ──
  startPhase5() {
    return {
      proceed_to_next_step: false,
      stage: 5,
      summary: '',
      response: "Let's move to Stage 5: Backend & Database Design. Explain database indexing strategies (e.g. B-Tree vs Hash index), ACID consistency properties, and how you would design a robust rate-limiter for your REST APIs.",
    };
  },

  respondPhase5(userText, turnCount) {
    const txt = (userText || '').toLowerCase();

    if (isOffTopic(txt)) {
      return {
        proceed_to_next_step: false,
        stage: 5,
        summary: '',
        response: "Let's stay focused on Backend engineering. What API patterns or database structures are you choosing?",
      };
    }

    const wantsNext = txt.includes('behavioral') || txt.includes('hr') || txt.includes('next') ||
      txt.includes('move') || turnCount >= 3;

    if (wantsNext) {
      return {
        proceed_to_next_step: false,
        stage: 6,
        summary: 'Backend completed. Selected postgres indexing, outlined token-bucket rate limiter schemas.',
        response: "Outstanding backend review! Let's conclude with **Stage 6: HR & Behavioral / Communication**.\n\nPlease describe your core technical strengths and weaknesses, and why we should hire you for this role.",
      };
    }

    const backendProbes = [
      "That is a robust indexing choice. How do B-Trees optimize range query scans compared to Hash indexes?",
      "Excellent. How do you implement distributed transactions across separate databases while maintaining ACID boundaries?",
      "Very good. How would you design a token-bucket or sliding-window rate limiter using Redis to handle API spikes?",
    ];

    return {
      proceed_to_next_step: false,
      stage: 5,
      summary: '',
      response: pick(backendProbes, turnCount),
    };
  },

  // ── Stage 6: HR & Behavioral ──
  startPhase6() {
    return {
      proceed_to_next_step: false,
      stage: 6,
      summary: '',
      response: "Let's conclude with Stage 6: HR & Behavioral / Communication. Please describe your core technical strengths and weaknesses, and why we should hire you for this role.",
    };
  },

  respondPhase6(userText, turnCount) {
    const txt = (userText || '').toLowerCase();

    if (isOffTopic(txt)) {
      return {
        proceed_to_next_step: false,
        stage: 6,
        summary: '',
        response: "Let's stay focused on behavioral and HR questions. Tell me about your team alignment.",
      };
    }

    const wantsDone = txt.includes('done') || txt.includes('finish') ||
      txt.includes('complete') || txt.includes('that') || txt.includes('all') ||
      turnCount >= 3;

    if (wantsDone) {
      return {
        proceed_to_next_step: true,
        stage: 6,
        summary: 'Behavioral completed. Full interview concluded successfully.',
        response: "Thank you so much! That is all I had for this Software Engineering interview. I've compiled your consolidated technical and behavioral scorecard. Click **Get Scorecard** to view your detailed evaluations.",
      };
    }

    const hrProbes = [
      "Excellent reflection. Can you tell me about a highly challenging technical conflict you resolved in a previous project?",
      "Very mature. How do you negotiate tech debt tradeoffs under extremely strict release deadlines?",
      "Good alignment. If you had to choose a single core technical value that defines your SWE journey, what would it be?",
    ];

    return {
      proceed_to_next_step: false,
      stage: 6,
      summary: '',
      response: pick(hrProbes, turnCount),
    };
  },

  // ── Feedback ──
  feedback(phase) {
    const fb = {
      dsa: `## DSA & Algorithmic Feedback\n\n**Overall Rating: Strong (4.5/5)** ⭐⭐⭐⭐½\n\n---\n\n### Stage 1 — DSA & Algorithms\n\n#### ✅ What Went Well\n- Demonstrated exceptional mastery of core pointer logic and space optimization.\n- Correctly implemented Floyd's Tortoise & Hare cycle detection, minimizing auxiliary space bounds.\n- Handled empty list head checks and boundary conditions smoothly.\n\n#### ⚠️ Areas to Improve\n- Could have discussed structural modification bounds when dealing with multithreaded linked streams.`,
      projects: `## Project Tech & Nuances Feedback\n\n**Overall Rating: Excellent (4.5/5)** ⭐⭐⭐⭐½\n\n---\n\n### Stage 2 — Candidate Projects\n\n#### ✅ What Went Well\n- Highly technical review of microservice boundary separations and distributed systems constraints.\n- Correctly answered database partition bottleneck probes under peak write load.\n- Excellent discussion of service-to-service communication pathways.\n\n#### ⚠️ Areas to Improve\n- Proactively illustrating service sequence fallback blocks or circuit breakers increases design scores.`,
      javascript: `## JS & Language Fundamentals Feedback\n\n**Overall Rating: Strong (4/5)** ⭐⭐⭐⭐\n\n---\n\n### Stage 3 — JavaScript & Language Fundamentals\n\n#### ✅ What Went Well\n- Thorough understanding of Event Loop priorities (Promise microtasks vs Timer macrotasks).\n- Correct explanation of closure references and outer lexical environments.\n- Discussed prototypal inheritance structures and key decoupling differences from classical models.\n\n#### ⚠️ Areas to Improve\n- Could explore event delegation event capturing vs bubbling lifecycles more proactively.`,
      react: `## React & Frontend Concepts Feedback\n\n**Overall Rating: Excellent (4.5/5)** ⭐⭐⭐⭐½\n\n---\n\n### Stage 4 — React & Frontend Concepts\n\n#### ✅ What Went Well\n- Masterful breakdown of fiber Virtual DOM reconciliation diff rules.\n- Understood state batching and paint rendering cycle thresholds.\n- Accurate explanation of custom hooks mounting rules and state hooks side-effects.\n\n#### ⚠️ Areas to Improve\n- Clearly identifying bundle optimization strategies (dynamic lazy-loading imports) increases structural scores.`,
      backend: `## Backend, Database & API Design Feedback\n\n**Overall Rating: Strong (4/5)** ⭐⭐⭐⭐\n\n---\n\n### Stage 5 — Backend, Database & API Design\n\n#### ✅ What Went Well\n- Selected Postgres for transaction isolation guarantees, and Redis memory caches for read mitigation.\n- Robust Sliding-window rate limiter design using Redis composite memory structures.\n- Accurate distinction between B-Tree indexing ranges and Hash index lookup limits.\n\n#### ⚠️ Areas to Improve\n- Dead-letter queues and transaction rollback strategies should be explicitly mapped out under network partitions.`,
      behavioral: `## Behavioral & HR Feedback\n\n**Overall Rating: Outstanding (5/5)** ⭐⭐⭐⭐⭐\n\n---\n\n### Stage 6 — HR & Behavioral / Communication\n\n#### ✅ What Went Well\n- Outstanding verbal alignment, ownership, and tech maturity.\n- Proactively discussed resolving architectural team conflict using objective proof-of-concept metrics.\n- High accountability regarding technical strengths and weakness compromises.\n\n#### ⚠️ Areas to Improve\n- Keep practicing concise delivery to business stakeholders when negotiating strict timelines.`
    };
    return { proceed_to_next_step: false, summary: '', response: JSON.stringify(fb) };
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
