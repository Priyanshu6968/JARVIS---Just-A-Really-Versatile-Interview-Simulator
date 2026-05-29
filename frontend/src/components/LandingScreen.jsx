import React, { useState, useEffect, useRef, useCallback } from 'react';

const FOCUS_AREAS = [
  {
    id: 'dsa',
    title: 'DSA & Algorithms',
    icon: '🧠',
    desc: 'Data Structures, algorithms, complexity bounds (Big O), and space-time trade-offs',
    nuances: ['Optimized time and space complexity','Corner cases and boundary constraints','Optimal data structures (Trees, Graphs, DP)'],
  },
  {
    id: 'system',
    title: 'System Architecture (HLD/LLD)',
    icon: '🏛️',
    desc: 'High Level Design, Microservices, database systems, caching, scaling, and class inheritance structures',
    nuances: ['High availability and fault tolerance','Consistency, partitioning, and replication trade-offs','Object-Oriented Design patterns and interface clean boundaries'],
  },
  {
    id: 'backend',
    title: 'Backend & Databases',
    icon: '⚙️',
    desc: 'Database schemas, transactions, concurrency, multi-threading, locking, and API engineering',
    nuances: ['Concurrent locking and race condition mitigation','Database normalization and indexing patterns','API design, rate limiting, and network protocols'],
  },
  {
    id: 'frontend',
    title: 'Frontend & Client Systems',
    icon: '🌐',
    desc: 'UI architecture, global state management, render optimization, client security, and browser systems',
    nuances: ['Render cycles and frame rate optimization','Global vs local state boundaries','Client security (XSS, CSRF) and performance metrics'],
  },
  {
    id: 'behavioral',
    title: 'Behavioral & Tech Leadership',
    icon: '💬',
    desc: 'Technical project ownership, handling structural design failures, technical team conflict resolution, and growth',
    nuances: ['Ownership and leadership in past design loops','Handling tech debt and architectural failures','Engineering compromises and team conflict resolution'],
  },
];

const BENEFITS = [
  {
    id: 'velocity',
    icon: '⚡',
    title: 'Accelerate Technical Skill',
    tagline: 'WEEKS TO DAYS',
    desc: 'Compress technical study loops with immediate SWE evaluations. Run unlimited mock sessions on algorithms, systems scaling, and structural patterns.',
    side: 'left',
  },
  {
    id: 'objectivity',
    icon: '🧠',
    title: 'Objective AI Assessment',
    tagline: '100% BIAS-FREE',
    desc: 'Grade architectural and engineering decisions solely on technical trade-offs, standard patterns, and edge-case handling. Standardized and objective feedback.',
    side: 'left',
  },
  {
    id: 'sandbox',
    icon: '✏️',
    title: 'Interactive Whiteboard',
    tagline: 'VISUAL SYSTEM DIAGRAMS',
    desc: 'Model classes, draft structural design pattern interfaces, or sketch full microservice systems on our fully integrated Excalidraw design canvas.',
    side: 'right',
  },
  {
    id: 'voice',
    icon: '🎙️',
    title: 'Voice-First Interface',
    tagline: 'SPOKEN CONVERSATION',
    desc: 'Practice defending your design exactly like a real-world interview. Speak naturally with JARVIS and receive instant spoken feedback.',
    side: 'right',
  },
];

function BenefitCard({ title, tagline, desc, icon }) {
  return (
    <div className="rounded-2xl p-5 border transition-all duration-300 hover:scale-[1.02] flex flex-col gap-2 group w-full"
      style={{
        background: 'rgba(4,14,26,0.72)',
        backdropFilter: 'blur(16px)',
        borderColor: 'rgba(34,211,238,0.14)',
        boxShadow: '0 0 30px rgba(34,211,238,0.02), inset 0 1px 0 rgba(255,255,255,0.02)'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'rgba(34,211,238,0.45)';
        e.currentTarget.style.boxShadow = '0 0 24px rgba(34,211,238,0.12), inset 0 1px 0 rgba(255,255,255,0.03)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'rgba(34,211,238,0.14)';
        e.currentTarget.style.boxShadow = '0 0 30px rgba(34,211,238,0.02), inset 0 1px 0 rgba(255,255,255,0.02)';
      }}
    >
      <div className="flex items-center gap-3">
        <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
          style={{ background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.22)', color: '#22d3ee' }}>
          {icon}
        </span>
        <div className="flex flex-col text-left">
          <span className="text-[9px] font-black tracking-wider text-cyan-400/60 uppercase">{tagline}</span>
          <h3 className="text-white font-bold text-sm tracking-tight">{title}</h3>
        </div>
      </div>
      <p className="text-xs leading-relaxed text-left" style={{ color: '#64808c' }}>{desc}</p>
    </div>
  );
}

// ─── Slow-drifting light-blue dots (no connection lines) ─────────────────────
function ParticleField() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;
    // Gentle, slowly wandering dots — no connecting lines
    const pts = Array.from({ length: 70 }, () => ({
      x:  Math.random() * window.innerWidth,
      y:  Math.random() * window.innerHeight,
      // Very slow speeds
      vx: (Math.random() - 0.5) * 0.12,
      vy: (Math.random() - 0.5) * 0.12,
      // Varied dot sizes — some tiny, some a bit larger
      r:  Math.random() * 2.2 + 0.5,
      a:  Math.random() * 0.7 + 0.05,
      da: (Math.random() - 0.5) * 0.003,
    }));
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.a += p.da;
        if (p.a < 0.04) p.da =  Math.abs(p.da);
        if (p.a > 0.75) p.da = -Math.abs(p.da);
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width  + 10) p.x = -10;
        if (p.y < -10) p.y = canvas.height + 10;
        if (p.y > canvas.height + 10) p.y = -10;
        // Soft glowing dot: draw a small radial gradient circle
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 2.2);
        g.addColorStop(0,   `rgba(147,224,238,${p.a})`);
        g.addColorStop(0.5, `rgba(34,211,238,${p.a * 0.55})`);
        g.addColorStop(1,   `rgba(34,211,238,0)`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
}

// ─── Interactive glowing eye overlay canvas ───────────────────────────────────
// Renders two glowing teal eyes over the robot image that track the cursor.
// eyeL and eyeR are {x, y, r} in percentage of the img bounding box.
function EyeOverlay({ mousePos, imgRef }) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);

  // Eye positions as fraction of natural image dimensions (tuned to robot.png)
  // These will be recalculated against the actual rendered img rect each frame
  // Precisely calibrated to robot.png eye sockets (measured from 1024×1024 image):
  // Left socket center:  ~405px from left, ~360px from top → 39.5% / 35.2%
  // Right socket center: ~620px from left, ~360px from top → 60.5% / 35.2%
  // Socket radius: ~29px → 2.8% of image width
  const EYES = [
    { fx: 0.43, fy: 0.295, fr: 0.028 }, // left eye
    { fx: 0.57, fy: 0.295, fr: 0.028 }, // right eye
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let time = 0;

    const render = () => {
      const img = imgRef.current;
      if (!img) { animRef.current = requestAnimationFrame(render); return; }

      const rect = img.getBoundingClientRect();
      canvas.width  = rect.width;
      canvas.height = rect.height;
      // position canvas over image
      canvas.style.left   = rect.left + 'px';
      canvas.style.top    = rect.top  + 'px';
      canvas.style.width  = rect.width  + 'px';
      canvas.style.height = rect.height + 'px';

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += 0.04;

      EYES.forEach(({ fx, fy, fr }) => {
        const cx = fx * rect.width;
        const cy = fy * rect.height;
        const r  = fr * rect.width;

        // Direction from eye to cursor
        const dx = mousePos.current.x - (rect.left + cx);
        const dy = mousePos.current.y - (rect.top  + cy);
        const dist = Math.hypot(dx, dy);
        const maxTravel = r * 0.28;
        const scale = dist > 0 ? Math.min(maxTravel / dist, 1) : 0;
        const px = dx * scale;
        const py = dy * scale;

        // ── Outer glow halo (tight to socket) ──
        const haloGrad = ctx.createRadialGradient(cx, cy, r * 0.7, cx, cy, r * 1.4);
        haloGrad.addColorStop(0, `rgba(34,211,238,${0.18 + Math.sin(time) * 0.07})`);
        haloGrad.addColorStop(1, 'rgba(34,211,238,0)');
        ctx.beginPath(); ctx.arc(cx, cy, r * 1.4, 0, Math.PI * 2);
        ctx.fillStyle = haloGrad; ctx.fill();

        // ── Iris base (deep teal) ──
        const irisGrad = ctx.createRadialGradient(cx - r*0.2, cy - r*0.2, 0, cx, cy, r);
        irisGrad.addColorStop(0,    'rgba(120,255,240,0.95)');
        irisGrad.addColorStop(0.3,  'rgba(34,211,238,0.9)');
        irisGrad.addColorStop(0.65, 'rgba(5,100,90,0.88)');
        irisGrad.addColorStop(1,    'rgba(0,20,18,0.95)');
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = irisGrad; ctx.fill();

        // ── Ring segments (like camera aperture) ──
        const ringOpacity = 0.55 + Math.sin(time * 1.3) * 0.15;
        ctx.strokeStyle = `rgba(34,211,238,${ringOpacity})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(cx, cy, r * 0.72, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = `rgba(34,211,238,${ringOpacity * 0.6})`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2); ctx.stroke();

        // ── Pupil (tracks cursor) ──
        const pupilR = r * 0.32;
        const pupilGrad = ctx.createRadialGradient(cx + px * 0.4, cy + py * 0.4, 0, cx + px, cy + py, pupilR);
        pupilGrad.addColorStop(0, 'rgba(220,255,250,1)');
        pupilGrad.addColorStop(0.3, 'rgba(0,40,30,1)');
        pupilGrad.addColorStop(1, 'rgba(0,8,6,1)');
        ctx.beginPath(); ctx.arc(cx + px, cy + py, pupilR, 0, Math.PI * 2);
        ctx.fillStyle = pupilGrad; ctx.fill();

        // ── Specular glints ──
        ctx.beginPath(); ctx.arc(cx + px - pupilR*0.38, cy + py - pupilR*0.35, pupilR * 0.28, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.fill();
        ctx.beginPath(); ctx.arc(cx + px + pupilR*0.25, cy + py + pupilR*0.3, pupilR * 0.14, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fill();

        // ── Outer chrome ring ──
        const pulse = Math.sin(time * 2) * 0.15;
        ctx.strokeStyle = `rgba(34,211,238,${0.75 + pulse})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = `rgba(34,211,238,${0.35 + pulse * 0.5})`;
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(cx, cy, r + 4, 0, Math.PI * 2); ctx.stroke();
      });

      animRef.current = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed pointer-events-none z-20"
      style={{ position: 'fixed' }}
    />
  );
}

// ─── Main Landing Screen ──────────────────────────────────────────────────────
export default function LandingScreen({ onStart }) {
  const [name,  setName]  = useState('');
  const [role,  setRole]  = useState('Software Engineer (SDE-2)');
  const [prob,  setProb]  = useState(FOCUS_AREAS[0]);
  const [hover, setHover] = useState(false);
  const imgRef    = useRef(null);
  const robotWrapperRef = useRef(null);
  const mousePos  = useRef({ x: 0, y: 0 }); // use ref to avoid re-renders in canvas loop

  const canStart = name.trim().length > 0;

  const handleScroll = useCallback((e) => {
    const scrollTop = e.currentTarget.scrollTop;
    const maxScroll = 450;
    const ratio = Math.min(scrollTop / maxScroll, 1);
    if (robotWrapperRef.current) {
      // Fade opacity down from 1.0 to 0.08 (8% visible)
      robotWrapperRef.current.style.opacity = 1.0 - ratio * 0.92;
    }
  }, []);

  useEffect(() => {
    const fn = e => { mousePos.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener('mousemove', fn);
    return () => window.removeEventListener('mousemove', fn);
  }, []);

  return (
    <div
      className="h-full w-full overflow-y-auto relative"
      onScroll={handleScroll}
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #051828 0%, #020c14 50%, #000810 100%)' }}
    >
      <ParticleField />

      {/* Sleek Floating branding logo badge in top-left HUD corner */}
      <div className="absolute top-6 left-8 z-30 flex items-center gap-2 pointer-events-auto select-none">
        <img 
          src="/jarvis_logo.png" 
          alt="JARVIS Logo" 
          className="h-8 w-auto object-contain"
          style={{ filter: 'drop-shadow(0 0 10px rgba(34,211,238,0.3))' }}
        />
      </div>

      {/* Floating title line in top center HUD */}
      <div className="absolute top-7 left-1/2 -translate-x-1/2 z-30 pointer-events-none hidden md:block">
        <span className="text-cyan-400/90 font-medium text-sm tracking-[0.22em] uppercase select-none"
              style={{ textShadow: '0 0 16px rgba(34,211,238,0.4)' }}>
          Practice for your next SWE interview
        </span>
      </div>

      {/* Eye tracking overlay — fixed over robot image */}
      <EyeOverlay mousePos={mousePos} imgRef={imgRef} />

      {/* Immersive Fixed Robot Backdrop Container (fades on scroll) */}
      <div 
        ref={robotWrapperRef}
        className="fixed inset-0 pointer-events-none z-10 flex items-center justify-center"
        style={{ 
          height: '76vh', 
          top: '0',
          transition: 'opacity 0.05s ease-out',
          willChange: 'opacity'
        }}
      >
        <div className="relative flex items-center justify-center w-full h-full" style={{ height: '60vh', maxHeight: '60vh' }}>
          {/* Ambient glow behind robot */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(ellipse at 50% 55%, rgba(34,211,238,0.12) 0%, rgba(34,211,238,0.04) 40%, transparent 70%)',
          }}/>
          {/* Bottom ground glow */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-80 h-12 pointer-events-none" style={{
            background: 'radial-gradient(ellipse, rgba(34,211,238,0.45) 0%, transparent 70%)',
            filter: 'blur(12px)',
          }}/>

          <img
            ref={imgRef}
            src="/robot.png"
            alt="JARVIS Robot"
            style={{
              height: '100%',
              maxHeight: '56vh',
              width: 'auto',
              objectFit: 'contain',
              display: 'block',
              userSelect: 'none',
              mixBlendMode: 'screen',
              filter: 'drop-shadow(0 0 50px rgba(34,211,238,0.35)) brightness(1.08)',
            }}
            draggable={false}
          />

          {/* HUD scan line sweeping down over robot */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ mixBlendMode: 'screen' }}>
            <div style={{
              position: 'absolute', left: 0, right: 0, height: 2,
              background: 'linear-gradient(90deg, transparent 0%, rgba(34,211,238,0.6) 50%, transparent 100%)',
              animation: 'scanDown 4s linear infinite',
            }}/>
          </div>

          {/* HUD targeting reticle on robot face area */}
          <div className="absolute pointer-events-none" style={{
            top: '12%', left: '50%', transform: 'translateX(-50%)',
            width: 120, height: 120,
            border: '1px solid rgba(34,211,238,0.25)',
            borderRadius: '50%',
            animation: 'reticlePulse 3s ease-in-out infinite',
          }}>
            <div style={{ position:'absolute', top: -6, left: '50%', transform: 'translateX(-50%)', width: 12, height: 12, borderTop: '2px solid rgba(34,211,238,0.7)', borderRight: '2px solid rgba(34,211,238,0.7)' }}/>
            <div style={{ position:'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%) rotate(180deg)', width: 12, height: 12, borderTop: '2px solid rgba(34,211,238,0.7)', borderRight: '2px solid rgba(34,211,238,0.7)' }}/>
            <div style={{ position:'absolute', left: -6, top: '50%', transform: 'translateY(-50%) rotate(-90deg)', width: 12, height: 12, borderTop: '2px solid rgba(34,211,238,0.7)', borderRight: '2px solid rgba(34,211,238,0.7)' }}/>
            <div style={{ position:'absolute', right: -6, top: '50%', transform: 'translateY(-50%) rotate(90deg)', width: 12, height: 12, borderTop: '2px solid rgba(34,211,238,0.7)', borderRight: '2px solid rgba(34,211,238,0.7)' }}/>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{
        backgroundImage: 'linear-gradient(rgba(34,211,238,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(34,211,238,0.03) 1px,transparent 1px)',
        backgroundSize: '50px 50px',
      }}/>

      {/* Corner HUD brackets */}
      {[
        { t: 'top-0 left-0',     bt: '1.5px solid rgba(34,211,238,0.5)', bl: '1.5px solid rgba(34,211,238,0.5)' },
        { t: 'top-0 right-0',    bt: '1.5px solid rgba(34,211,238,0.5)', br: '1.5px solid rgba(34,211,238,0.5)' },
        { t: 'bottom-0 left-0',  bb: '1.5px solid rgba(34,211,238,0.5)', bl: '1.5px solid rgba(34,211,238,0.5)' },
        { t: 'bottom-0 right-0', bb: '1.5px solid rgba(34,211,238,0.5)', br: '1.5px solid rgba(34,211,238,0.5)' },
      ].map(({ t, bt, bl, br, bb }, i) => (
        <div key={i} className={`fixed ${t} w-16 h-16 pointer-events-none z-10`}
          style={{ borderTop: bt, borderLeft: bl, borderRight: br, borderBottom: bb }}/>
      ))}

      {/* ══ SCROLLABLE CONTENT ════════════════════════════════════════════════ */}
      <div className="relative z-10 flex flex-col items-center">

        {/* ── SECTION 1: Robot hero (Compacted spacer & framing cards) ── */}
        <div className="w-full flex flex-col items-center justify-between pt-6" style={{ height: '76vh', minHeight: '76vh', position: 'relative' }}>

          {/* Centered SWE Interview Headline at the top of hero spacer for mobile */}
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20 text-center w-full px-4 md:hidden">
            <h1 className="text-cyan-400 font-medium text-xs tracking-[0.16em] uppercase select-none opacity-85"
                style={{ textShadow: '0 0 12px rgba(34,211,238,0.35)' }}>
              Practice for your next SWE interview
            </h1>
          </div>

          {/* Empty spacing box matching the fixed backdrop dimensions */}
          <div className="relative flex items-center justify-center w-full" style={{ height: '60vh', maxHeight: '60vh' }}>
            
            {/* Left HUD Benefit Cards (Desktop only) */}
            <div className="hidden lg:flex lg:flex-col gap-4 absolute left-4 xl:left-16 top-1/2 -translate-y-1/2 w-80 z-20 pointer-events-auto">
              {BENEFITS.filter(b => b.side === 'left').map(b => (
                <BenefitCard key={b.id} {...b} />
              ))}
            </div>

            {/* Right HUD Benefit Cards (Desktop only) */}
            <div className="hidden lg:flex lg:flex-col gap-4 absolute right-4 xl:right-16 top-1/2 -translate-y-1/2 w-80 z-20 pointer-events-auto">
              {BENEFITS.filter(b => b.side === 'right').map(b => (
                <BenefitCard key={b.id} {...b} />
              ))}
            </div>
            
          </div>

          {/* Scroll cue */}
          <div className="flex flex-col items-center gap-1.5 py-3" style={{ color: '#1a5a6a' }}>
            <span className="text-[10px] font-bold tracking-[0.3em] uppercase">Configure Interview</span>
            <svg width="22" height="14" viewBox="0 0 22 14" fill="none" style={{ animation: 'arrowBounce 1.6s ease-in-out infinite' }}>
              <path d="M2 2L11 12L20 2" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.55"/>
            </svg>
          </div>
        </div>

        {/* Mobile Benefits Grid (Visible only on mobile viewports below lg) */}
        <div className="lg:hidden flex flex-col md:grid md:grid-cols-2 gap-4 w-full max-w-xl px-5 py-6">
          {BENEFITS.map(b => (
            <BenefitCard key={b.id} {...b} />
          ))}
        </div>

        {/* ── SECTION 2: Form ── */}
        <div className="w-full max-w-xl px-5 pb-20 flex flex-col gap-4">

          {/* Section divider */}
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right,transparent,rgba(34,211,238,0.4))' }}/>
            <span className="text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color: 'rgba(34,211,238,0.6)' }}>Session Setup</span>
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left,transparent,rgba(34,211,238,0.4))' }}/>
          </div>

          {/* Candidate name card */}
          <div className="rounded-2xl p-5 border" style={{
            background: 'rgba(4,14,26,0.92)',
            backdropFilter: 'blur(20px)',
            borderColor: 'rgba(34,211,238,0.18)',
            boxShadow: '0 0 40px rgba(34,211,238,0.04), inset 0 1px 0 rgba(255,255,255,0.03)',
          }}>
            <h2 className="text-white font-bold text-sm flex items-center gap-2 mb-4">
              <span className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
                style={{ background: 'rgba(34,211,238,0.12)', border: '1px solid rgba(34,211,238,0.28)', color: '#22d3ee' }}>
                👤
              </span>
              Candidate Profile
            </h2>
            
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#2a6878' }}>Your Name</label>
                <input
                  id="candidate-name"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                  style={{ background: 'rgba(1,8,18,0.95)', border: '1px solid rgba(34,211,238,0.18)', color: '#e0f9ff', caretColor: '#22d3ee' }}
                  onFocus={e => e.target.style.borderColor = 'rgba(34,211,238,0.65)'}
                  onBlur={e  => e.target.style.borderColor = 'rgba(34,211,238,0.18)'}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4 pt-3 text-xs border-t" style={{ borderColor: 'rgba(34,211,238,0.08)', color: '#2a6878' }}>
              {['Comprehensive SWE Mock','Excalidraw whiteboard','Voice-enabled AI','Detailed scorecard'].map(f => (
                <div key={f} className="flex items-center gap-1.5">
                  <span style={{ color: '#22d3ee' }}>✦</span> {f}
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <button
            id="start-interview-btn"
            onClick={() => onStart({
              name: name.trim(),
              problem: {
                title: "Software Engineering Technical Interview",
                features: [
                  `Candidate Name: ${name.trim()}`,
                  "Round: Comprehensive SDE Mock Loop",
                  "Areas Evaluated: Technical Screening, System Architecture, Whiteboard Design, Behavioral Leadership"
                ],
                nuances: [
                  "Time & Space complexity bounds (Big-O)",
                  "Microservice scaling, caching, and DB boundaries",
                  "Whiteboard pattern extensibility (Strategy/Factory/Observer)",
                  "Conflict resolution and architectural trade-offs"
                ]
              }
            })}
            disabled={!canStart}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
            style={{
              background: canStart ? 'linear-gradient(135deg,#0891b2 0%,#1d4ed8 100%)' : 'rgba(8,20,36,0.8)',
              color: canStart ? '#e0f9ff' : '#1a3a4a',
              boxShadow: canStart ? '0 0 32px rgba(34,211,238,0.28), 0 4px 24px rgba(0,0,0,0.5)' : 'none',
              border: `1px solid ${canStart ? 'rgba(34,211,238,0.45)' : 'rgba(34,211,238,0.07)'}`,
              cursor: canStart ? 'pointer' : 'not-allowed',
            }}>
            <span>Begin SWE Interview with JARVIS</span>
            <span style={{ display:'inline-block', transition:'transform 0.2s', transform: hover && canStart ? 'translateX(5px)' : 'translateX(0)', fontSize:'1.2em' }}>→</span>
          </button>
        </div>

        {/* ── SECTION 3: Decoding the SWE Interviewer's Mind ── */}
        <div className="w-full max-w-5xl px-5 py-16 flex flex-col items-center gap-12 border-t" style={{ borderColor: 'rgba(34,211,238,0.08)' }}>
          
          <div className="text-center flex flex-col gap-2 max-w-2xl">
            <span className="text-xs font-black tracking-[0.25em] text-cyan-400 uppercase">THE COGNITIVE LOOP</span>
            <h2 className="text-3xl lg:text-4xl font-black tracking-tight text-white">Decoding the SWE Interviewer's Mind</h2>
            <p className="text-sm" style={{ color: '#64808c' }}>
              Real-world interviewers don't just look for code that works. They evaluate how you communicate, how you navigate ambiguity, and how you design under constraint.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
            {[
              {
                icon: '🧠',
                title: 'Algorithm & Complexity',
                tagline: 'PHASE 1 SCREENING',
                desc: 'Interviewers look for strong problem solving and complexity bounds (Big-O). Correct data structure choices and edge-case validation prevent runtime failures.'
              },
              {
                icon: '🏛️',
                title: 'System Scale & Design',
                tagline: 'PHASE 2 ARCHITECTURE',
                desc: 'Scaling to millions requires microservices boundaries, database choices (SQL vs NoSQL), robust caching strategies, and failover designs.'
              },
              {
                icon: '✏️',
                title: 'Whiteboard & Patterns',
                tagline: 'PHASE 3 WHITEBOARD',
                desc: 'Your visual sketch is a collaborative team tool. Demonstrate clean pattern interfaces, logical aggregations, and object-oriented extensibility.'
              },
              {
                icon: '💬',
                title: 'Leadership & Conflict',
                tagline: 'PHASE 4 BEHAVIORAL',
                desc: 'Mature engineers are tested on ownership under ambiguity, conflict resolution over tech debt, post-mortem recovery, and business trade-offs.'
              }
            ].map((insight, idx) => (
              <div key={idx} className="rounded-2xl p-5 border transition-all duration-300 hover:scale-[1.02] flex flex-col gap-3 group"
                style={{
                  background: 'rgba(4,14,26,0.55)',
                  backdropFilter: 'blur(16px)',
                  borderColor: 'rgba(34,211,238,0.12)',
                  boxShadow: '0 0 30px rgba(34,211,238,0.01), inset 0 1px 0 rgba(255,255,255,0.01)'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'rgba(34,211,238,0.35)';
                  e.currentTarget.style.boxShadow = '0 0 24px rgba(34,211,238,0.08), inset 0 1px 0 rgba(255,255,255,0.02)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgba(34,211,238,0.12)';
                  e.currentTarget.style.boxShadow = '0 0 30px rgba(34,211,238,0.01), inset 0 1px 0 rgba(255,255,255,0.01)';
                }}
              >
                <span className="w-9 h-9 rounded-xl flex items-center justify-center text-sm"
                  style={{ background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.18)', color: '#22d3ee' }}>
                  {insight.icon}
                </span>
                <div className="flex flex-col text-left">
                  <span className="text-[9px] font-black tracking-wider text-cyan-400/50 uppercase">{insight.tagline}</span>
                  <h3 className="text-white font-bold text-base tracking-tight mt-0.5">{insight.title}</h3>
                </div>
                <p className="text-xs leading-relaxed text-left" style={{ color: '#526b78' }}>{insight.desc}</p>
              </div>
            ))}
          </div>

        </div>

        {/* ── SECTION 4: Why Practice with JARVIS? ── */}
        <div className="w-full max-w-5xl px-5 py-16 flex flex-col items-center gap-12 border-t" style={{ borderColor: 'rgba(34,211,238,0.08)' }}>
          
          <div className="text-center flex flex-col gap-2 max-w-2xl">
            <span className="text-xs font-black tracking-[0.25em] text-cyan-400 uppercase">PEDAGOGICAL VALUE</span>
            <h2 className="text-3xl lg:text-4xl font-black tracking-tight text-white">Why Practice with JARVIS?</h2>
            <p className="text-sm" style={{ color: '#64808c' }}>
              Unlike static mock questions or passive video courses, JARVIS simulates the interactive, live stress of standard tech screen interviews.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
            {[
              {
                icon: '🔁',
                title: 'Immediate Feedback Loop Closure',
                desc: 'Real interviews happen once, and feedback is notoriously scarce. JARVIS analyzes your structural patterns, points out architectural gaps, and provides detailed tabbed feedback loops instantly.'
              },
              {
                icon: '🎙️',
                title: 'Spoken Verbal Conditioning',
                desc: 'Many engineers know patterns but struggle to articulate them clearly under pressure. Speak directly with JARVIS to build the oral communication muscle memory required for corporate loops.'
              },
              {
                icon: '🎨',
                title: 'Interactive Excalidraw Whiteboard',
                desc: 'Model your designs exactly like you would on a real call. Our canvas integrates into Phases 3 & 4 so you draw UML classes and draft database schema mappings concurrently with your spoken answers.'
              },
              {
                icon: '⏱️',
                title: 'Live Simulated Stress Conditioning',
                desc: 'Practice under a live tracking timer, managing requirements and architectural trade-offs in a safety sandbox, preparing you to remain calm and structured under actual interview timers.'
              }
            ].map((benefit, idx) => (
              <div key={idx} className="rounded-2xl p-6 border flex gap-4 text-left"
                style={{
                  background: 'rgba(2,8,18,0.85)',
                  borderColor: 'rgba(34,211,238,0.1)',
                  boxShadow: '0 0 30px rgba(34,211,238,0.01)',
                }}
              >
                <span className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                  style={{ background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.15)', color: '#22d3ee' }}>
                  {benefit.icon}
                </span>
                <div className="flex flex-col gap-1.5 text-left">
                  <h3 className="text-white font-bold text-base tracking-tight">{benefit.title}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: '#526b78' }}>{benefit.desc}</p>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* ── SECTION 5: Immersive "Ready to Rehearse?" CTA Block ── */}
        <div className="w-full max-w-xl px-5 pb-12 pt-8 flex flex-col items-center gap-6 text-center border-t" style={{ borderColor: 'rgba(34,211,238,0.08)' }}>
          <div className="flex flex-col gap-2">
            <h3 className="text-xl font-black text-white tracking-tight">Ready to challenge your SWE limits?</h3>
            <p className="text-xs" style={{ color: '#64808c' }}>
              No accounts, no payment, and no claims. Set up your candidate profile above and start coding with JARVIS immediately.
            </p>
          </div>
          <button
            onClick={() => {
              const el = document.getElementById('candidate-name');
              if (el) {
                el.focus();
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }}
            className="px-6 py-2.5 rounded-xl font-bold text-xs tracking-wider uppercase border transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
            style={{
              background: 'rgba(34,211,238,0.08)',
              borderColor: 'rgba(34,211,238,0.3)',
              color: '#22d3ee',
              boxShadow: '0 0 15px rgba(34,211,238,0.1)'
            }}
          >
            Scroll to Setup Profile ↑
          </button>
        </div>

        {/* ── SECTION 6: Premium Corporate Footer (Reference: eightfold.ai) ── */}
        <footer className="w-full border-t py-16 px-6 md:px-12 lg:px-24 flex flex-col gap-12" 
          style={{ 
            borderColor: 'rgba(34,211,238,0.08)', 
            background: 'linear-gradient(180deg, rgba(2,8,18,0.4) 0%, rgba(1,4,10,0.9) 100%)',
            backdropFilter: 'blur(20px)',
            marginBottom: '40px' // accounts for the fixed bottom status bar height
          }}>
          
          <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
            
            {/* Left Brand Column */}
            <div className="lg:col-span-6 flex flex-col gap-6 text-left">
              <div className="flex items-center gap-2">
                <img 
                  src="/jarvis_logo.png" 
                  alt="JARVIS Logo" 
                  className="h-9 w-auto object-contain"
                  style={{ filter: 'drop-shadow(0 0 10px rgba(34,211,238,0.35))' }}
                />
              </div>
              
              <p className="text-xs leading-relaxed max-w-lg" style={{ color: '#526b78' }}>
                JARVIS is an agentic talent evaluation simulator that gives every software developer and tech recruiter the capability to practice, refine, and master comprehensive SWE technical interview rounds. Our AI-native evaluation system probes requirements, gauges scaling trade-offs, and validates visual whiteboard schemas with objective, real-time rigor and instant scorecard feedback.
              </p>
              
              <span className="text-xs font-semibold italic tracking-wide" style={{ color: '#22d3ee' }}>
                Architectural Intelligence, human led
              </span>
              
            </div>
            
            {/* Learn More Column */}
            <div className="lg:col-span-3 flex flex-col gap-4 text-left">
              <span className="text-xs font-black uppercase tracking-widest text-white">Learn more</span>
              <ul className="flex flex-col gap-2.5 text-xs">
                {['AI Interviewer', 'Constraint Analysis', 'UML Whiteboard', 'Schema Sandbox', 'Scorecard Analytics'].map(item => (
                  <li key={item}>
                    <a href="#candidate-name" onClick={e => {
                      e.preventDefault();
                      const el = document.getElementById('candidate-name');
                      if (el) {
                        el.focus();
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    }} className="transition-colors duration-300 hover:text-cyan-400" style={{ color: '#4a6776' }}>
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Contact & Support Column */}
            <div className="lg:col-span-3 flex flex-col gap-4 text-left">
              <span className="text-xs font-black uppercase tracking-widest text-white">Contact & Support</span>
              
              <div className="flex flex-col gap-4">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-cyan-300">Priyanshu Nigam</span>
                  <span className="text-[9px] tracking-wider uppercase font-semibold text-cyan-500/50 mt-0.5">Lead Architect & Developer</span>
                </div>
                
                <div className="flex flex-col gap-2 text-xs">
                  {/* Phone */}
                  <a href="tel:+917497030568" className="flex items-center gap-2 group transition-colors duration-300 hover:text-cyan-400" style={{ color: '#4a6776' }}>
                    <span className="text-sm group-hover:scale-110 transition-transform">📞</span>
                    <span className="font-mono text-[11px]">+91 74970 30568</span>
                  </a>
                  
                  {/* Email */}
                  <a href="mailto:priyanshunigam469@gmail.com" className="flex items-center gap-2 group transition-colors duration-300 hover:text-cyan-400" style={{ color: '#4a6776' }}>
                    <span className="text-sm group-hover:scale-110 transition-transform">✉️</span>
                    <span className="font-mono text-[11px]">priyanshunigam469@gmail.com</span>
                  </a>
                </div>
              </div>
              
            </div>
            
          </div>
          
          {/* Bottom Copyright & Back to Top Row */}
          <div className="w-full max-w-7xl mx-auto border-t pt-8 flex flex-col md:flex-row items-center justify-between gap-6" 
            style={{ borderColor: 'rgba(34,211,238,0.06)' }}>
            
            <span className="text-[10px] font-mono" style={{ color: '#2a4555' }}>
              © JARVIS, 2026. All rights reserved worldwide.
            </span>
            
            <button
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] group"
              style={{ 
                background: 'rgba(34,211,238,0.05)', 
                border: '1px solid rgba(34,211,238,0.12)', 
                color: '#22d3ee' 
              }}
            >
              <span>Back to top</span>
              <span className="group-hover:-translate-y-0.5 transition-transform">↑</span>
            </button>
            
          </div>
          
        </footer>

      </div>

      {/* Fixed status bar */}
      <div className="fixed bottom-0 left-0 right-0 px-5 py-2 flex items-center justify-between text-[10px] font-mono z-30"
        style={{ background: 'rgba(1,6,14,0.88)', borderTop: '1px solid rgba(34,211,238,0.1)', color: '#1a4050', backdropFilter: 'blur(10px)' }}>
        <div className="flex items-center gap-2">
          <img src="/jarvis_logo.png" alt="JARVIS Logo" className="h-3.5 w-auto object-contain opacity-55" />
          <span className="text-[9px] tracking-wide" style={{ color: '#2a5a6a' }}>v2.0 · SWE Interview Simulator</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block"/>
            AI System Online
          </span>
          <span>Mock Mode Active</span>
        </div>
      </div>

      <style>{`
        @keyframes arrowBounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(7px)} }
        @keyframes scanDown    { 0%{top:-2px;opacity:0} 5%{opacity:1} 95%{opacity:0.4} 100%{top:100%;opacity:0} }
        @keyframes reticlePulse{ 0%,100%{opacity:0.5;transform:translateX(-50%) scale(1)} 50%{opacity:0.9;transform:translateX(-50%) scale(1.06)} }
      `}</style>
    </div>
  );
}
