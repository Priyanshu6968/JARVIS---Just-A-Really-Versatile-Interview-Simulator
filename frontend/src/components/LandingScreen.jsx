import React, { useState, useEffect, useRef, useCallback } from 'react';
import Hls from 'hls.js';
import { Play, ArrowRight, Volume2, VolumeX, Sparkles, Mic, PenTool, BarChart3 } from 'lucide-react';

// Background video. Auto-detects the source type: a local/progressive file
// (mp4/webm) plays directly, while any remote ".m3u8" plays as HLS via hls.js.
// Default is a self-contained tech "data network" loop in /public.
//   • local file:  '/tech-bg.mp4'
//   • HLS stream:  'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
const VIDEO_SRC = '/tech-bg.mp4?v=4k';

// Glassmorphic-header nav links. They smooth-focus the candidate field — the
// single interactive target on this single-screen hero.
const NAV_LINKS = ['Practice', 'How it works', 'Why JARVIS'];

const HERO_PILLS = [
  { icon: Mic,       label: 'Voice-first' },
  { icon: PenTool,   label: 'Live whiteboard' },
  { icon: BarChart3, label: 'Instant scorecard' },
];

// ── Background-video hook ─────────────────────────────────────────────────────
// Accepts a progressive file (mp4/webm) or an HLS ".m3u8" stream. HLS uses
// native playback where available (Safari/iOS) and falls back to hls.js
// everywhere else. Cleans up the hls.js instance on unmount/src change.
function useVideoBackground(src, { muted }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const isHls = /\.m3u8(\?|$)/i.test(src);
    let hls;
    const tryPlay = () => { video.play().catch(() => {}); };

    if (!isHls) {
      // Progressive file (e.g. local /tech-bg.mp4) — no hls.js needed.
      video.src = src;
      video.addEventListener('loadeddata', tryPlay);
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari / iOS handle HLS natively.
      video.src = src;
      video.addEventListener('loadedmetadata', tryPlay);
    } else if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: true, lowLatencyMode: false });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, tryPlay);
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
        else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
        else hls.destroy();
      });
    }

    return () => {
      video.removeEventListener('loadeddata', tryPlay);
      video.removeEventListener('loadedmetadata', tryPlay);
      if (hls) hls.destroy();
    };
  }, [src]);

  // Keep the element's mute state in sync with React state.
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  return videoRef;
}

// ── Main Landing Screen ───────────────────────────────────────────────────────
export default function LandingScreen({ onStart }) {
  const [name,  setName]  = useState('');
  const [muted, setMuted] = useState(true);
  const [hover, setHover] = useState(false);

  const videoRef  = useVideoBackground(VIDEO_SRC, { muted });
  const canStart  = name.trim().length > 0;

  const focusName = useCallback(() => {
    const el = document.getElementById('candidate-name');
    if (el) { el.focus(); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  }, []);

  const begin = useCallback(() => {
    if (!canStart) { focusName(); return; }
    onStart({
      name: name.trim(),
      problem: {
        title: 'Software Engineering Technical Interview',
        features: [
          `Candidate Name: ${name.trim()}`,
          'Round: Comprehensive SDE Mock Loop',
          'Areas Evaluated: Technical Screening, System Architecture, Whiteboard Design, Behavioral Leadership',
        ],
        nuances: [
          'Time & Space complexity bounds (Big-O)',
          'Microservice scaling, caching, and DB boundaries',
          'Whiteboard pattern extensibility (Strategy/Factory/Observer)',
          'Conflict resolution and architectural trade-offs',
        ],
      },
    });
  }, [canStart, name, onStart, focusName]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-black select-none">

      {/* ── Full-screen HLS video background ─────────────────────────────── */}
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
        poster="/robot.png"
      />

      {/* Legibility + brand overlays (stacked, pointer-transparent) */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(120% 90% at 70% 20%, transparent 0%, rgba(2,8,18,0.35) 55%, rgba(1,5,12,0.85) 100%)',
      }}/>
      <div className="absolute inset-0 pointer-events-none" style={{
        // stronger wash toward the bottom-left where the hero sits
        background: 'linear-gradient(120deg, rgba(1,6,14,0.92) 0%, rgba(1,6,14,0.55) 35%, transparent 65%)',
      }}/>
      <div className="absolute inset-x-0 bottom-0 h-2/3 pointer-events-none" style={{
        background: 'linear-gradient(to top, rgba(1,5,12,0.95) 0%, rgba(1,5,12,0.4) 45%, transparent 100%)',
      }}/>
      {/* Subtle HUD grid + cyan vignette tint */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(34,211,238,0.035) 1px,transparent 1px),linear-gradient(90deg,rgba(34,211,238,0.035) 1px,transparent 1px)',
        backgroundSize: '52px 52px',
        maskImage: 'radial-gradient(circle at 50% 50%, black 0%, transparent 80%)',
        WebkitMaskImage: 'radial-gradient(circle at 50% 50%, black 0%, transparent 80%)',
      }}/>

      {/* ── Glassmorphic navigation header ───────────────────────────────── */}
      <header className="absolute top-0 inset-x-0 z-30">
        <nav
          className="mx-auto mt-4 flex max-w-6xl items-center justify-between gap-4 rounded-2xl px-4 py-2.5 sm:px-5"
          style={{
            background: 'rgba(6,16,28,0.45)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            border: '1px solid rgba(34,211,238,0.16)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)',
            marginInline: '1rem',
          }}
        >
          {/* Brand */}
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2.5 pointer-events-auto">
            <img src="/jarvis_logo.png" alt="JARVIS"
              className="h-7 w-auto object-contain"
              style={{ filter: 'drop-shadow(0 0 10px rgba(34,211,238,0.35))' }} />
            <span className="hidden sm:block text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-300/70">
              SWE&nbsp;Simulator
            </span>
          </button>

          {/* Links (desktop) */}
          <ul className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(link => (
              <li key={link}>
                <button onClick={focusName}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold tracking-wide text-cyan-100/70 transition-colors hover:text-cyan-300 hover:bg-cyan-400/10">
                  {link}
                </button>
              </li>
            ))}
          </ul>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMuted(m => !m)}
              aria-label={muted ? 'Unmute background video' : 'Mute background video'}
              className="grid h-9 w-9 place-items-center rounded-xl text-cyan-200/80 transition-colors hover:bg-cyan-400/10 hover:text-cyan-300"
              style={{ border: '1px solid rgba(34,211,238,0.18)' }}
            >
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <button
              onClick={focusName}
              className="hidden sm:flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold tracking-wide text-white transition-all hover:scale-[1.03] active:scale-95"
              style={{
                background: 'linear-gradient(135deg,#0891b2 0%,#1d4ed8 100%)',
                boxShadow: '0 0 22px rgba(34,211,238,0.3)',
                border: '1px solid rgba(34,211,238,0.45)',
              }}
            >
              <Play size={13} className="fill-current" /> Start
            </button>
          </div>
        </nav>
      </header>

      {/* ── Hero content — bottom-left ───────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 z-20 w-full max-w-2xl p-6 pb-12 sm:p-10 sm:pb-14 lg:p-14 lg:pb-16">
        <div className="fade-up flex flex-col gap-5 text-left">

          {/* Eyebrow */}
          <span className="flex w-fit items-center gap-2 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-300"
            style={{ background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.25)' }}>
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400" />
            </span>
            AI Interviewer · Online
          </span>

          {/* Headline */}
          <h1 className="text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl"
            style={{ textShadow: '0 2px 30px rgba(0,0,0,0.6)' }}>
            Rehearse your next
            <br />
            <span style={{
              background: 'linear-gradient(120deg,#67e8f9 0%,#22d3ee 45%,#3b82f6 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              SWE interview
            </span>{' '}
            with JARVIS.
          </h1>

          {/* Sub copy */}
          <p className="max-w-lg text-sm leading-relaxed text-cyan-50/70 sm:text-base">
            A voice-first AI interviewer that runs you through DSA, system design, and behavioral
            rounds — then hands back an objective, instant scorecard. No accounts, no setup.
          </p>

          {/* Name + CTA */}
          <form
            onSubmit={e => { e.preventDefault(); begin(); }}
            className="mt-1 flex w-full max-w-md flex-col gap-2.5 sm:flex-row"
          >
            <input
              id="candidate-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter your name to begin"
              aria-label="Your name"
              className="flex-1 rounded-xl px-4 py-3 text-sm text-cyan-50 outline-none transition-all placeholder:text-cyan-200/30"
              style={{
                background: 'rgba(3,12,22,0.6)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(34,211,238,0.2)',
                caretColor: '#22d3ee',
              }}
              onFocus={e => (e.target.style.borderColor = 'rgba(34,211,238,0.65)')}
              onBlur={e  => (e.target.style.borderColor = 'rgba(34,211,238,0.2)')}
            />
            <button
              id="start-interview-btn"
              type="submit"
              disabled={!canStart}
              onMouseEnter={() => setHover(true)}
              onMouseLeave={() => setHover(false)}
              className="flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold transition-all active:scale-[0.98]"
              style={{
                background: canStart ? 'linear-gradient(135deg,#0891b2 0%,#1d4ed8 100%)' : 'rgba(8,20,36,0.7)',
                color: canStart ? '#e0f9ff' : '#2a4a5a',
                boxShadow: canStart ? '0 0 32px rgba(34,211,238,0.3), 0 4px 24px rgba(0,0,0,0.5)' : 'none',
                border: `1px solid ${canStart ? 'rgba(34,211,238,0.45)' : 'rgba(34,211,238,0.1)'}`,
                cursor: canStart ? 'pointer' : 'not-allowed',
              }}
            >
              Begin Interview
              <ArrowRight size={16}
                style={{ transition: 'transform 0.2s', transform: hover && canStart ? 'translateX(4px)' : 'none' }} />
            </button>
          </form>

          {/* Feature pills */}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {HERO_PILLS.map(({ icon: Icon, label }) => (
              <span key={label}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold text-cyan-100/70"
                style={{ background: 'rgba(6,16,28,0.5)', backdropFilter: 'blur(10px)', border: '1px solid rgba(34,211,238,0.14)' }}>
                <Icon size={12} className="text-cyan-400" /> {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom-right ambient credit / status (balances the layout) */}
      <div className="absolute bottom-6 right-6 z-20 hidden items-center gap-2 text-[10px] font-mono text-cyan-200/40 lg:flex">
        <Sparkles size={12} className="text-cyan-400/60" />
        <span className="tracking-wide">v2.0 · Mock Mode Active</span>
      </div>
    </div>
  );
}
