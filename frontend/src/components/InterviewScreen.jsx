import React, {
  useState, useEffect, useRef, useCallback, useMemo
} from 'react';
import { Excalidraw, exportToBlob } from '@excalidraw/excalidraw';
import { speakText, stopSpeaking, createRecognition } from '../utils/voice';

// ─── Phase metadata ───────────────────────────────────────────────────────────
const PHASE_META = {
  1: { label: 'Gathering Requirements',  short: 'Requirements',  color: '#60a5fa' },
  2: { label: 'Clarifying Requirements', short: 'Clarifying',    color: '#818cf8' },
  3: { label: 'Class Diagram',           short: 'Class Diagram', color: '#a78bfa' },
  4: { label: 'Schema Design',           short: 'Schema Design', color: '#c084fc' },
};

// ─── Pre-compute 42 frequency-bar configs ────────────────────────────────────
// Shape: sine envelope so middle bars are tallest (like a real EQ spectrum)
const FREQ_BARS = Array.from({ length: 42 }, (_, i) => {
  const t     = i / 41;
  const sine  = Math.sin(t * Math.PI);               // 0 → 1 → 0
  const noise = ((i * 7919 + 13) % 8) - 4;           // deterministic ±4px noise
  const maxH  = Math.max(8, Math.round(sine * 44 + noise + 8)); // 8–52 px
  return {
    maxH,
    dur: +(0.38 + (i % 13) * 0.082).toFixed(3),      // 0.38s – 1.39s
    del: +((i * 0.061) % 1.2).toFixed(3),             // 0 – 1.2s stagger
  };
});

// ─── Interpolate bar colour across the spectrum ───────────────────────────────
function barColour(i, total, mode) {
  const t = i / (total - 1); // 0..1
  if (mode === 'speak') {
    // electric-blue → indigo → violet
    const r = Math.round(96  + t * (167 - 96));
    const g = Math.round(165 + t * (139 - 165));
    const b = Math.round(250 + t * (250 - 250));
    return `rgb(${r},${g},${b})`;
  }
  if (mode === 'mic') {
    // red → rose → pink
    return `hsl(${350 + t * 30}, 90%, 65%)`;
  }
  return `rgba(55,65,81,0.5)`; // idle grey
}

// ─── Frequency visualizer ─────────────────────────────────────────────────────
function FreqVisualizer({ isSpeaking, micActive }) {
  const mode = isSpeaking ? 'speak' : micActive ? 'mic' : 'idle';
  const active = mode !== 'idle';

  return (
    <div
      className="flex items-end gap-[2px] w-full overflow-hidden"
      style={{ height: 52 }}
      aria-hidden="true"
    >
      {FREQ_BARS.map((bar, i) => {
        const colour = barColour(i, FREQ_BARS.length, mode);
        return (
          <div
            key={i}
            style={{
              width: 3,
              height: bar.maxH,
              background: colour,
              borderRadius: 3,
              flexShrink: 0,
              transformOrigin: 'bottom',
              boxShadow: active ? `0 0 5px 1px ${colour}88` : 'none',
              // When active: run freqPulse with bar-specific duration+delay
              animation: active
                ? `freqPulse ${bar.dur}s ease-in-out ${bar.del}s infinite`
                : 'none',
              // Idle: collapse to a thin flat line
              transform: active ? undefined : 'scaleY(0.07)',
              transition: active ? 'none' : 'transform 0.6s ease, box-shadow 0.4s ease',
            }}
          />
        );
      })}
    </div>
  );
}

// ─── Glowing Neon Canvas Soundwave ──────────────────────────────────────────
function VoiceWavesCanvas({ isSpeaking, micActive }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);

    let phases = [0, 0.7, 1.4];
    let targetAmplitude = 0;
    let currentAmplitude = 0;
    let particles = [];
    const maxParticles = 25;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width / window.devicePixelRatio;
      const height = canvas.height / window.devicePixelRatio;
      const centerY = height / 2;

      // Smooth amplitude based on state
      if (isSpeaking) {
        targetAmplitude = 22;
      } else if (micActive) {
        targetAmplitude = 16;
      } else {
        targetAmplitude = 2.5; // low standby ripple
      }

      currentAmplitude += (targetAmplitude - currentAmplitude) * 0.1;
      const baseSpeed = isSpeaking ? 0.08 : micActive ? 0.05 : 0.015;

      const waves = [
        {
          color: isSpeaking ? 'rgba(96, 165, 250, 0.7)' : micActive ? 'rgba(248, 113, 113, 0.7)' : 'rgba(55, 65, 81, 0.25)',
          freq: 0.012,
          speed: baseSpeed * 1.4,
          lineWidth: 2,
          glow: isSpeaking ? '#3b82f6' : micActive ? '#ef4444' : null
        },
        {
          color: isSpeaking ? 'rgba(129, 140, 248, 0.5)' : micActive ? 'rgba(251, 146, 60, 0.5)' : 'rgba(55, 65, 81, 0.15)',
          freq: 0.022,
          speed: baseSpeed * 1.0,
          lineWidth: 1.5,
          glow: null
        },
        {
          color: isSpeaking ? 'rgba(167, 139, 250, 0.4)' : micActive ? 'rgba(244, 63, 94, 0.4)' : 'rgba(55, 65, 81, 0.1)',
          freq: 0.007,
          speed: baseSpeed * 0.7,
          lineWidth: 1,
          glow: null
        }
      ];

      waves.forEach((w, idx) => {
        phases[idx] += w.speed;
        ctx.beginPath();
        ctx.lineWidth = w.lineWidth;
        ctx.strokeStyle = w.color;

        if (w.glow) {
          ctx.shadowBlur = 14;
          ctx.shadowColor = w.glow;
        } else {
          ctx.shadowBlur = 0;
        }

        for (let x = 0; x < width; x++) {
          // Sine envelope to fade boundaries perfectly
          const env = Math.sin((x / width) * Math.PI);
          const angle = x * w.freq + phases[idx];
          // Micro audio ripples when active
          const noise = isSpeaking ? (Math.sin(x * 0.12 + phases[0] * 2.5) * 1.5) : 0;
          const y = centerY + (Math.sin(angle) * currentAmplitude + noise) * env;

          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      });

      // Drifting energetic micro-particles when active
      const active = isSpeaking || micActive;
      if (active && Math.random() < 0.2 && particles.length < maxParticles) {
        particles.push({
          x: Math.random() * width,
          y: centerY + (Math.random() - 0.5) * currentAmplitude * 1.2,
          vx: (Math.random() - 0.5) * 0.7,
          vy: -Math.random() * 1.0 - 0.4,
          size: Math.random() * 2 + 1,
          alpha: 1,
          color: isSpeaking ? '96, 165, 250' : '248, 113, 113'
        });
      }

      ctx.shadowBlur = 0;
      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.016;
        if (p.alpha <= 0 || p.x < 0 || p.x > width) {
          particles.splice(i, 1);
          return;
        }
        ctx.fillStyle = `rgba(${p.color}, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isSpeaking, micActive]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.8 }}
    />
  );
}

// ─── Majestic Fullscreen Ambient Sine Waves ──────────────────────────────────
function AmbientSineWaves({ isSpeaking, micActive }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let width = 0;
    let height = 0;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);

    // Highly staggered starting phases
    let phases = [0, 1.2, 2.4, 3.6, 4.8];
    
    let targetAmplitude = 0;
    let currentAmplitude = 0;
    let particles = [];
    const maxParticles = 30;

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Amplitude sizes (how high the waves swell to cover vertical space)
      if (isSpeaking) {
        targetAmplitude = 95; // massive vertical coverage
      } else if (micActive) {
        targetAmplitude = 70;
      } else {
        targetAmplitude = 22; // beautiful resting breathing wave flow
      }

      // Smooth interpolation for majestic transitions
      currentAmplitude += (targetAmplitude - currentAmplitude) * 0.05;

      // MUCH slower majestic flow speeds (was 0.08, now 0.004–0.012 for slow drift)
      const baseSpeed = isSpeaking ? 0.012 : micActive ? 0.009 : 0.0035;

      // 5 overlapping slow waves with staggered center-line offsets to cover massive screen space
      const waveConfigs = [
        {
          color: isSpeaking ? 'rgba(96, 165, 250, 0.65)' : micActive ? 'rgba(248, 113, 113, 0.65)' : 'rgba(34, 211, 238, 0.35)',
          freq: 0.0032, // very wide frequency for long graceful fluid waves
          speed: baseSpeed * 1.0,
          lineWidth: 2.8,
          glow: isSpeaking ? '#3b82f6' : micActive ? '#ef4444' : '#22d3ee',
          centerYOffset: -30 // slightly above center
        },
        {
          color: isSpeaking ? 'rgba(129, 140, 248, 0.55)' : micActive ? 'rgba(251, 146, 60, 0.55)' : 'rgba(34, 211, 238, 0.25)',
          freq: 0.005,
          speed: baseSpeed * 0.8,
          lineWidth: 2.2,
          glow: null,
          centerYOffset: 20 // slightly below center
        },
        {
          color: isSpeaking ? 'rgba(167, 139, 250, 0.45)' : micActive ? 'rgba(244, 63, 94, 0.45)' : 'rgba(96, 165, 250, 0.2)',
          freq: 0.002,
          speed: baseSpeed * 0.55,
          lineWidth: 1.8,
          glow: null,
          centerYOffset: -70 // higher up
        },
        {
          color: isSpeaking ? 'rgba(34, 211, 238, 0.35)' : micActive ? 'rgba(236, 72, 153, 0.35)' : 'rgba(129, 140, 248, 0.18)',
          freq: 0.007,
          speed: baseSpeed * 1.1,
          lineWidth: 1.5,
          glow: null,
          centerYOffset: 50 // lower down
        },
        {
          color: isSpeaking ? 'rgba(99, 102, 241, 0.25)' : micActive ? 'rgba(253, 186, 116, 0.25)' : 'rgba(55, 65, 81, 0.15)',
          freq: 0.0012,
          speed: baseSpeed * 0.4,
          lineWidth: 1.2,
          glow: null,
          centerYOffset: 0
        }
      ];

      waveConfigs.forEach((w, idx) => {
        phases[idx] += w.speed;
        
        ctx.beginPath();
        ctx.lineWidth = w.lineWidth;
        ctx.strokeStyle = w.color;

        if (w.glow) {
          ctx.shadowBlur = isSpeaking ? 16 : micActive ? 12 : 6;
          ctx.shadowColor = w.glow;
        } else {
          ctx.shadowBlur = 0;
        }

        const centerY = height * 0.35 + w.centerYOffset;

        for (let x = 0; x < width; x++) {
          // Smooth sine envelope so waves fade beautifully at the left and right window borders
          const env = Math.sin((x / width) * Math.PI);
          const angle = x * w.freq + phases[idx];
          
          // Organic breathing macro micro ripples when active
          const noise = isSpeaking ? (Math.sin(x * 0.008 + phases[0] * 1.5) * 4) : 0;
          const y = centerY + (Math.sin(angle) * currentAmplitude + noise) * env;

          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      });

      // Drifting slow-rising particles when active
      const active = isSpeaking || micActive;
      if (active && Math.random() < 0.07 && particles.length < maxParticles) {
        particles.push({
          x: Math.random() * width,
          y: height * 0.35 + (Math.random() - 0.5) * currentAmplitude * 1.4,
          vx: (Math.random() - 0.5) * 0.3,
          vy: -Math.random() * 0.5 - 0.2, // very slow drift up
          size: Math.random() * 3 + 1,
          alpha: 1,
          color: isSpeaking ? '96, 165, 250' : '248, 113, 113'
        });
      }

      ctx.shadowBlur = 0;
      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.007; // slower fade out
        if (p.alpha <= 0 || p.x < 0 || p.x > width) {
          particles.splice(i, 1);
          return;
        }
        ctx.fillStyle = `rgba(${p.color}, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isSpeaking, micActive]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-30"
      style={{ opacity: 0.95 }}
    />
  );
}

// ─── Glowing Cyber HUD Brackets (Matches User Reference Images - Vibrant Neon Cyan)
function CyberHudBrackets({ isSpeaking }) {
  const glowClass = isSpeaking 
    ? 'drop-shadow-[0_0_15px_rgba(34,211,238,0.95)] opacity-100' 
    : 'drop-shadow-[0_0_6px_rgba(34,211,238,0.6)] opacity-75';

  return (
    <>
      {/* TOP-LEFT BRACKET - Emerges from very center of screen to top-left corner */}
      <div 
        className={`absolute top-4 left-4 w-32 h-20 transition-all duration-[1100ms] cubic-bezier(0.19,1,0.22,1) ${glowClass}`}
        style={{
          transform: isSpeaking 
            ? 'translate(0px, 0px) scale(1)' 
            : 'translate(calc(50vw - 110px), calc(50vh - 65px)) scale(0.12)',
        }}
      >
        <svg width="100%" height="100%" viewBox="0 0 128 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 0 H96 L90 6 H6 V64 L0 70 Z" fill="#22d3ee" />
          <path d="M0 10 H3 V40 H0 Z" fill="#22d3ee" />
          <rect x="12" y="12" width="6" height="6" fill="#0ea5e9" />
        </svg>
      </div>

      {/* TOP-RIGHT BRACKET - Emerges from very center of screen to top-right corner */}
      <div 
        className={`absolute top-4 right-4 w-32 h-20 transition-all duration-[1100ms] cubic-bezier(0.19,1,0.22,1) ${glowClass}`}
        style={{
          transform: isSpeaking 
            ? 'translate(0px, 0px) scale(1)' 
            : 'translate(calc(-50vw + 110px), calc(50vh - 65px)) scale(0.12)',
        }}
      >
        <svg width="100%" height="100%" viewBox="0 0 128 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M128 0 H32 L38 6 H122 V64 L128 70 Z" fill="#22d3ee" />
          <path d="M125 10 H128 V40 H125 Z" fill="#22d3ee" />
          <rect x="110" y="12" width="6" height="6" fill="#0ea5e9" />
        </svg>
      </div>

      {/* BOTTOM-LEFT BRACKET - Emerges from very center of screen to bottom-left corner */}
      <div 
        className={`absolute bottom-4 left-4 w-32 h-20 transition-all duration-[1100ms] cubic-bezier(0.19,1,0.22,1) ${glowClass}`}
        style={{
          transform: isSpeaking 
            ? 'translate(0px, 0px) scale(1)' 
            : 'translate(calc(50vw - 110px), calc(-50vh + 65px)) scale(0.12)',
        }}
      >
        <svg width="100%" height="100%" viewBox="0 0 128 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 80 H96 L90 74 H6 V16 L0 10 Z" fill="#22d3ee" />
          <path d="M0 40 H3 V70 H0 Z" fill="#22d3ee" />
          <rect x="12" y="62" width="6" height="6" fill="#0ea5e9" />
        </svg>
      </div>

      {/* BOTTOM-RIGHT BRACKET - Emerges from very center of screen to bottom-right corner */}
      <div 
        className={`absolute bottom-4 right-4 w-32 h-20 transition-all duration-[1100ms] cubic-bezier(0.19,1,0.22,1) ${glowClass}`}
        style={{
          transform: isSpeaking 
            ? 'translate(0px, 0px) scale(1)' 
            : 'translate(calc(-50vw + 110px), calc(-50vh + 65px)) scale(0.12)',
        }}
      >
        <svg width="100%" height="100%" viewBox="0 0 128 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M128 80 H32 L38 74 H122 V16 L128 10 Z" fill="#22d3ee" />
          <path d="M125 40 H128 V70 H125 Z" fill="#22d3ee" />
          <rect x="110" y="62" width="6" height="6" fill="#0ea5e9" />
        </svg>
      </div>

      {/* LEFT HANDLE TAB - Emerges from very center of screen */}
      <div 
        className={`absolute left-0 top-1/2 -translate-y-1/2 w-4 h-20 transition-all duration-[1100ms] cubic-bezier(0.19,1,0.22,1) ${glowClass}`}
        style={{
          transform: isSpeaking 
            ? 'translateY(-50%) translate(0px, 0px) scale(1)' 
            : 'translateY(-50%) translate(calc(50vw - 20px), 0px) scale(0.1)',
        }}
      >
        <svg width="100%" height="100%" viewBox="0 0 16 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 8 L12 16 V48 L0 56 Z" fill="#22d3ee" />
          <path d="M0 0 H4 V4 H0 Z" fill="#22d3ee" />
          <path d="M0 60 H4 V64 H0 Z" fill="#22d3ee" />
        </svg>
      </div>

      {/* RIGHT HANDLE TAB - Emerges from very center of screen */}
      <div 
        className={`absolute right-0 top-1/2 -translate-y-1/2 w-4 h-20 transition-all duration-[1100ms] cubic-bezier(0.19,1,0.22,1) ${glowClass}`}
        style={{
          transform: isSpeaking 
            ? 'translateY(-50%) translate(0px, 0px) scale(1)' 
            : 'translateY(-50%) translate(calc(-50vw + 20px), 0px) scale(0.1)',
        }}
      >
        <svg width="100%" height="100%" viewBox="0 0 16 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 8 L4 16 V48 L16 56 Z" fill="#22d3ee" />
          <path d="M12 0 H16 V4 H12 Z" fill="#22d3ee" />
          <path d="M12 60 H16 V64 H12 Z" fill="#22d3ee" />
        </svg>
      </div>
    </>
  );
}

// ─── Central 3D Rotating Prism Hologram (Double-Pyramid Wireframe - Radiant Neon Cyan) 
function CentralPrismHologram({ isSpeaking }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const width = 640;
    const height = 420;
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    let angleX = 0.55; 
    let angleY = 0.0;  
    let time = 0;

    let targetAmplitude = 0;
    let currentAmplitude = 0;

    const layers = 11;

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      if (isSpeaking) {
        targetAmplitude = 1.0;
      } else {
        targetAmplitude = 0.22;
      }

      currentAmplitude += (targetAmplitude - currentAmplitude) * 0.08;

      time += isSpeaking ? 0.045 : 0.007;
      angleY += isSpeaking ? 0.015 : 0.0022;

      const centerX = width / 2;
      const centerY = height / 2;

      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);
      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);

      for (let l = 0; l < layers; l++) {
        const ratio = l / (layers - 1);
        const distFromCenter = Math.abs(ratio - 0.5) * 2; 
        
        const radius = (1 - distFromCenter * 0.8) * 155 * (0.35 + currentAmplitude * 0.65);
        const depthOffset = (ratio - 0.5) * 290 * (0.3 + currentAmplitude * 0.7);

        const vertices = [];
        for (let i = 0; i < 4; i++) {
          const angle = (i * Math.PI) / 2;
          const x3d = Math.cos(angle) * radius;
          const y3d = Math.sin(angle) * radius * 0.48; 
          const z3d = depthOffset;

          const rotY_x = x3d * cosY - z3d * sinY;
          const rotY_z = x3d * sinY + z3d * cosY;
          const rotY_y = y3d;

          const rotX_x = rotY_x;
          const rotX_y = rotY_y * cosX - rotY_z * sinX;
          const rotX_z = rotY_y * sinX + rotY_z * cosX;

          const camZ = rotX_z + 460;
          const scale = 360 / camZ;
          const projX = centerX + rotX_x * scale;
          const projY = centerY + rotX_y * scale;

          vertices.push({ x: projX, y: projY, depth: camZ });
        }

        ctx.beginPath();
        ctx.moveTo(vertices[0].x, vertices[0].y);
        for (let i = 1; i < 4; i++) {
          ctx.lineTo(vertices[i].x, vertices[i].y);
        }
        ctx.closePath();

        const opacity = isSpeaking 
          ? (0.25 + (1 - distFromCenter) * 0.72) 
          : (0.15 + (1 - distFromCenter) * 0.35);

        ctx.lineWidth = isSpeaking ? 1.6 : 1.0;
        ctx.strokeStyle = `rgba(34, 211, 238, ${opacity})`;
        ctx.stroke();

        if (l === Math.floor(layers / 2)) {
          ctx.shadowBlur = isSpeaking ? 12 : 4;
          ctx.shadowColor = '#22d3ee';
          ctx.fillStyle = `rgba(34, 211, 238, ${isSpeaking ? 0.85 : 0.4})`;
          ctx.beginPath();
          ctx.arc(centerX, centerY, 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => cancelAnimationFrame(animationFrameId);
  }, [isSpeaking]);

  return (
    <canvas
      ref={canvasRef}
      className="w-[640px] h-[420px] pointer-events-none drop-shadow-[0_0_20px_rgba(34,211,238,0.85)]"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}

// ─── Entire Viewport Cockpit HUD (Emerging / sliding open from very center) ──
function JarvisCockpitHud({ isSpeaking }) {
  const opacityVal = isSpeaking ? 0.95 : 0.35;

  return (
    <div 
      className="fixed inset-0 pointer-events-none z-20 flex items-center justify-center transition-opacity duration-700 ease-in-out"
      style={{ opacity: opacityVal }}
    >
      {/* Corner brackets which literally merge/converge to center and slide out */}
      <CyberHudBrackets isSpeaking={isSpeaking} />

      {/* Giant 3D stacked diamond prism hologram spinning in the center */}
      <CentralPrismHologram isSpeaking={isSpeaking} />
      
    </div>
  );
}

// ─── JARVIS orb with sonar rings ──────────────────────────────────────────────
function JARVISOrb({ isSpeaking, micActive }) {
  return (
    <div className="relative flex-shrink-0 flex items-center justify-center"
      style={{ width: 72, height: 72 }}>

      {/* Three staggered sonar rings — only while speaking */}
      {isSpeaking && [0, 1, 2].map(i => (
        <div
          key={i}
          className="absolute inset-0 rounded-full border border-blue-400"
          style={{
            animation: 'sonarExpand 2.1s ease-out infinite',
            animationDelay: `${i * 0.7}s`,
            opacity: 0,
          }}
        />
      ))}

      {/* Single mic ring — only while listening */}
      {micActive && !isSpeaking && (
        <div
          className="absolute inset-0 rounded-full border border-red-400"
          style={{ animation: 'micPulse 1.6s ease-out infinite', opacity: 0 }}
        />
      )}

      {/* Core orb */}
      <div
        className={`absolute inset-0 rounded-full flex items-center justify-center select-none
          ${isSpeaking ? 'orb-speak' : 'orb-idle'}`}
        style={{
          background: isSpeaking
            ? 'radial-gradient(circle at 32% 28%, #93c5fd, #3b82f6 40%, #6366f1 75%, #4f46e5)'
            : 'radial-gradient(circle at 32% 28%, #60a5fa, #2563eb 50%, #4338ca)',
          transition: 'background 0.5s ease',
        }}
      >
        {/* Specular highlight */}
        <div
          className="absolute rounded-full"
          style={{
            width: 18, height: 18,
            top: 10, left: 12,
            background: 'radial-gradient(circle, rgba(255,255,255,0.55), transparent 70%)',
          }}
        />
        {/* Letter */}
        <span
          className="relative z-10 font-black text-white"
          style={{ fontSize: 22, letterSpacing: '-0.5px', textShadow: '0 1px 8px rgba(0,0,0,0.4)' }}
        >
          J
        </span>
      </div>
    </div>
  );
}

// ─── Typing dots ──────────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="self-start flex flex-col gap-1 fade-up">
      <div className="flex items-center gap-1 px-4 py-3 glass rounded-2xl rounded-tl-sm">
        <div className="w-2 h-2 rounded-full bg-electric-500 dot1" />
        <div className="w-2 h-2 rounded-full bg-electric-500 dot2" />
        <div className="w-2 h-2 rounded-full bg-electric-500 dot3" />
      </div>
      <span className="text-[10px] text-navy-700 ml-1">JARVIS is thinking…</span>
    </div>
  );
}

// ─── Phase banner ─────────────────────────────────────────────────────────────
function PhaseBanner({ text, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2600); return () => clearTimeout(t); }, []);
  return (
    <div className="absolute inset-x-0 top-0 z-40 flex justify-center pointer-events-none">
      <div className="phase-banner mt-16 px-6 py-3 rounded-2xl text-white font-bold text-sm flex items-center gap-2 shadow-2xl"
        style={{ background: 'linear-gradient(135deg, #2563eb, #6366f1)', boxShadow: '0 8px 32px rgba(59,130,246,0.4)' }}>
        <span className="animate-pulse">⚡</span> {text}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
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

  const bottomRef      = useRef(null);
  const recRef         = useRef(null);
  const isMutedRef     = useRef(false);
  const sendRef        = useRef(null);
  const lastSpokenIdx  = useRef(-1);

  isMutedRef.current = isMuted;

  const meta      = PHASE_META[phase] || PHASE_META[1];
  const showCanvas = phase >= 3;

  // ── timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const fmtTime = s =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // ── auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // ── speak new assistant messages ───────────────────────────────────────────
  useEffect(() => {
    const last = messages.at(-1);
    if (!last || last.role !== 'assistant') return;
    const idx = messages.length - 1;
    if (idx === lastSpokenIdx.current) return;
    lastSpokenIdx.current = idx;
    speakText(last.text, {
      isMuted: isMutedRef.current,
      onStart: () => setIsSpeaking(true),
      onEnd:   () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  }, [messages]);

  useEffect(() => () => stopSpeaking(), []);

  // ── canvas capture ─────────────────────────────────────────────────────────
  const captureCanvas = useCallback(async () => {
    if (!excalidrawAPI || phase < 3) return null;
    try {
      const elements = excalidrawAPI.getSceneElements();
      if (!elements?.length) return null;
      const blob = await exportToBlob({
        elements, appState: excalidrawAPI.getAppState(),
        files: excalidrawAPI.getFiles(), mimeType: 'image/png',
      });
      return new Promise(res => {
        const r = new FileReader();
        r.onloadend = () => res(r.result.split(',')[1]);
        r.onerror   = () => res(null);
        r.readAsDataURL(blob);
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

  sendRef.current = handleSend;

  // ── mic toggle ─────────────────────────────────────────────────────────────
  const toggleMic = useCallback(() => {
    if (micActive) {
      recRef.current?.stop();
      return;
    }
    const rec = createRecognition({
      onInterim: t  => setLiveText(t),
      onEnd: finalT => {
        setMicActive(false);
        setLiveText('');
        if (finalT) sendRef.current(finalT);
      },
      onError: () => { setMicActive(false); setLiveText(''); },
    });
    if (!rec) { setNoSpeechAPI(true); return; }
    recRef.current = rec;
    stopSpeaking();
    setIsSpeaking(false);
    setMicActive(true);
    setLiveText('');
    rec.start();
  }, [micActive]);

  // ── keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const fn = e => {
      const tag = document.activeElement?.tagName;
      if (e.code === 'Space' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        toggleMic();
      }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [toggleMic]);

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-[#040814] relative">

      {/* Breathtaking Fullscreen Ambient Sine Waves Visualizer */}
      <AmbientSineWaves isSpeaking={isSpeaking} micActive={micActive} />

      {/* Jarvis Futuristic Cockpit HUD (Outer Brackets & Stacked Diamond Prism Hologram) */}
      <JarvisCockpitHud isSpeaking={isSpeaking} />

      {phaseBanner && <PhaseBanner text={phaseBanner} onDone={onBannerDone} />}

      {/* ══ TOPBAR ═══════════════════════════════════════════════════════════ */}
      <header className="h-14 shrink-0 border-b border-navy-800/40 flex items-center px-4 gap-3 z-10"
        style={{ background: 'rgba(10, 15, 28, 0.72)', backdropFilter: 'blur(14px)' }}>

        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-sm shadow-lg"
            style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>J</div>
          <span className="text-white font-extrabold tracking-wide hidden sm:block text-sm">JARVIS</span>
        </div>

        <div className="w-px h-5 bg-navy-700 shrink-0" />

        {/* Phase stepper */}
        <div className="flex items-center gap-0.5 flex-1 overflow-x-auto">
          {[1, 2, 3, 4].map(i => {
            const done   = phase > i;
            const active = phase === i;
            const m      = PHASE_META[i];
            return (
              <React.Fragment key={i}>
                {i > 1 && (
                  <div className="w-5 h-px shrink-0 mx-0.5"
                    style={{ background: done ? m.color : '#21262d' }} />
                )}
                <div
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold shrink-0 transition-all"
                  style={{
                    background: active ? `${m.color}18` : 'transparent',
                    border: active ? `1px solid ${m.color}60` : '1px solid transparent',
                    color: active ? m.color : done ? '#4ade80' : '#484f58',
                  }}
                >
                  <span
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{
                      background: active ? m.color : done ? '#16a34a' : '#21262d',
                      color: active || done ? 'white' : '#484f58',
                    }}
                  >{done ? '✓' : i}</span>
                  <span className="hidden sm:block">{m.short}</span>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="font-mono text-xs bg-navy-800 border border-navy-700 rounded-lg px-2.5 py-1 text-navy-400">
            ⏱ {fmtTime(elapsed)}
          </div>
          <button id="req-drawer-btn" onClick={() => setDrawerOpen(v => !v)}
            className="px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all"
            style={{
              background: drawerOpen ? 'rgba(59,130,246,0.15)' : 'transparent',
              borderColor: drawerOpen ? 'rgba(59,130,246,0.5)' : '#21262d',
              color: drawerOpen ? '#60a5fa' : '#6b7280',
            }}>
            📋 Req's
          </button>
          <button id="mute-btn"
            onClick={() => { setIsMuted(m => { if (!m) stopSpeaking(); return !m; }); }}
            className="p-2 rounded-xl border transition-all"
            style={{
              background: isMuted ? 'rgba(239,68,68,0.1)' : 'transparent',
              borderColor: isMuted ? 'rgba(239,68,68,0.4)' : '#21262d',
              color: isMuted ? '#f87171' : '#6b7280',
            }}
            title={isMuted ? 'Unmute JARVIS' : 'Mute JARVIS'}>
            {isMuted ? '🔇' : '🔊'}
          </button>
        </div>
      </header>

      {/* ══ BODY ═══════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex overflow-hidden">

        {/* LEFT: Excalidraw (phases 3 & 4) */}
        {showCanvas && (
          <div className="flex-1 border-r border-navy-800 flex flex-col bg-[#0d1117] relative">
            <div className="absolute top-2 left-2 z-10 pointer-events-none">
              <span className="glass-blue text-[10px] px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5"
                style={{ color: meta.color }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse inline-block"
                  style={{ background: meta.color }} />
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

        {/* RIGHT: Conversation (Transparent blur glassmorphism to show 3D background grid) */}
        <div className={`flex flex-col bg-[#070b15]/65 backdrop-blur-md border-l border-navy-800/60 ${showCanvas ? 'w-[420px] shrink-0' : 'flex-1'} h-full z-10`}>

          {/* Phase badge */}
          <div className="shrink-0 px-4 py-2 border-b border-navy-800 flex items-center gap-2"
            style={{ background: 'rgba(13,17,23,0.6)' }}>
            <span className="text-xs font-bold" style={{ color: meta.color }}>Phase {phase}</span>
            <span className="text-navy-700">·</span>
            <span className="text-xs text-navy-400">{meta.label}</span>
          </div>

          {noSpeechAPI && (
            <div className="shrink-0 px-4 py-2 border-b border-amber-500/30 text-amber-400 text-xs flex items-center gap-2"
              style={{ background: 'rgba(245,158,11,0.05)' }}>
              ⚠️ Voice input not supported — please use Chrome for mic features.
            </div>
          )}

          {/* ── Chat messages ── */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {messages.length === 0 && !isLoading && (
              <div className="glass-blue rounded-2xl p-4 text-xs text-navy-300 leading-relaxed fade-up">
                <p className="font-bold mb-1" style={{ color: meta.color }}>🎯 {session.problem.title}</p>
                <p>JARVIS will interview you in 4 phases. Respond via voice or text.</p>
              </div>
            )}

            {messages.map((msg, i) => {
              const isJ = msg.role === 'assistant';
              return (
                <div key={i} className={`flex flex-col max-w-[84%] fade-up ${isJ ? 'self-start' : 'self-end'}`}>
                  <div
                    className="px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap font-medium border shadow-lg"
                    style={isJ
                      ? { 
                          background: 'rgba(10, 16, 32, 0.95)', 
                          borderColor: 'rgba(59, 130, 246, 0.3)', 
                          color: '#e0f2fe', // soft glowing ice-cyan tint for futuristic beauty & maximum readability
                          borderRadius: '1.1rem 1.1rem 1.1rem 4px',
                          borderLeft: '4px solid #3b82f6',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.45)'
                        }
                      : { 
                          background: 'linear-gradient(135deg, #1d4ed8, #1e40af)', 
                          borderColor: 'rgba(255,255,255,0.1)',
                          color: '#f0f9ff', // soft glowing silver-blue tint for cohesive elegant contrast 
                          borderRadius: '1.1rem 1.1rem 4px 1.1rem',
                          boxShadow: '0 4px 16px rgba(29,78,216,0.3)'
                        }
                    }
                  >
                    {msg.text}
                  </div>
                  <span className={`text-[10px] text-navy-600 mt-1 ${isJ ? 'ml-1' : 'mr-1 self-end'}`}>
                    {isJ ? 'JARVIS' : session.name}
                  </span>
                </div>
              );
            })}

            {isLoading && <TypingDots />}
            <div ref={bottomRef} />
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              JARVIS DYNAMIC VISUALIZER HUD
          ══════════════════════════════════════════════════════════════════ */}
          <div
            className="shrink-0 border-t border-navy-800 relative overflow-hidden"
            style={{
              background: isSpeaking
                ? 'linear-gradient(180deg, rgba(8, 17, 36, 0.98) 0%, rgba(11, 22, 46, 0.96) 100%)'
                : micActive
                  ? 'linear-gradient(180deg, rgba(24, 10, 10, 0.98) 0%, rgba(42, 12, 12, 0.96) 100%)'
                  : 'rgba(10, 14, 22, 0.85)',
              transition: 'background 0.6s ease',
            }}
          >
            {/* Animated background radial glow */}
            {(isSpeaking || micActive) && (
              <div
                className="absolute inset-0 pointer-events-none hud-glow"
                style={{
                  background: isSpeaking
                    ? 'radial-gradient(ellipse at 50% 50%, rgba(37, 99, 235, 0.15) 0%, transparent 80%)'
                    : 'radial-gradient(ellipse at 50% 50%, rgba(239, 68, 68, 0.15) 0%, transparent 80%)',
                }}
              />
            )}

            {/* Glowing Neon Canvas Soundwave */}
            <VoiceWavesCanvas isSpeaking={isSpeaking} micActive={micActive} />

            <div className="relative z-10 px-4 pt-3 pb-3 flex items-end gap-4">

              {/* JARVIS orb */}
              <JARVISOrb isSpeaking={isSpeaking} micActive={micActive} />

              {/* Right column: label + visualizer */}
              <div className="flex-1 flex flex-col gap-1.5 min-w-0 pb-1">

                {/* Status label */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-white">JARVIS</p>
                    <p
                      className="text-[10px] font-semibold tracking-wide transition-colors duration-400"
                      style={{
                        color: isSpeaking ? '#60a5fa'
                          : micActive    ? '#f87171'
                          : '#374151',
                      }}
                    >
                      {isSpeaking
                        ? '▶ Speaking'
                        : micActive
                          ? '◉ Listening'
                          : '— Standby'}
                    </p>
                  </div>
                  <span className="text-[10px] text-navy-800 font-mono hidden sm:block">
                    [Space] mic
                  </span>
                </div>

                {/* Frequency visualizer */}
                <FreqVisualizer isSpeaking={isSpeaking} micActive={micActive} />
              </div>
            </div>
          </div>

          {/* ── Input area ── */}
          <div className="shrink-0 p-3 border-t border-navy-800 flex flex-col gap-2"
            style={{ background: 'rgba(13,17,23,0.95)' }}>

            {/* Live transcript */}
            {micActive && (
              <div className="fade-up rounded-xl px-3 py-2 border"
                style={{ background: 'rgba(239,68,68,0.04)', borderColor: 'rgba(239,68,68,0.2)' }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                  <span className="text-[10px] font-bold text-red-400">Listening…</span>
                </div>
                <p className="text-xs text-navy-200 italic min-h-[16px]">
                  {liveText || 'Start speaking…'}
                </p>
              </div>
            )}

            <div className="flex items-center gap-2">
              {/* Mic button */}
              <button
                id="mic-btn"
                onClick={toggleMic}
                disabled={isLoading}
                title={micActive ? 'Stop (Space)' : 'Start mic (Space)'}
                className="shrink-0 p-3 rounded-xl border transition-all active:scale-95 disabled:opacity-40 relative"
                style={{
                  background: micActive ? '#ef4444' : 'rgba(13,17,23,0.8)',
                  borderColor: micActive ? '#ef4444' : '#21262d',
                  color: micActive ? 'white' : '#6b7280',
                  boxShadow: micActive ? '0 0 16px 4px rgba(239,68,68,0.3)' : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                {micActive ? '⏹' : '🎙️'}
                {micActive && (
                  <span
                    className="absolute inset-0 rounded-xl"
                    style={{ animation: 'micPulse 1.4s ease-out infinite', border: '1px solid #f87171', opacity: 0 }}
                  />
                )}
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
                className="flex-1 min-w-0 rounded-xl px-4 py-3 text-sm text-white placeholder-navy-600 disabled:opacity-40 transition-all border"
                style={{
                  background: 'rgba(6,13,26,0.8)',
                  borderColor: '#21262d',
                  outline: 'none',
                }}
                onFocus={e  => (e.target.style.borderColor = '#3b82f6')}
                onBlur={e   => (e.target.style.borderColor = '#21262d')}
              />

              {/* Send */}
              <button
                id="send-btn"
                onClick={() => handleSend()}
                disabled={!inputText.trim() || isLoading}
                className="shrink-0 p-3 rounded-xl text-white active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                style={{
                  background: 'linear-gradient(135deg,#2563eb,#1d4ed8)',
                  boxShadow: inputText.trim() ? '0 0 12px rgba(37,99,235,0.4)' : 'none',
                }}
              >
                ➤
              </button>
            </div>

            {/* Footer row */}
            <div className="flex justify-between items-center px-0.5">
              <span className="text-[10px] text-navy-800">Flipkart SDE-2 · LLD Mock</span>
              <button
                id="feedback-btn"
                onClick={onGetFeedback}
                className="text-xs font-semibold flex items-center gap-1 transition-colors"
                style={{ color: '#3b82f6' }}
                onMouseEnter={e => (e.target.style.color = '#60a5fa')}
                onMouseLeave={e => (e.target.style.color = '#3b82f6')}
              >
                🏆 Get Scorecard
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ══ REQUIREMENTS DRAWER ═════════════════════════════════════════════════ */}
      <div
        className={`fixed inset-y-0 right-0 z-30 w-72 flex flex-col shadow-2xl transition-transform duration-300 ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ background: 'rgba(10,16,28,0.98)', borderLeft: '1px solid #21262d', backdropFilter: 'blur(16px)' }}
      >
        <div className="p-4 border-b border-navy-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">📋 Requirements</h3>
          <button onClick={() => setDrawerOpen(false)} className="text-navy-600 hover:text-white text-lg leading-none">✕</button>
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
            <div className="rounded-xl p-4 text-center text-navy-700 border border-dashed border-navy-800">
              Requirements will appear after Phases 1 & 2.
            </div>
          )}
          <div>
            <p className="text-[10px] font-bold text-navy-600 uppercase tracking-wider mb-1.5">Key Nuances</p>
            <ul className="list-disc pl-4 text-navy-400 flex flex-col gap-1">
              {session.problem.nuances?.map((n, i) => <li key={i}>{n}</li>)}
            </ul>
          </div>
        </div>
      </div>

    </div>
  );
}
