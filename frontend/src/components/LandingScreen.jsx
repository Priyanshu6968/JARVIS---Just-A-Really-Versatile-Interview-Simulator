import React, { useState } from 'react';

const PROBLEMS = [
  {
    id: 'movie',
    title: 'Movie Booking Application',
    icon: '🎬',
    desc: 'BookMyShow-style concurrent seat reservation, payment & cancellations',
    features: ['Search movies by city, theatre, date','Book seats with seat selection','Payment processing','Booking cancellation with refund','Show management for theatres'],
    nuances: ['Seats can be of multiple types (recliner, normal, premium)','A movie can run in multiple theatres','Cancellation window matters for refund eligibility'],
  },
  {
    id: 'parking',
    title: 'Parking Lot System',
    icon: '🅿️',
    desc: 'Automated multi-level parking with ticketing and dynamic billing',
    features: ['Multi-level parking with live spot tracking','Entry/exit ticketing','Vehicle type allocation (compact, large, EV)','Dynamic or flat-rate billing','Admin configuration'],
    nuances: ['Multiple vehicle types','Concurrent spot allocation','Peak-hour dynamic pricing'],
  },
  {
    id: 'splitwise',
    title: 'Splitwise Expense Manager',
    icon: '💸',
    desc: 'Group ledger with multi-split modes and debt simplification',
    features: ['Create expense groups','Record multi-party payments','Split: equal / exact / percentage','Ledger balance calculation','Settle-up workflow'],
    nuances: ['Debt simplification (min transactions)','Currency conversions','Full audit log'],
  },
];

export default function LandingScreen({ onStart }) {
  const [name, setName]   = useState('');
  const [prob, setProb]   = useState(PROBLEMS[0]);
  const [hover, setHover] = useState(false);

  const canStart = name.trim().length > 0;

  return (
    <div className="h-full w-full grid-bg flex items-center justify-center p-6 relative overflow-hidden">

      {/* radial glow blobs */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full"
        style={{background:'radial-gradient(circle,rgba(59,130,246,0.12) 0%,transparent 70%)'}} />
      <div className="pointer-events-none absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full"
        style={{background:'radial-gradient(circle,rgba(99,102,241,0.1) 0%,transparent 70%)'}} />

      <div className="w-full max-w-5xl z-10 flex flex-col gap-8 fade-up">

        {/* ── Header ── */}
        <div className="text-center flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-electric-600 to-indigo-500 flex items-center justify-center text-4xl font-black text-white shadow-2xl shadow-electric-600/30">
              J
            </div>
            <span className="absolute -bottom-2 -right-2 w-5 h-5 rounded-full bg-green-500 border-2 border-navy-950 animate-pulse" />
          </div>

          <div>
            <h1 className="text-5xl font-extrabold tracking-tight text-white">JARVIS</h1>
            <p className="text-electric-400 text-sm font-semibold tracking-[0.2em] uppercase mt-1">
              Just A Really Versatile Interview Simulator
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mt-1">
            {['Join','Aim','Rehearse','Visualise','Impress','Succeed'].map((w,i) => (
              <span key={i} className="px-3 py-1 rounded-full glass text-xs font-semibold text-navy-300">
                <span className="text-electric-400">{w[0]}</span>{w.slice(1)}
              </span>
            ))}
          </div>
        </div>

        {/* ── Main card ── */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">

          {/* Left: profile */}
          <div className="md:col-span-2 glass rounded-2xl p-6 flex flex-col gap-5">
            <h2 className="text-white font-bold text-base flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-electric-600/20 border border-electric-600/30 flex items-center justify-center text-electric-400 text-sm">👤</span>
              Candidate Profile
            </h2>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-navy-500 block mb-1.5">Your Name</label>
              <input
                id="candidate-name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && canStart && onStart({ name: name.trim(), problem: prob })}
                placeholder="e.g. Priya Sharma"
                className="w-full bg-navy-950 border border-navy-700 focus:border-electric-500 focus:outline-none focus:ring-2 focus:ring-electric-500/30 rounded-xl px-4 py-3 text-white placeholder-navy-600 text-sm transition-all"
              />
            </div>

            <div className="text-xs text-navy-500 flex flex-col gap-2 border-t border-navy-800 pt-4">
              <div className="flex items-center gap-2"><span className="text-electric-500">✦</span> 4-phase structured LLD interview</div>
              <div className="flex items-center gap-2"><span className="text-electric-500">✦</span> Live Excalidraw canvas for diagrams</div>
              <div className="flex items-center gap-2"><span className="text-electric-500">✦</span> Voice-enabled AI interviewer</div>
              <div className="flex items-center gap-2"><span className="text-electric-500">✦</span> Detailed scorecard at the end</div>
            </div>

            <button
              id="start-interview-btn"
              onClick={() => onStart({ name: name.trim(), problem: prob })}
              disabled={!canStart}
              onMouseEnter={() => setHover(true)}
              onMouseLeave={() => setHover(false)}
              className={`w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                canStart
                  ? 'bg-gradient-to-r from-electric-600 to-indigo-600 hover:from-electric-500 hover:to-indigo-500 shadow-lg shadow-electric-600/20'
                  : 'bg-navy-800 text-navy-600 cursor-not-allowed'
              }`}
            >
              Start LLD Interview
              <span className={`transition-transform duration-200 ${hover && canStart ? 'translate-x-1' : ''}`}>→</span>
            </button>
          </div>

          {/* Right: problem selection */}
          <div className="md:col-span-3 flex flex-col gap-3">
            <h2 className="text-white font-bold text-base flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-electric-600/20 border border-electric-600/30 flex items-center justify-center text-electric-400 text-sm">📋</span>
              Select LLD Problem
            </h2>

            <div className="flex flex-col gap-3 overflow-y-auto max-h-[380px] pr-1">
              {PROBLEMS.map(p => {
                const sel = prob.id === p.id;
                return (
                  <button
                    key={p.id}
                    id={`problem-${p.id}`}
                    onClick={() => setProb(p)}
                    className={`text-left p-4 rounded-2xl border transition-all ${
                      sel
                        ? 'bg-electric-600/10 border-electric-500 shadow-md shadow-electric-500/10'
                        : 'glass border-navy-700/60 hover:border-navy-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-white text-sm flex items-center gap-2">
                        <span className="text-base">{p.icon}</span> {p.title}
                      </span>
                      {sel && <span className="text-[10px] bg-electric-600 text-white font-bold px-2 py-0.5 rounded-full">Selected</span>}
                    </div>
                    <p className="text-xs text-navy-400 mb-3">{p.desc}</p>
                    {sel && (
                      <div className="border-t border-navy-800 pt-3 fade-up">
                        <p className="text-[10px] font-bold text-navy-500 uppercase tracking-wider mb-1.5">Key nuances JARVIS will probe on:</p>
                        <ul className="list-disc pl-4 text-[11px] text-navy-300 flex flex-col gap-0.5">
                          {p.nuances.map((n,i) => <li key={i}>{n}</li>)}
                        </ul>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
