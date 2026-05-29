import React, { useState, useRef, useCallback } from 'react';
import LandingScreen    from './components/LandingScreen';
import InterviewScreen  from './components/InterviewScreen';
import FeedbackModal    from './components/FeedbackModal';

const API = 'http://localhost:5000/api/interview';

// ── system prompts (verbatim from spec) ──────────────────────────────────────
const PROMPTS = {
  1: `You are a Low Level Design Interviewer taking a Low Level Design interview at Flipkart for SDE-2 role. A Low Level Design Round typically has following structure:
    1. Gathering Requirements
    2. Clarifying Requirements
    3. Class Diagram
    4. Schema Design

    Your job is to take Part 1 and Part 2 of the interview, i.e., Gathering and Clarifying Requirements. Following is how the interaction between you and user should look like.

    1. At the start of the interview, you will get Metadata about the question to ask. This will contain problem title, features to must have in the requirements, typical nuances to be mindful of on those features. This will help you reply to candidate appropriately.
    2. You start by greeting the message and telling them the title of the problem.
    3. Candidate provides you suggestions of features that should be there in the design. If they directly jump to design or go out of scope of interview, bring them to correct direction.
    4. If the candidate says something outside the scope of interview, please politely ask them to get back to the agenda.
    5. When candidate provides feature suggestions, you either say "Sounds good. Let's support this in our design." or "Well. let's keep it out of scope for this interview." Use variations to not sound monotonous.
    6. When you feel candidate has suggested enough requirements, move them to Clarifying Requirements phase.
    7. When you feel candidate has spent too much time on gathering requirements (like 10 messages), move them to Clarifying Requirements phase.
    8. In Clarifying Requirements phase, candidate may ask you clarifying questions on different features.
    9. If they ask question on something that isn't a feature to be supported, tell them it is Out Of Scope.
    10. If the candidate says they are clear with requirements, move them to Class Diagram phase.
    11. When candidate has spent too much time on clarifying requirements (more than 7 messages), move them to Class Diagram phase.
    12. Never tell the answer to the candidate even if they ask.
    13. During the interview, never give feedback or the answer to the candidate.

    Candidate will interact with you in form of a JSON:
    { message_type: "start"|"learner_response"|"generate_feedback", content: string }

    You must reply only in this JSON format:
    { proceed_to_next_step: boolean, summary: string, response: string }

    proceed_to_next_step is true only when moving between phases.
    summary is empty string unless proceed_to_next_step is true or message_type is generate_feedback.
    When message_type is generate_feedback, response is detailed markdown feedback.`,

  2: null, // same as phase 1 (handled below)

  3: `You are a Low Level Design Interviewer taking a Low Level Design interview at Flipkart for SDE-2 role. A Low Level Design Round has 4 parts: Gathering Requirements, Clarifying Requirements, Class Diagram, Schema Design.

    Your job is Part 3: Class Diagram. Candidate has an Excalidraw environment to draw the diagram. You will have access to an image of the Excalidraw canvas at every turn.

    Interview structure:
    1. Start by saying: "Can you please start creating your class diagram on the screen on left? Let me know when you are done."
    2. Candidate creates diagram and replies.
    3. Ask probing questions about the diagram. Eg: "How is your design handling multiple vehicle types?", "I see you have created an Animal class, why?"
    4. Candidate makes changes and replies.
    5. When done, close by saying: "Thanks! That's all I had on Class Diagram. You can move to Schema Design now."

    Rules:
    1. Never give feedback unless message_type is generate_feedback.
    2. Never give the answer. Give only slight hints and directions.
    3. Keep responses short and crisp, ideally single sentences.
    4. Word replies as questions, not statements.
    5. Ask candidate to draw on diagram tool if needed.
    6. Ensure candidate creates classes for entities and any design patterns required.

    Candidate sends JSON: { message_type: string, requirements: string, response: string }
    You reply in JSON: { proceed_to_next_step: boolean, response: string }
    proceed_to_next_step is true when you close the Class Diagram discussion.
    When message_type is generate_feedback, response is detailed markdown feedback on class diagram phase.`,

  4: `You are a Low Level Design Interviewer taking a Low Level Design interview at Flipkart for SDE-2 role. A Low Level Design Round has 4 parts: Gathering Requirements, Clarifying Requirements, Class Diagram, Schema Design.

    Your job is Part 4: Schema Design. Evaluate the candidate's ability to create correct schema designs. A correct Schema Design follows best SQL practices like normalization. Candidate has Excalidraw to draw the schema. You will have access to an image of the canvas at every turn. You also know the requirements and class diagram from previous step.

    Interview structure:
    1. Start by saying: "Can you please start creating your schema design on the screen on left? Let me know when you are done."
    2. Candidate creates design and replies.
    3. Ask probing questions. Eg: "In which table will city details be stored?", "How are you representing the relationship between city and buses?"
    4. Candidate makes changes and replies.
    5. When done, close by saying: "Thanks! That's all I had for the interview. I will be sharing your detailed feedback soon. Best wishes!"

    Rules: Same as Class Diagram phase — no feedback unless generate_feedback, no answers, short crisp responses, question-style replies.

    Candidate sends JSON: { message_type: string, requirements: string, class_diagram_summary: string, response: string }
    You reply in JSON: { proceed_to_next_step: boolean, response: string }
    proceed_to_next_step is true when you close the Schema Design discussion.
    When message_type is generate_feedback, response is detailed markdown feedback on schema design phase.`,
};
PROMPTS[2] = PROMPTS[1]; // same prompt handles both phases 1 & 2

const PHASE_NAMES = { 1:'Gathering Requirements', 2:'Clarifying Requirements', 3:'Class Diagram', 4:'Schema Design' };

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
function buildUserContent(phase, messageType, text, reqSummary, classSummary) {
  if (phase <= 2) {
    return JSON.stringify({ message_type: messageType, content: text });
  }
  if (phase === 3) {
    return JSON.stringify({ message_type: messageType, requirements: reqSummary, response: text });
  }
  return JSON.stringify({ message_type: messageType, requirements: reqSummary, class_diagram_summary: classSummary, response: text });
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
  const [phase,        setPhase]        = useState(1);
  const [messages,     setMessages]     = useState([]);     // UI messages: { role, text }
  const [apiHistory,   setApiHistory]   = useState([]);     // raw history for current phase
  const [isLoading,    setIsLoading]    = useState(false);
  const [isSpeaking,   setIsSpeaking]   = useState(false);
  const [reqSummary,   setReqSummary]   = useState('');
  const [classSummary, setClassSummary] = useState('');
  const [phaseBanner,  setPhaseBanner]  = useState('');
  const [feedback,     setFeedback]     = useState({ req:'', class:'', schema:'' });
  const [fbOpen,       setFbOpen]       = useState(false);
  const [errorToast,   setErrorToast]   = useState('');
  
  // Immersive transition states
  const [isCollapsing, setIsCollapsing] = useState(false);
  const [isExpanding,  setIsExpanding]  = useState(false);
  const [singularity,  setSingularity]  = useState(false);
  
  const turnCount = useRef(0);

  const toast = msg => { setErrorToast(msg); setTimeout(() => setErrorToast(''), 3500); };

  // ── start interview ──────────────────────────────────────────────────────
  const handleStart = useCallback(async ({ name, problem }) => {
    setSession({ name, problem });
    setIsCollapsing(true);
    setSingularity(true);

    // Trigger api call in background to completely hide API latency!
    setPhase(1);
    setMessages([]);
    setApiHistory([]);
    setIsLoading(true);
    setReqSummary('');
    setClassSummary('');
    turnCount.current = 0;

    const startContent = JSON.stringify({
      message_type: 'start',
      content: JSON.stringify({ title: problem.title, features: problem.features, nuances: problem.nuances })
    });

    const firstMsg = { role: 'user', content: startContent };

    const apiPromise = callWithRetry({
      phase: 1,
      message_type: 'start',
      systemPrompt: PROMPTS[1],
      messages: [firstMsg],
      problemTitle: problem.title,
      turnCount: 0,
    }).then(result => {
      const text = result.response || `Hello! Let's begin the LLD interview for ${problem.title}.`;
      setMessages([{ role: 'assistant', text }]);
      setApiHistory([firstMsg, { role: 'assistant', content: JSON.stringify(result) }]);
    }).catch(e => {
      console.error('Start error:', e);
      toast('Connection issue, retrying...');
      const fallback = `Hello ${name}! Welcome to your LLD interview. Today we'll design a ${problem.title}. Please tell me the core features you'd like to include.`;
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
  }, []);

  // ── send message ────────────────────────────────────────────────────────
  const handleSendMessage = useCallback(async (text, base64Img = null) => {
    if (isLoading) return;

    setMessages(prev => [...prev, { role: 'user', text }]);
    setIsLoading(true);
    turnCount.current += 1;

    const userContent = buildUserContent(phase, 'learner_response', text, reqSummary, classSummary);
    const msgs = buildMessages(apiHistory, userContent, base64Img);

    try {
      const result = await callWithRetry({
        phase,
        message_type: 'learner_response',
        systemPrompt: PROMPTS[phase],
        messages: msgs,
        problemTitle: session?.problem?.title,
        turnCount: turnCount.current,
      });

      const assistantText = result.response || '';
      setMessages(prev => [...prev, { role: 'assistant', text: assistantText }]);

      // update summaries
      if (result.summary) {
        if (phase <= 2) setReqSummary(result.summary);
        else if (phase === 3) setClassSummary(result.summary);
      }

      // update history
      const newHistory = [...msgs, { role: 'assistant', content: JSON.stringify(result) }];
      setApiHistory(newHistory);

      // ── phase transition ──────────────────────────────────────────────
      if (result.proceed_to_next_step && phase < 4) {
        const next = phase + 1;
        setPhaseBanner(`Moving to ${PHASE_NAMES[next]}…`);

        // brief pause for banner
        await new Promise(r => setTimeout(r, 2600));

        setPhase(next);
        setApiHistory([]);
        turnCount.current = 0;

        // kick off next phase greeting
        const startContent = buildUserContent(next, 'start',
          next === 3 ? result.summary || reqSummary : next === 4 ? classSummary : '',
          result.summary || reqSummary, classSummary);

        const startMsg = { role: 'user', content: startContent };

        const startResult = await callWithRetry({
          phase: next,
          message_type: 'start',
          systemPrompt: PROMPTS[next],
          messages: [startMsg],
          problemTitle: session?.problem?.title,
          turnCount: 0,
        });

        const greeting = startResult.response || 'Let\'s proceed to the next phase.';
        setMessages(prev => [...prev, { role: 'assistant', text: greeting }]);
        setApiHistory([startMsg, { role: 'assistant', content: JSON.stringify(startResult) }]);
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
  }, [isLoading, phase, apiHistory, reqSummary, classSummary, session]);

  // ── get feedback ─────────────────────────────────────────────────────────
  const handleGetFeedback = useCallback(async () => {
    setFbOpen(true);
    setIsLoading(true);

    const fetchFeedback = async (p, extraFields = {}) => {
      try {
        const content = JSON.stringify({ message_type: 'generate_feedback', ...extraFields });
        const r = await callWithRetry({
          phase: p,
          message_type: 'generate_feedback',
          systemPrompt: PROMPTS[p],
          messages: [{ role: 'user', content }],
          problemTitle: session?.problem?.title,
          turnCount: 0,
        });
        return r.response || '';
      } catch { return 'Feedback unavailable.'; }
    };

    const [reqFb, classFb, schemaFb] = await Promise.all([
      fetchFeedback(1, { content: '' }),
      phase >= 3 ? fetchFeedback(3, { requirements: reqSummary, response: '' }) : Promise.resolve('Complete Phase 3 to unlock feedback.'),
      phase >= 4 ? fetchFeedback(4, { requirements: reqSummary, class_diagram_summary: classSummary, response: '' }) : Promise.resolve('Complete Phase 4 to unlock feedback.'),
    ]);

    setFeedback({ req: reqFb, class: classFb, schema: schemaFb });
    setIsLoading(false);
  }, [phase, reqSummary, classSummary, session]);

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
            phase={phase}
            messages={messages}
            isLoading={isLoading}
            isSpeaking={isSpeaking}
            setIsSpeaking={setIsSpeaking}
            onSendMessage={handleSendMessage}
            onGetFeedback={handleGetFeedback}
            requirementsSummary={reqSummary}
            phaseBanner={phaseBanner}
            onBannerDone={() => setPhaseBanner('')}
          />
        )}
      </div>

      <FeedbackModal
        isOpen={fbOpen}
        feedback={feedback}
        onClose={() => setFbOpen(false)}
        onRestart={() => {
          setFbOpen(false);
          setScreen('landing');
          setSession(null);
          setPhase(1);
          setMessages([]);
          setApiHistory([]);
          setReqSummary('');
          setClassSummary('');
        }}
      />
    </div>
  );
}
