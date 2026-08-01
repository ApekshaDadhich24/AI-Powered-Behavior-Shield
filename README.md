# BehaviorShield

**Continuous authentication through behavioral biometrics — because a password only proves who logged in, not who's still there.**
BehaviorShield is a full-stack security platform that continuously verifies a user's identity *after* login by analyzing how they type and interact — not just what password they entered. Think of it as Stripe Radar, but for session security: a silent layer that watches behavior in real time and steps in the moment something looks wrong.

## Why
Traditional auth stops at the login screen. Once a session token is issued, most systems assume the same person is behind the keyboard for the rest of the session — an attacker with a stolen session cookie or an unlocked laptop can act freely. BehaviorShield closes that gap by treating authentication as continuous, not a one-time event.

## How It Works
1. **Enrollment** — the user's natural typing rhythm is captured as a behavioral baseline (keystroke timing, dwell time, flight time).
2. **Live Monitoring** — as the user interacts with the app, behavioral events stream over WebSocket to the backend every 2 seconds.
3. **AI Risk Scoring** — a Python microservice running an **Isolation Forest** anomaly detection model compares live behavior against the enrolled baseline and returns a risk score.
4. **Smoothing** — a 5-frame rolling window smooths the score to avoid false positives from momentary noise.
5. **Response** — depending on sustained risk level, the system returns one of three states:
   - `CLEAR` — behavior matches baseline, session continues normally
   - `STEP_UP_AUTH` — a warning is shown, and if anomalous behavior persists, a step-up OTP challenge is triggered
   - `CRITICAL_ANOMALY_TERMINATE_SESSION` — session is force-terminated

## Tech Stack 
- **Frontend:** React + Vite, deployed on Vercel
- **Backend:** Node.js / Express, deployed on Render, MongoDB Atlas for persistence
- **AI Service:** Python (Isolation Forest), deployed on Google Cloud Run
- **Real-time layer:** WebSocket bridge relaying behavioral frames between frontend, backend, and AI service

## Features
- 🔐 **Behavioral enrollment** — interactive keystroke-rhythm capture during onboarding
- 📊 **Live trust score gauge** — real-time speedometer-style visualization of session risk
- 🎹 **Interactive demos** — piano keyboard and canvas scribble pad to showcase live behavioral capture
- 📈 **Session analytics** — historical trust score trends per session (Recharts sparklines)
- ⚠️ **Step-up authentication** — automatic OTP challenge triggered by sustained anomalous behavior
- 🛡️ **Dual-layer anomaly detection** — Node-side sustained-anomaly counter as a fail-safe independent of the AI service
- 🔄 **Resilient WebSocket handling** — automatic reconnection and graceful recovery from AI service cold starts

## Getting Started
### Prerequisites
- Node.js 18+
- MongoDB Atlas account (or local MongoDB instance)

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env   # fill in your own values
npm start
```
### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env   # fill in your own values
npm run dev
```

## Author
**Apeksha Dadhich**
Built as a demonstration of full-stack development, real-time systems, and applied ML for behavioral security.
