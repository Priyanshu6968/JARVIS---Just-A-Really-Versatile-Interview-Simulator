# JARVIS - Just A Really Versatile Interview Simulator

> An intelligent, voice-enabled mock Software Engineering (SWE) interview platform.

## Quick Start

### 1. Backend Setup

```bash
cd backend
npm install
npm start
# Backend runs on http://localhost:5000
```

### 2. Frontend Setup

```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
# Open http://localhost:5173
```

## API Key Configuration

By default, JARVIS supports multiple AI models. You can configure this directly in the UI (via the Settings button) or edit `backend/.env`:

```
GROQ_API_KEY=gsk_...
GEMINI_API_KEY=AIza...
ANTHROPIC_API_KEY=sk-ant-...
PORT=5000
```

> **No key? No problem.** Leave the key empty and JARVIS runs in **mock mode** - full interview flow with simulated responses, perfect for development.

## How It Works

1. **Landing Screen** - Enter your name and pick an interview problem or topic.
2. **Interview Phases** - JARVIS conducts a comprehensive 6-phase SWE interview:
   - Phase 1: DSA (Data Structures and Algorithms)
   - Phase 2: Candidate Projects
   - Phase 3: JavaScript and Language Fundamentals
   - Phase 4: React and Frontend Concepts
   - Phase 5: Backend, Database, and API Design
   - Phase 6: HR, Behavioral, and Communication
3. **Voice** - JARVIS speaks every response; you can reply by voice or text.
4. **Scorecard** - Click "Get Scorecard" for detailed phase-by-phase markdown feedback.
5. **Anti-Cheat** - Tab switching, minimizing the window, or copying/pasting during the interview are strictly prohibited and will be logged.

## Controls

| Shortcut | Action |
|----------|--------|
| `Space`  | Toggle microphone on/off |
| `Enter`  | Send text message |
| `Mute` button | Mute/unmute JARVIS voice |
| `Settings` button | Open AI connection settings |
| `Scorecard` button | Get SWE scorecard |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express |
| AI | Groq (llama-3.3-70b), Gemini, or Anthropic |
| Voice Output | Web Speech API (SpeechSynthesis) |
| Voice Input | Web Speech API (SpeechRecognition) |

## Browser Requirements

- **Chrome / Edge** recommended (full Web Speech API support)
- Firefox: voice input unsupported - text-only fallback activates automatically
- Safari: partial support

## Project Structure

```
|-- backend/
|   |-- server.js          # Express proxy + mock mode
|   |-- .env               # API keys (gitignored)
|   |-- package.json
|-- frontend/
    |-- src/
    |   |-- App.jsx                          # Phase state machine
    |   |-- components/
    |   |   |-- LandingScreen.jsx
    |   |   |-- InterviewScreen.jsx          # Main interview UI
    |   |   |-- FeedbackModal.jsx
    |   |-- utils/
    |       |-- voice.js                     # Speech synthesis + recognition
    |-- package.json
```