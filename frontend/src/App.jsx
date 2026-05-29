import React, { useState, useRef, useCallback } from 'react';
import LandingScreen    from './components/LandingScreen';
import InterviewScreen  from './components/InterviewScreen';
import FeedbackModal    from './components/FeedbackModal';

const API = 'http://localhost:5000/api/interview';

const SWE_MASTER_PROMPT = `You are an elite Software Engineering (SWE) Interviewer conducting a rigorous, comprehensive technical interview for a Software Engineer (SDE) position. 

The entire interview takes place in a single continuous conversation ("in one go") through 6 structured stages:
1. DSA (Data Structures & Algorithms): Ask a relevant DSA/coding problem first. Probe their complexity analysis (Big-O time & space) and boundary constraints.
2. Candidate Projects: Ask the candidate to write/describe the projects they have built in their career. Once they respond, you must ask exactly 2 to 3 deep technical follow-up questions exploring their project architecture, service boundaries, database choices, or engineering bottlenecks.
3. JavaScript & Language Fundamentals: Transition to and ask a deep JavaScript or core programming language concept (e.g., closures, event loop execution, prototypes, prototypes inheritance, concurrency models, promises).
4. React & Frontend Concepts: Transition to and ask about advanced React/frontend engineering (e.g., Virtual DOM reconciliation diffing, state batching, custom hooks lifecycle, rendering performance, client caching).
5. Backend, Database & API Design: Transition to and ask a backend engineering question (e.g., database schema design, transactions, indexing trade-offs, ACID properties, API design, rate-limiting, system scale).
6. HR + Behavioral + Communication: Conclude by asking standard HR/behavioral questions (e.g., strengths and weaknesses, why we should hire you, managing technical debt under strict deadlines, resolving team conflicts).

Evaluation Rules:
- DO NOT expect exact pre-defined answers. Analyze their logic and communication.
- ERROR CORRECTION: If the user is completely wrong, correct them politely, explain the correct concept clearly, and then ask a related question.
- DYNAMIC GUIDANCE: If they are slightly correct or on the right track, do not give away the solution. Instead, ask a guided follow-up question to lead them to the optimal solution.
- Transitions must feel like a natural conversation. Lead the candidate smoothly between the stages.
- Never give candidate-level direct final ratings or final marks during the interview conversation.

You must reply ONLY in this JSON format:
{
  "proceed_to_next_step": boolean,
  "stage": number,
  "summary": string,
  "response": string
}

- "stage" is the current active stage number (1: DSA, 2: Projects, 3: JS, 4: React, 5: Backend, 6: HR). Update it dynamically as you guide the candidate.
- "proceed_to_next_step" is false throughout the interview, and must be set to true ONLY when Stage 6 is fully completed and the interview is concluded.
- "summary" is a running summary of candidate's technical strengths and gaps for each stage. Keep it empty unless transition occurs or feedback is compiled.

When message_type is "generate_feedback", you must review the entire conversation history and return a structured markdown feedback JSON representing a compiled review of the 6 stages in the following JSON format:
{
  "dsa": "markdown review of DSA stage",
  "projects": "markdown review of projects stage",
  "javascript": "markdown review of JS stage",
  "react": "markdown review of React stage",
  "backend": "markdown review of backend stage",
  "behavioral": "markdown review of HR/behavioral stage"
}
`;

const STAGE_NAMES = { 
  1: 'DSA & Algorithms', 
  2: 'Candidate Projects', 
  3: 'JS Fundamentals', 
  4: 'React & Frontend', 
  5: 'Backend & API Design', 
  6: 'HR & Behavioral' 
};

// ── helpers ───────────────────────────────────────────────────────────────────

async function callAPI(body) {
  const r = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function callWithRetry(body) {
  try { return await callAPI(body); }
  catch {
    await new Promise(r => setTimeout(r, 1500));
    return callAPI(body);
  }
}

// build the user content to send to Claude depending on phase
function buildUserContent(messageType, text) {
  return JSON.stringify({ message_type: messageType, content: text });
}

// build messages array to send
function buildMessages(history, newUserContent, base64Img) {
  const userMsg = base64Img
    ? { role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: base64Img } },
        { type: 'text', text: newUserContent },
      ]}
    : { role: 'user', content: newUserContent };

  return [...history, userMsg];
}

// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [screen,       setScreen]       = useState('landing');
  const [session,      setSession]      = useState(null);   // { name, problem }
  const [stage,        setStage]        = useState(1);
  const [messages,     setMessages]     = useState([]);     // UI messages: { role, text }
  const [apiHistory,   setApiHistory]   = useState([]);     // raw history for current phase
  const [isLoading,    setIsLoading]    = useState(false);
  const [isSpeaking,   setIsSpeaking]   = useState(false);
  const [reqSummary,   setReqSummary]   = useState('');
  const [feedback,     setFeedback]     = useState({ dsa: '', projects: '', javascript: '', react: '', backend: '', behavioral: '' });
  const [fbOpen,       setFbOpen]       = useState(false);
  const [fbLoading,    setFbLoading]    = useState(false);
  const [errorToast,   setErrorToast]   = useState('');

  // Immersive settings states
  const [aiProvider,   setAiProvider]   = useState(() => localStorage.getItem('jarvis_ai_provider') || 'anthropic');
  const [aiApiKey,     setAiApiKey]     = useState(() => localStorage.getItem('jarvis_ai_apikey') || '');
  
  // Immersive transition states
  const [isCollapsing, setIsCollapsing] = useState(false);
  const [isExpanding,  setIsExpanding]  = useState(false);
  const [singularity,  setSingularity]  = useState(false);
  
  const turnCount = useRef(0);
  const completeRef = useRef(null); // avoids stale closure when referencing handleInterviewComplete

  const toast = msg => { setErrorToast(msg); setTimeout(() => setErrorToast(''), 3500); };

  // ── start interview ──────────────────────────────────────────────────────
  const handleStart = useCallback(async ({ name, problem }) => {
    setSession({ name, problem });
    setIsCollapsing(true);
    setSingularity(true);

    // Trigger api call in background to completely hide API latency!
    setStage(1);
    setMessages([]);
    setApiHistory([]);
    setIsLoading(true);
    setReqSummary('');
    turnCount.current = 0;

    const startContent = JSON.stringify({
      message_type: 'start',
      content: JSON.stringify({ title: problem.title, features: problem.features, nuances: problem.nuances })
    });

    const firstMsg = { role: 'user', content: startContent };

    const apiPromise = callWithRetry({
      phase: 1,
      message_type: 'start',
      systemPrompt: SWE_MASTER_PROMPT,
      messages: [firstMsg],
      problemTitle: problem.title,
      turnCount: 0,
      customProvider: aiProvider,
      customApiKey: aiApiKey,
    }).then(result => {
      const text = result.response || `Hello! Let's begin the technical interview for ${problem.title}.`;
      setMessages([{ role: 'assistant', text }]);
      setApiHistory([firstMsg, { role: 'assistant', content: JSON.stringify(result) }]);
      if (result.stage) setStage(result.stage);
    }).catch(e => {
      console.error('Start error:', e);
      toast('Connection issue, retrying...');
      const fallback = `Hello ${name}! Welcome to your Software Engineering Technical Interview. Let's start with Stage 1: DSA. Let's write a function to find a cycle in a data stream. Tell me what data structure you would use first.`;
      setMessages([{ role: 'assistant', text: fallback }]);
    }).finally(() => {
      setIsLoading(false);
    });

    // Wait 750ms for TV-off collapse animation to finish
    await new Promise(r => setTimeout(r, 750));

    // Switch screen inside DOM
    setScreen('interview');
    setIsCollapsing(false);
    setIsExpanding(true);

    // Wait another 750ms for TV-on expand animation to finish
    await new Promise(r => setTimeout(r, 750));
    setIsExpanding(false);
    setSingularity(false);
  }, [aiProvider, aiApiKey]);

  // ── send message ────────────────────────────────────────────────────────
  const handleSendMessage = useCallback(async (text, base64Img = null) => {
    if (isLoading) return;

    setMessages(prev => [...prev, { role: 'user', text }]);
    setIsLoading(true);
    turnCount.current += 1;

    const userContent = buildUserContent('learner_response', text);
    const msgs = buildMessages(apiHistory, userContent, base64Img);

    try {
      const result = await callWithRetry({
        phase: stage,
        message_type: 'learner_response',
        systemPrompt: SWE_MASTER_PROMPT,
        messages: msgs,
        problemTitle: session?.problem?.title,
        turnCount: turnCount.current,
        customProvider: aiProvider,
        customApiKey: aiApiKey,
      });

      const assistantText = result.response || '';
      setMessages(prev => [...prev, { role: 'assistant', text: assistantText }]);

      if (result.summary) {
        setReqSummary(prev => prev + '\n' + result.summary);
      }

      if (result.stage && result.stage !== stage) {
        setStage(result.stage);
      }

      const newHistory = [...msgs, { role: 'assistant', content: JSON.stringify(result) }];
      setApiHistory(newHistory);

      // ── Auto-redirect to scorecard when interview is fully complete ──
      if (result.proceed_to_next_step === true && result.stage >= 6) {
        setTimeout(() => completeRef.current?.(newHistory), 2500);
      }

    } catch (e) {
      console.error('Send error:', e);
      toast('Connection issue, retrying...');
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: 'I apologize, I had a technical issue. Could you please repeat that?'
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, stage, apiHistory, session, aiProvider, aiApiKey]);

  // ── get feedback ─────────────────────────────────────────────────────────
  const handleGetFeedback = useCallback(async () => {
    setFbOpen(true);
    setIsLoading(true);

    try {
      const content = JSON.stringify({ message_type: 'generate_feedback' });
      const result = await callWithRetry({
        phase: stage,
        message_type: 'generate_feedback',
        systemPrompt: SWE_MASTER_PROMPT,
        messages: [...apiHistory, { role: 'user', content }],
        problemTitle: session?.problem?.title,
        turnCount: turnCount.current,
        customProvider: aiProvider,
        customApiKey: aiApiKey,
      });

      let parsed = result;
      if (typeof result === 'string') {
        try { parsed = JSON.parse(result); } catch (_) {}
      }
      if (result.response) {
        try { parsed = JSON.parse(result.response); } catch (_) {}
      }

      setFeedback({
        dsa: parsed.dsa || result.response || 'Feedback unavailable.',
        projects: parsed.projects || '',
        javascript: parsed.javascript || '',
        react: parsed.react || '',
        backend: parsed.backend || '',
        behavioral: parsed.behavioral || '',
      });
    } catch (e) {
      console.error('Feedback fetch error:', e);
      setFeedback({
        dsa: 'Feedback generation failed. Please try again.',
        projects: '',
        javascript: '',
        react: '',
        backend: '',
        behavioral: '',
      });
    } finally {
      setIsLoading(false);
    }
  }, [stage, apiHistory, session, aiProvider, aiApiKey]);

  // ── auto-complete: called when AI sets proceed_to_next_step=true ─────────
  const handleInterviewComplete = useCallback(async (currentHistory) => {
    // 1. Play TV-off collapse
    setIsCollapsing(true);
    setSingularity(true);
    await new Promise(r => setTimeout(r, 750));

    // 2. Open scorecard (show loading state) while screen switches
    setFbOpen(true);
    setFbLoading(true);
    setIsCollapsing(false);
    setIsExpanding(true);
    await new Promise(r => setTimeout(r, 750));
    setIsExpanding(false);
    setSingularity(false);

    // 3. Fetch AI-generated feedback in background
    try {
      const content = JSON.stringify({ message_type: 'generate_feedback' });
      const result = await callWithRetry({
        phase: stage,
        message_type: 'generate_feedback',
        systemPrompt: SWE_MASTER_PROMPT,
        messages: [...currentHistory, { role: 'user', content }],
        problemTitle: session?.problem?.title,
        turnCount: turnCount.current,
        customProvider: aiProvider,
        customApiKey: aiApiKey,
      });

      let parsed = result;
      if (typeof result === 'string') { try { parsed = JSON.parse(result); } catch (_) {} }
      if (result.response)           { try { parsed = JSON.parse(result.response); } catch (_) {} }

      setFeedback({
        dsa:        parsed.dsa        || result.response || 'Feedback unavailable.',
        projects:   parsed.projects   || '',
        javascript: parsed.javascript || '',
        react:      parsed.react      || '',
        backend:    parsed.backend    || '',
        behavioral: parsed.behavioral || '',
      });
    } catch (e) {
      console.error('Auto-feedback error:', e);
      setFeedback({
        dsa:        'Feedback generation failed. Please try again.',
        projects:   '', javascript: '', react: '', backend: '', behavioral: '',
      });
    } finally {
      setFbLoading(false);
    }
  }, [stage, session, aiProvider, aiApiKey]);

  // Wire the ref so handleSendMessage can always call the latest version
  completeRef.current = handleInterviewComplete;

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen w-screen overflow-hidden bg-navy-950 font-sans">

      {/* Error toast */}
      {errorToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 bg-amber-500/90 text-white rounded-xl text-sm font-semibold shadow-xl flex items-center gap-2 fade-up">
          ⚠️ {errorToast}
        </div>
      )}

      {/* Singularity glow center dot overlay */}
      {singularity && (
        <div className="tv-singularity" />
      )}

      <div className={`h-full w-full ${isCollapsing ? 'animate-tv-off' : isExpanding ? 'animate-tv-on' : ''}`}>
        {screen === 'landing' ? (
          <LandingScreen onStart={handleStart} />
        ) : (
          <InterviewScreen
            session={session}
            phase={stage}
            messages={messages}
            isLoading={isLoading}
            isSpeaking={isSpeaking}
            setIsSpeaking={setIsSpeaking}
            onSendMessage={handleSendMessage}
            onGetFeedback={handleGetFeedback}
            requirementsSummary={reqSummary}
            phaseBanner={""}
            onBannerDone={() => {}}
            aiProvider={aiProvider}
            setAiProvider={setAiProvider}
            aiApiKey={aiApiKey}
            setAiApiKey={setAiApiKey}
          />
        )}
      </div>

      <FeedbackModal
        isOpen={fbOpen}
        isLoading={fbLoading}
        feedback={feedback}
        onClose={() => setFbOpen(false)}
        onRestart={() => {
          setFbOpen(false);
          setFbLoading(false);
          setScreen('landing');
          setSession(null);
          setStage(1);
          setMessages([]);
          setApiHistory([]);
          setReqSummary('');
          setFeedback({ dsa: '', projects: '', javascript: '', react: '', backend: '', behavioral: '' });
        }}
      />
    </div>
  );
}
