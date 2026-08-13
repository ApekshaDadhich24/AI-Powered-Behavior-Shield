# 🛡️ BehaviorShield

**AI-Powered Continuous Behavioral Authentication**
BehaviorShield is a full-stack security platform that continuously verifies a user's identity *after* login — not just at the login screen. It analyzes how a person types, moves their mouse, and interacts with the app in real time, using an AI model to detect anomalies that could indicate a session takeover or unauthorized access, and automatically forces re-authentication when something looks off.
Think of it as **"Stripe, but for continuous authentication"** — a Behavior-as-a-Service platform that any application can plug into.


## ✨ Features
- **Continuous Authentication** — Monitors keyboard and mouse behavior throughout an active session, not just at login.
- **AI-Powered Anomaly Detection** — A Python microservice running an Isolation Forest model scores each behavioral frame in real time and returns a verdict (`CLEAR`, `STEP_UP_AUTH`, or `CRITICAL_ANOMALY_TERMINATE_SESSION`).
- **Live Trust Score Dashboard** — Real-time speedometer gauge and Recharts sparkline visualizing trust score over the last 10 frames.
- **Smart Force-Logout Logic** — Tracks consecutive anomalous frames with decay-based forgiveness (a clean frame partially offsets past risk) instead of a single bad frame ending the session.
- **Step-Up Re-Authentication (OTP)** — After a forced logout, users must verify their identity via a one-time password sent through a verified custom email domain before regaining access.
- **Session Analytics** — Full session history and behavioral timeline persisted to MongoDB for post-session review.
- **Interactive Behavioral Widgets** — A piano/keyboard and canvas scribble pad used to naturally capture keystroke and mouse-movement biometrics during demos.
- **Real-Time Communication** — WebSocket-based pipeline streams behavioral frames from client → backend → AI service and back.


## 🏗️ URL's
- **Frontend:** `behaviorshield.dadhichapeksha.in`
- **Backend API:** `api.behaviorshield.dadhichapeksha.in`
- **Transactional Email:** `mail.behaviorshield.dadhichapeksha.in` (via Resend)


## 🧰 Tech Stack
- Frontend - React, Vite, Framer Motion, Recharts 
- Backend - Node.js, Express, WebSocket (ws) 
- Database - MongoDB Atlas, Mongoose 
- AI/ML Service - Python, Isolation Forest (scikit-learn) 
- Hosting - Vercel (frontend), Render (backend), Google Cloud Run (AI service) 
- Email - Resend (custom verified domain, DKIM/SPF/MX configured) 


## ⚙️ How It Works
1. **Enrollment** — On first use, the user's baseline keystroke and mouse behavior is captured and stored.
2. **Live Monitoring** — During a session, behavioral events (keystrokes, mouse movement) are streamed over WebSocket in real time.
3. **AI Scoring** — Each frame is sent to the Python AI service, which returns a trust verdict based on deviation from the user's baseline.
4. **Adaptive Response**:
   - `CLEAR` → session continues normally.
   - Repeated anomalies → a warning is shown to the user.
   - Sustained anomalous behavior (7+ consecutive bad frames, with decay for recovery) → the session is force-terminated.
5. **Step-Up Verification** — On re-login after a forced logout, the user must complete OTP verification via email before being granted full access again.
6. **Analytics** — All sessions and per-frame scores are persisted to MongoDB, viewable in a Session Analytics dashboard.


## 🚀 Getting Started
### Prerequisites
- Node.js (v18+)
- MongoDB Atlas account
- Resend account (for email/OTP)
- Python 3.9+ (for the AI service)

### Installation
```bash
# Clone the repo
git clone https://github.com/ApekshaDadhich24/AI-Powered-Behavior-Shield.git
cd AI-Powered-Behavior-Shield

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Environment Variables
Create a `.env` file in both `backend/` and `frontend/` based on the provided `.env.example` files. Key variables include:

```env
# Backend
MONGO_URI=
RESEND_API_KEY=
JWT_SECRET=
AI_SERVICE_URL=

# Frontend
VITE_BACKEND_URL=
```

### Running Locally

```bash
# Start backend
cd backend
npm run dev

# Start frontend
cd frontend
npm run dev
```


## 📊 Roadmap
- [x] Live behavioral monitoring & trust score engine
- [x] Force-logout & step-up OTP re-authentication
- [x] Session persistence (MongoDB)
- [x] Session Analytics frontend dashboard
- [x] User profile management tab
- [ ] Production deployment & end-to-end testing


## 👩‍💻 Author
**Apeksha Dadhich**
- [GitHub](https://github.com/ApekshaDadhich24)
- [LinkedIn](www.linkedin.com/in/apeksha-dadhich)
