import React, {
  useState, useEffect, useRef, useCallback, useMemo
} from 'react';
import { Excalidraw, exportToBlob } from '@excalidraw/excalidraw';
import { speakText, stopSpeaking, createRecognition } from '../utils/voice';

const PHASE_META = {
  1: { label: 'Gathering Requirements',  short: 'Requirements',  color: 'text-blue-400' },
  2: { label: 'Clarifying Requirements', short: 'Clarifying',    color: 'text-indigo-400' },
  3: { label: 'Class Diagram',           short: 'Class Diagram', color: 'text-violet-400' },
  4: { label: 'Schema Design',           short: 'Schema Design', color: 'text-purple-400' },
};

// ── Animated waveform ──────────────────────────────────────────────────────────
function Waveform({ color = 'bg-electric-500' }) {
  return (
    <div className="flex items-center gap-[3px] h-6">
      {[1,2,3,4,5].map(i => (
        <div key={i} className={`wave-bar ${color} rounded-full`} />
      ))}
    </div>
  );
}

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3 glass rounded-2xl rounded-tl-sm self-start">
      <div className="w-2 h-2 rounded-full bg-electric-500 dot1" />
      <div className="w-2 h-2 rounded-full bg-electric-500 dot2" />
      <div className="w-2 h-2 rounded-full bg-electric-500 dot3" />
    </div>
  );
}

// ── Chat bubble ───────────────────────────────────────────────────────────────
function Bubble({ msg, candidateName }) {
  const isJ = msg.role === 'assistant';
  return (
    <div className={`flex flex-col max-w-[84%] fade-up ${isJ ? 'self-start' : 'self-end'}`}>
      <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
        isJ
          ? 'glass text-navy-100 rounded-tl-sm'
          : 'bg-electric-600 text-white rounded-tr-sm'
      }`}>
        {msg.text}
      </div>
      <span className={`text-[10px] text-navy-600 mt-1 ${isJ ? 'ml-1' : 'mr-1 self-end'}`}>
        {isJ ? 'JARVIS' : candidateName}
      </span>
    </div>
  );
}

// ── Phase banner ──────────────────────────────────────────────────────────────
function PhaseBanner({ text, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2500); return () => clearTimeout(t); }, []);
  return (
    <div className="absolute inset-x-0 top-0 z-40 flex justify-center">
      <div className="phase-banner mt-16 px-6 py-3 bg-gradient-to-r from-electric-600 to-indigo-600 rounded-2xl text-white font-bold text-sm shadow-2xl shadow-electric-600/30 flex items-center gap-2">
        <span className="animate-pulse">⚡</span> {text}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function InterviewScreen({
  session, phase, messages, isLoading, isSpeaking, setIsSpeaking,
  onSendMessage, onGetFeedback, requirementsSummary, phaseBanner, onBannerDone
}) {
  const [inputText,     setInputText]     = useState('');
  const [isMuted,       setIsMuted]       = useState(false);
  const [micActive,     setMicActive]     = useState(false);
  const [liveText,      setLiveText]      = useState('');
  const [elapsed,       setElapsed]       = useState(0);
  const [drawerOpen,    setDrawerOpen]    = useState(false);
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);
  const [noSpeechAPI,   setNoSpeechAPI]   = useState(false);

  const bottomRef  = useRef(null);
  const recRef     = useRef(null);
  const isMutedRef = useRef(false);
  const sendRef    = useRef(null); // stable ref to latest handleSend

  isMutedRef.current = isMuted;

  // ── timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const fmtTime = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  // ── scroll to bottom on new messages ──────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // ── speak new assistant messages ───────────────────────────────────────────
  const lastSpokenIndex = useRef(-1);
  useEffect(() => {
    const last = messages.at(-1);
    if (!last || last.role !== 'assistant') return;
    const idx = messages.length - 1;
    if (idx === lastSpokenIndex.current) return;
    lastSpokenIndex.current = idx;

    speakText(last.text, {
      isMuted: isMutedRef.current,
      onStart: () => setIsSpeaking(true),
      onEnd:   () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  }, [messages]); // intentionally NOT listing isMuted

  useEffect(() => () => stopSpeaking(), []);

  // ── canvas capture ─────────────────────────────────────────────────────────
  const captureCanvas = useCallback(async () => {
    if (!excalidrawAPI || phase < 3) return null;
    try {
      const elements = excalidrawAPI.getSceneElements();
      if (!elements?.length) return null;
      const blob = await exportToBlob({
        elements,
        appState: excalidrawAPI.getAppState(),
        files:    excalidrawAPI.getFiles(),
        mimeType: 'image/png',
      });
      return new Promise(res => {
        const reader = new FileReader();
        reader.onloadend = () => res(reader.result.split(',')[1]);
        reader.onerror   = () => res(null);
        reader.readAsDataURL(blob);
      });
    } catch { return null; }
  }, [excalidrawAPI, phase]);

  // ── send message ───────────────────────────────────────────────────────────
  const handleSend = useCallback(async (text) => {
    const t = (text || inputText).trim();
    if (!t || isLoading) return;
    setInputText('');
    stopSpeaking();
    setIsSpeaking(false);
    const img = await captureCanvas();
    onSendMessage(t, img);
  }, [inputText, isLoading, captureCanvas, onSendMessage]);

  // keep sendRef always pointing to latest
  sendRef.current = handleSend;

  // ── mic toggle ─────────────────────────────────────────────────────────────
  const toggleMic = useCallback(() => {
    if (micActive) {
      recRef.current?.stop();
      return;
    }

    const rec = createRecognition({
      onInterim: t => setLiveText(t),
      onFinal:   () => {},
      onEnd: finalText => {
        setMicActive(false);
        setLiveText('');
        if (finalText) sendRef.current(finalText);
      },
      onError: err => {
        console.error('SpeechRecognition error:', err);
        setMicActive(false);
        setLiveText('');
      },
    });

    if (!rec) {
      setNoSpeechAPI(true);
      return;
    }

    recRef.current = rec;
    stopSpeaking();
    setIsSpeaking(false);
    setMicActive(true);
    setLiveText('');
    rec.start();
  }, [micActive]);

  // ── keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = e => {
      const tag = document.activeElement?.tagName;
      if (e.code === 'Space' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        toggleMic();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggleMic]);

  // ── derived ────────────────────────────────────────────────────────────────
  const meta = PHASE_META[phase] || PHASE_META[1];
  const showCanvas = phase >= 3;

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-navy-950 relative">

      {phaseBanner && <PhaseBanner text={phaseBanner} onDone={onBannerDone} />}

      {/* ══ TOP BAR ════════════════════════════════════════════════════════ */}
      <header className="h-14 shrink-0 border-b border-navy-800 bg-navy-900/80 backdrop-blur-sm flex items-center px-4 gap-4 z-10">

        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-electric-600 to-indigo-500 flex items-center justify-center text-white font-black text-sm">J</div>
          <span className="text-white font-extrabold tracking-wide hidden sm:block">JARVIS</span>
        </div>

        <div className="w-px h-5 bg-navy-700 shrink-0" />

        {/* Phase stepper */}
        <div className="flex items-center gap-1 overflow-x-auto flex-1">
          {[1,2,3,4].map(i => {
            const done   = phase > i;
            const active = phase === i;
            return (
              <React.Fragment key={i}>
                {i > 1 && <div className={`w-6 h-px shrink-0 ${done ? 'bg-electric-600' : 'bg-navy-700'}`} />}
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition-all ${
                  active ? 'bg-electric-600/20 border border-electric-600/50 text-electric-400'
                    : done ? 'text-green-400'
                    : 'text-navy-600'
                }`}>
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    active ? 'bg-electric-600 text-white'
                      : done ? 'bg-green-600 text-white'
                      : 'bg-navy-800 text-navy-600'
                  }`}>{done ? '✓' : i}</span>
                  <span className="hidden sm:block">{PHASE_META[i].short}</span>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Timer */}
          <div className="font-mono text-xs text-navy-400 bg-navy-800 rounded-lg px-2.5 py-1 border border-navy-700">
            ⏱ {fmtTime(elapsed)}
          </div>

          {/* Requirements drawer toggle */}
          <button id="req-drawer-btn" onClick={() => setDrawerOpen(v => !v)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              drawerOpen ? 'bg-electric-600/20 border-electric-600/50 text-electric-400'
                : 'border-navy-700 text-navy-400 hover:text-white hover:bg-navy-800'
            }`}>
            📋 Req's
          </button>

          {/* Mute */}
          <button id="mute-btn" onClick={() => { setIsMuted(m => { if (!m) stopSpeaking(); return !m; }); }}
            className={`p-2 rounded-xl border transition-all ${
              isMuted ? 'bg-red-500/10 border-red-500/40 text-red-400'
                : 'border-navy-700 text-navy-400 hover:text-white hover:bg-navy-800'
            }`}
            title={isMuted ? 'Unmute JARVIS' : 'Mute JARVIS'}>
            {isMuted ? '🔇' : '🔊'}
          </button>
        </div>
      </header>

      {/* ══ BODY ═══════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex overflow-hidden">

        {/* LEFT: Excalidraw canvas */}
        {showCanvas && (
          <div className="flex-1 border-r border-navy-800 flex flex-col bg-[#121212] relative">
            <div className="absolute top-2 left-2 z-10 pointer-events-none">
              <span className="glass-blue text-[10px] px-2.5 py-1 rounded-lg text-electric-400 font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-electric-500 animate-pulse" />
                {meta.label} · Canvas
              </span>
            </div>
            <div className="flex-1">
              <Excalidraw
                excalidrawAPI={api => setExcalidrawAPI(api)}
                theme="dark"
                initialData={{ appState: { theme: 'dark', viewBackgroundColor: '#0d1117' } }}
              />
            </div>
          </div>
        )}

        {/* RIGHT: Conversation panel */}
        <div className={`flex flex-col ${showCanvas ? 'w-[420px] shrink-0' : 'flex-1'} h-full bg-navy-950`}>

          {/* Phase badge */}
          <div className="shrink-0 px-4 py-2 border-b border-navy-800 bg-navy-900/50 flex items-center gap-2">
            <span className={`text-xs font-bold ${meta.color}`}>Phase {phase}</span>
            <span className="text-navy-700">·</span>
            <span className="text-xs text-navy-400">{meta.label}</span>
          </div>

          {/* No speech API warning */}
          {noSpeechAPI && (
            <div className="shrink-0 px-4 py-2 bg-amber-500/10 border-b border-amber-500/30 text-amber-400 text-xs flex items-center gap-2">
              ⚠️ Voice input not supported in this browser — use text input instead.
            </div>
          )}

          {/* ── Messages ── */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">

            {/* Context card */}
            {messages.length === 0 && !isLoading && (
              <div className="glass-blue rounded-2xl p-4 text-xs text-navy-300 leading-relaxed">
                <p className="font-bold text-electric-400 mb-1.5 text-sm">🎯 {session.problem.title}</p>
                <p>JARVIS will conduct your LLD interview in 4 phases. Respond naturally — via voice or text.</p>
              </div>
            )}

            {messages.map((msg, i) => (
              <Bubble key={i} msg={msg} candidateName={session.name} />
            ))}

            {isLoading && (
              <div className="self-start fade-up">
                <TypingDots />
                <span className="text-[10px] text-navy-700 mt-1 ml-1">JARVIS is thinking…</span>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* ── JARVIS orb + waveform ── */}
          <div className="shrink-0 border-t border-navy-800 bg-navy-900/50 px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-electric-500 to-indigo-600 flex items-center justify-center text-white font-black text-base transition-all duration-300 ${isSpeaking ? 'orb-speak' : 'orb-idle'}`}>
                J
              </div>
              <div>
                <p className="text-xs font-bold text-white">JARVIS</p>
                <p className="text-[10px] text-navy-500">
                  {isSpeaking ? 'Speaking…' : micActive ? 'Listening…' : 'Ready'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isSpeaking && <Waveform color="bg-electric-500" />}
              {micActive   && <Waveform color="bg-red-400" />}
              {!isSpeaking && !micActive && (
                <span className="text-[10px] text-navy-600 bg-navy-800 border border-navy-700 px-2 py-0.5 rounded-full font-mono">[Space] mic</span>
              )}
            </div>
          </div>

          {/* ── Input area ── */}
          <div className="shrink-0 p-3 border-t border-navy-800 bg-navy-900 flex flex-col gap-2">

            {/* Live transcript */}
            {micActive && (
              <div className="fade-up bg-red-500/5 border border-red-500/20 rounded-xl px-3 py-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                  <span className="text-[10px] font-bold text-red-400">Listening…</span>
                </div>
                <p className="text-xs text-navy-200 italic min-h-[16px]">{liveText || 'Say something…'}</p>
              </div>
            )}

            <div className="flex items-center gap-2">
              {/* Mic button */}
              <button
                id="mic-btn"
                onClick={toggleMic}
                disabled={isLoading}
                title={micActive ? 'Stop recording (Space)' : 'Start voice input (Space)'}
                className={`shrink-0 p-3 rounded-xl border transition-all active:scale-95 disabled:opacity-40 ${
                  micActive
                    ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/20 animate-pulse'
                    : 'border-navy-700 bg-navy-950 text-navy-400 hover:text-white hover:border-navy-600'
                }`}>
                {micActive ? '⏹' : '🎙️'}
              </button>

              {/* Text input */}
              <input
                id="message-input"
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                disabled={isLoading}
                placeholder={micActive ? 'Listening via mic…' : 'Type your answer or press Space to speak…'}
                className="flex-1 min-w-0 bg-navy-950 border border-navy-700 focus:border-electric-500 focus:outline-none focus:ring-2 focus:ring-electric-500/20 rounded-xl px-4 py-3 text-sm text-white placeholder-navy-600 disabled:opacity-40 transition-all"
              />

              {/* Send button */}
              <button
                id="send-btn"
                onClick={() => handleSend()}
                disabled={!inputText.trim() || isLoading}
                className="shrink-0 p-3 bg-electric-600 hover:bg-electric-500 text-white rounded-xl active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                ➤
              </button>
            </div>

            {/* Footer row */}
            <div className="flex justify-between items-center text-[10px] px-0.5">
              <span className="text-navy-700">Flipkart SDE-2 · LLD Mock</span>
              <button
                id="feedback-btn"
                onClick={onGetFeedback}
                className="text-electric-500 hover:text-electric-400 font-semibold flex items-center gap-1 transition-colors">
                🏆 Get Scorecard
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* ══ REQUIREMENTS DRAWER ═════════════════════════════════════════════ */}
      <div className={`fixed inset-y-0 right-0 z-30 w-72 bg-navy-900 border-l border-navy-800 flex flex-col shadow-2xl transition-transform duration-300 ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-4 border-b border-navy-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">📋 Requirements</h3>
          <button onClick={() => setDrawerOpen(false)} className="text-navy-500 hover:text-white text-lg leading-none">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 text-xs">
          <div>
            <p className="text-[10px] font-bold text-navy-600 uppercase tracking-wider mb-1">Problem</p>
            <p className="text-white font-semibold">{session.problem.title}</p>
          </div>
          {requirementsSummary ? (
            <div>
              <p className="text-[10px] font-bold text-navy-600 uppercase tracking-wider mb-1.5">Finalized Requirements</p>
              <p className="text-navy-300 leading-relaxed whitespace-pre-wrap">{requirementsSummary}</p>
            </div>
          ) : (
            <div className="border border-dashed border-navy-800 rounded-xl p-4 text-center text-navy-600">
              Requirements will appear here after Phase 1 & 2.
            </div>
          )}
          <div>
            <p className="text-[10px] font-bold text-navy-600 uppercase tracking-wider mb-1.5">Nuances to Remember</p>
            <ul className="list-disc pl-4 text-navy-400 flex flex-col gap-1">
              {session.problem.nuances.map((n,i) => <li key={i}>{n}</li>)}
            </ul>
          </div>
        </div>
      </div>

    </div>
  );
}
