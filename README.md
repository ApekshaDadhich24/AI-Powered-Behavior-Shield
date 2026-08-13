## BehaviorShield

AI-Powered Continuous Behavioral Authentication

BehaviorShield is a full-stack Behavior-as-a-Service (BaaS) platform that continuously verifies a user's identity after login — not just at it. Instead of relying on a single password check, it watches how you actually type and move your mouse, scores that behavior in real time against your personal baseline, and automatically challenges or logs out sessions that start looking suspicious.

Think of it as "Stripe, but for continuous security" — a drop-in behavioral authentication layer any app could plug into.

## Features
🔐 Continuous Behavioral Monitoring
Real-time keystroke dynamics and mouse movement capture via interactive widgets (piano/keyboard tone player, canvas scribble pad)
Behavioral signals streamed over WebSocket to an AI scoring engine every few seconds
Live trust-score gauge (speedometer-style, conic-gradient arc) plus a rolling sparkline of the last 10 scored frames
🤖 AI Anomaly Detection
Python microservice using an Isolation Forest model to detect deviations from a user's enrolled behavioral baseline
Three-tier verdict system: CLEAR, STEP_UP_AUTH (warning), CRITICAL_ANOMALY_TERMINATE_SESSION
Decay-based scoring — a single bad frame doesn't nuke the session, but sustained anomalous behavior (7+ consecutive bad frames) triggers a forced logout
🔑 Step-Up Authentication (OTP)
On forced logout, re-entry is gated behind a one-time password sent via email (Resend, on a custom verified domain)
Hashed OTP storage, 5-minute expiry, 5-attempt rate limit, 30-second resend cooldown
Non-disruptive in-session warning modal at early anomaly signs, auto-dismissing on recovery — full OTP challenge only follows an actual force-logout, not mid-session
📊 Session Analytics
Full session history with timeline view of trust-score evolution per session
Behavioral signal breakdown (keyboard/mouse event counts) per session
Persisted via MongoDB (Session and ScoreEvent models) for post-hoc review
👤 Profile Management
User enrollment and baseline calibration flow
Account-level settings and session overview

## Architecture
┌─────────────────┐        WebSocket         ┌──────────────────┐        REST/WS      ┌───────────────────┐
│  React Frontend │ ◄──────────────────────► │  Node/Express API│ ◄──────────────────►│  Python AI Service│
│    (Vercel)     │                          │     (Render)     │                     │ (Google Cloud Run)│
└────────┬────────┘                          └─────────┬────────┘                     └───────────────────┘
         │                                              │                                    Isolation Forest
         │                                              ▼                                    behavioral scoring
         │                                     ┌──────────────────┐
         │                                     │   MongoDB Atlas  │
         │                                     │ Users · Sessions │
         │                                     │ ScoreEvents · OTP│
         │                                     └──────────────────┘
         │
         └──────────────► Resend (email/OTP) via mail.behaviorshield.dadhichapeksha.in
         
## Backend Module Breakdown
Module	Responsibility
routes/auth.js	Signup/login, JWT issuance
routes/behavior.js	WebSocket handler — receives live behavioral frames, forwards to the AI service, applies decay logic, triggers force-logout
routes/stepUpAuth.js	OTP generation, verification, resend, rate limiting
routes/sessions.js	Session history + timeline REST endpoints for the Session Analytics tab
routes/profile.js	User profile data
models/User.js	User account, enrollment status, requiresStepUp flag
models/Session.js	One document per monitoring session
models/ScoreEvent.js	One document per scored behavioral frame within a session
models/Otp.js	Hashed OTP, expiry, attempt count
Utils/mailer.js	Resend email client
Utils/otp.js	OTP generation/hashing helpers

## Planned production domains:
Service	Domain
Frontend (Vercel)	behaviorshield.dadhichapeksha.in
Backend API (Render)	api.behaviorshield.dadhichapeksha.in
Transactional email (Resend)	mail.behaviorshield.dadhichapeksha.in

## Tech Stack
Layer	Technology
Frontend	React, Vite, Framer Motion, Recharts
Backend	Node.js, Express, WebSocket
Database	MongoDB Atlas (Mongoose)
AI Service	Python, scikit-learn (Isolation Forest)
Email/OTP	Resend
Hosting	Vercel (frontend), Render (backend), Google Cloud Run (AI service)

## Project Structure
AI-Powered-Behavior-Shield/
├── backend/
│   ├── models/
│   │   ├── Otp.js
│   │   ├── ScoreEvent.js
│   │   ├── Session.js
│   │   └── User.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── behavior.js          # WebSocket scoring/persistence handler
│   │   ├── profile.js
│   │   ├── sessions.js          # session history + timeline endpoints
│   │   └── stepUpAuth.js        # OTP challenge routes
│   ├── Utils/
│   │   ├── mailer.js            # Resend integration
│   │   └── otp.js               # OTP generation/hashing/validation
│   ├── .env / .env.example
│   ├── package.json
│   └── server.js
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── CustomCursor.jsx
│   │   │   └── Stepupotpmodal.jsx
│   │   ├── context/
│   │   │   ├── AuthContext.jsx
│   │   │   ├── BehaviorSocketContext.jsx
│   │   │   └── ThemeContext.jsx
│   │   ├── hooks/
│   │   │   └── useBehavior.js
│   │   ├── pages/
│   │   │   ├── AuthPage.css / Authvisual.jsx
│   │   │   ├── Dashboard.css / Dashboard.jsx
│   │   │   ├── Enrollkeyboard.jsx
│   │   │   ├── Enrollpage.css / EnrollPage.jsx
│   │   │   ├── LandingPage.css / LandingPage.jsx
│   │   │   ├── Livemonitor.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   ├── Profile.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   └── SessionAnalytics.jsx
│   │   ├── App.css / App.jsx
│   │   ├── config.js
│   │   ├── index.css
│   │   └── main.jsx
│   ├── .env.example
│   ├── eslint.config.js
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── README.md
│
├── .gitignore
└── README.md

The Python AI scoring service (Isolation Forest, deployed on Google Cloud Run) lives in a separate repository and communicates with backend/routes/behavior.js over WebSocket.

## Getting Started
Prerequisites
Node.js 18+
Python 3.10+
MongoDB Atlas connection string
Resend API key + verified sending domain
Backend
bash
cd backend
npm install
cp .env.example .env   # fill in MONGO_URI, RESEND_API_KEY, JWT_SECRET, etc.
node server.js          # or: npm run dev, if a dev script is configured
Frontend
bash
cd frontend
npm install
cp .env.example .env   # set VITE_BACKEND_URL
npm run dev
AI Service
bash
cd ai-service
pip install -r requirements.txt
python app.py

## Roadmap
 Real-time behavioral capture (keyboard + mouse)
 Isolation Forest anomaly scoring pipeline
 Force-logout + OTP step-up authentication flow
 Session Analytics dashboard
 Custom domain email delivery via Resend
 Static pricing page (SaaS-style tiers, no live payment integration)
 Public API docs for third-party integration
 Persistent AI baseline storage (currently lost on Cloud Run scale-to-zero)

## Author

Apeksha Dadhich GitHub · LinkedIn
