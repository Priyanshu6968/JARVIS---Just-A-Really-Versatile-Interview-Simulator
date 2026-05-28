// ─── Speech Synthesis (JARVIS speaks) ────────────────────────────────────────

const cleanForSpeech = (text = '') =>
  text
    .replace(/```[\s\S]*?```/g, 'code block omitted')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/>\s/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/proceed_to_next_step[^,}]*/gi, '')
    .replace(/summary[^,}]*/gi, '')
    .replace(/[{}"]/g, ' ')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

let voicesLoaded = false;
let cachedVoices = [];

function getVoices() {
  if (voicesLoaded) return cachedVoices;
  cachedVoices = window.speechSynthesis.getVoices();
  if (cachedVoices.length > 0) voicesLoaded = true;
  return cachedVoices;
}

function pickVoice() {
  const voices = getVoices();
  return (
    voices.find(v => v.name === 'Google UK English Male') ||
    voices.find(v => v.name.toLowerCase().includes('uk') && v.name.toLowerCase().includes('male')) ||
    voices.find(v => v.lang === 'en-GB') ||
    voices.find(v => v.lang.startsWith('en-US') && v.name.toLowerCase().includes('male')) ||
    voices.find(v => v.lang.startsWith('en')) ||
    voices[0] ||
    null
  );
}

export function speakText(text, { isMuted = false, onStart, onEnd, onError } = {}) {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    onStart?.();
    setTimeout(() => onEnd?.(), 500);
    return;
  }

  window.speechSynthesis.cancel();

  const clean = cleanForSpeech(text);
  if (!clean) { onEnd?.(); return; }

  if (isMuted) {
    // simulate timing but don't speak
    onStart?.();
    const ms = Math.min(5000, Math.max(800, clean.split(' ').length * 220));
    setTimeout(() => onEnd?.(), ms);
    return;
  }

  const go = () => {
    const utt = new SpeechSynthesisUtterance(clean);
    utt.rate  = 0.9;
    utt.pitch = 0.85;
    utt.volume = 1;
    const voice = pickVoice();
    if (voice) utt.voice = voice;
    utt.onstart = () => onStart?.();
    utt.onend   = () => onEnd?.();
    utt.onerror = e => { onError?.(e); onEnd?.(); };
    window.speechSynthesis.speak(utt);
  };

  // Voices may not be ready yet on first load
  if (getVoices().length > 0) {
    go();
  } else {
    const handler = () => {
      voicesLoaded = true;
      cachedVoices = window.speechSynthesis.getVoices();
      window.speechSynthesis.removeEventListener('voiceschanged', handler);
      go();
    };
    window.speechSynthesis.addEventListener('voiceschanged', handler);
    // Fallback after 800ms
    setTimeout(() => {
      cachedVoices = window.speechSynthesis.getVoices();
      if (cachedVoices.length > 0) go();
    }, 800);
  }
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && window.speechSynthesis)
    window.speechSynthesis.cancel();
}

// ─── Speech Recognition (Candidate speaks) ───────────────────────────────────

export function createRecognition({ onInterim, onFinal, onEnd, onError }) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;

  const rec = new SR();
  rec.continuous = false;
  rec.interimResults = true;
  rec.lang = 'en-US';

  let finalText = '';

  rec.onresult = e => {
    let interim = '';
    finalText = '';
    for (let i = 0; i < e.results.length; i++) {
      if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
      else interim += e.results[i][0].transcript;
    }
    onInterim?.(interim || finalText);
  };

  rec.onerror = e => {
    if (e.error !== 'no-speech') onError?.(e.error);
  };

  rec.onend = () => {
    onEnd?.(finalText.trim());
  };

  return {
    start()  { try { rec.start(); } catch(_) {} },
    stop()   { try { rec.stop();  } catch(_) {} },
    abort()  { try { rec.abort(); } catch(_) {} },
  };
}
