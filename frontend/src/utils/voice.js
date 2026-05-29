// ─── Speech Synthesis ──────────────────────────────────────────────────────────

const cleanForSpeech = (text = '') =>
  text
    .replace(/```[\s\S]*?```/g, 'code block.')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/>\s/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/proceed_to_next_step[^\n]*/gi, '')
    .replace(/[{}"]/g, ' ')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

let _voicesReady = false;
let _voices = [];

function loadVoices() {
  if (_voicesReady) return _voices;
  _voices = window.speechSynthesis.getVoices();
  if (_voices.length) _voicesReady = true;
  return _voices;
}

function pickVoice() {
  const v = loadVoices();
  return (
    v.find(x => x.name === 'Google UK English Male') ||
    v.find(x => x.name.toLowerCase().includes('uk') && x.name.toLowerCase().includes('male')) ||
    v.find(x => x.lang === 'en-GB') ||
    v.find(x => x.lang.startsWith('en-US') && x.name.toLowerCase().includes('male')) ||
    v.find(x => x.lang.startsWith('en')) ||
    v[0] || null
  );
}

export function speakText(text, { isMuted = false, onStart, onEnd, onError } = {}) {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    onStart?.(); setTimeout(() => onEnd?.(), 500); return;
  }

  window.speechSynthesis.cancel();
  const clean = cleanForSpeech(text);
  if (!clean) { onEnd?.(); return; }

  if (isMuted) {
    onStart?.();
    setTimeout(() => onEnd?.(), Math.min(5000, Math.max(800, clean.split(' ').length * 220)));
    return;
  }

  const go = () => {
    const utt = new SpeechSynthesisUtterance(clean);
    utt.rate = 0.9; utt.pitch = 0.85; utt.volume = 1;
    const voice = pickVoice();
    if (voice) utt.voice = voice;
    utt.onstart = () => onStart?.();
    utt.onend   = () => onEnd?.();
    utt.onerror = e => { onError?.(e); onEnd?.(); };
    window.speechSynthesis.speak(utt);
  };

  if (loadVoices().length > 0) {
    go();
  } else {
    const h = () => {
      _voicesReady = true; _voices = window.speechSynthesis.getVoices();
      window.speechSynthesis.removeEventListener('voiceschanged', h);
      go();
    };
    window.speechSynthesis.addEventListener('voiceschanged', h);
    setTimeout(() => { if (loadVoices().length > 0) go(); }, 800);
  }
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && window.speechSynthesis)
    window.speechSynthesis.cancel();
}

// ─── Speech Recognition ────────────────────────────────────────────────────────
//
// KEY FIX: continuous = true prevents Chrome from auto-stopping after ~1s of
// silence (which caused the "mic collapses in 1 second" bug).
// We restart on unexpected ends so background noise never kills the session.
// Only when the user explicitly calls .stop() do we deliver the transcript.

export function createRecognition({ onInterim, onEnd, onError }) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;

  const rec = new SR();
  rec.continuous      = false;  // Setting to false improves stability; we auto-restart on end anyway
  rec.interimResults  = true;
  rec.lang            = 'en-US';
  rec.maxAlternatives = 1;

  let sessionAccumulatedText = '';
  let currentSessionText = '';
  let stoppedByUser = false;
  let started = false;

  rec.onresult = e => {
    let localFinalText = '';
    let localInterimText = '';
    for (let i = 0; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) {
        localFinalText += t + ' ';
      } else {
        localInterimText += t;
      }
    }
    currentSessionText = (localFinalText + localInterimText).trim();
    const fullText = (sessionAccumulatedText + ' ' + currentSessionText).trim();
    onInterim?.(fullText);
  };

  rec.onerror = e => {
    if (e.error === 'no-speech') return;
    if (e.error === 'network')   return;
    if (e.error === 'aborted')   return;
    console.error('SpeechRecognition error:', e.error);
    onError?.(e.error);
  };

  rec.onend = () => {
    if (stoppedByUser) {
      // Deliver the final accumulated transcript
      const fullText = (sessionAccumulatedText + ' ' + currentSessionText).trim();
      onEnd?.(fullText);
    } else if (started) {
      // Browser ended us unexpectedly (network hiccup, silence timeout, etc.)
      // Save the text we gathered so far before restarting the session!
      sessionAccumulatedText = (sessionAccumulatedText + ' ' + currentSessionText).trim();
      currentSessionText = '';
      try { rec.start(); } catch (_) { /* already started */ }
    }
  };

  return {
    start() {
      sessionAccumulatedText = '';
      currentSessionText = '';
      stoppedByUser = false;
      started = true;
      try { rec.start(); } catch (_) {}
    },
    stop() {
      stoppedByUser = true;
      started       = false;
      try { rec.stop(); } catch (_) {}
    },
    abort() {
      stoppedByUser = true;
      started       = false;
      try { rec.abort(); } catch (_) {}
    },
  };
}
