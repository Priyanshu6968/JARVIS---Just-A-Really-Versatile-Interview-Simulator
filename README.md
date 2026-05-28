# JARVIS — Just A Really Versatile Interview Simulator

> An intelligent, voice-enabled mock LLD interview platform powered by Claude AI.

## 🚀 Quick Start

### 1. Backend Setup

```bash
cd backend
# Add your Anthropic API key to .env  (optional — works in mock mode without it)
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

## 🔑 API Key Configuration

Edit `backend/.env`:

```
ANTHROPIC_API_KEY=sk-ant-...   # your real key
PORT=5000
```

> **No key? No problem.** Leave the key empty and JARVIS runs in **mock mode** — full interview flow with simulated responses, perfect for development.

## 📋 How It Works

1. **Landing Screen** — Enter your name, pick an LLD problem (Movie Booking, Parking Lot, Splitwise)
2. **Interview Phases** — JARVIS conducts a 4-phase interview:
   - Phase 1: Gathering Requirements
   - Phase 2: Clarifying Requirements
   - Phase 3: Class Diagram (draw on Excalidraw canvas)
   - Phase 4: Schema Design (draw on Excalidraw canvas)
3. **Voice** — JARVIS speaks every response; you can reply by voice or text
4. **Scorecard** — Click "Get Scorecard" for detailed phase-by-phase markdown feedback

## 🎮 Controls

| Shortcut | Action |
|----------|--------|
| `Space`  | Toggle microphone on/off |
| `Enter`  | Send text message |
| 🔊 button | Mute/unmute JARVIS voice |
| 📋 button | Open requirements drawer |
| 🏆 button | Get LLD scorecard |

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express |
| AI | Anthropic Claude (claude-sonnet-4-20250514) |
| Voice Output | Web Speech API — SpeechSynthesis |
| Voice Input | Web Speech API — SpeechRecognition |
| Diagrams | @excalidraw/excalidraw |

## ⚠️ Browser Requirements

- **Chrome / Edge** recommended (full Web Speech API support)
- Firefox: voice input unsupported — text-only fallback activates automatically
- Safari: partial support

## 📁 Project Structure

```
├── backend/
│   ├── server.js          # Express proxy + mock mode
│   ├── .env               # API key (gitignored)
│   └── package.json
└── frontend/
    ├── src/
    │   ├── App.jsx                          # Phase state machine
    │   ├── components/
    │   │   ├── LandingScreen.jsx
    │   │   ├── InterviewScreen.jsx          # Main interview UI
    │   │   └── FeedbackModal.jsx
    │   └── utils/
    │       └── voice.js                     # Speech synthesis + recognition
    └── package.json
```