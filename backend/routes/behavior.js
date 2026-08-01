const express = require('express');
const axios = require('axios');
const WebSocket = require('ws');
const User = require('../models/User');
// --- NEW: persistence models ---
const Session = require('../models/Session');
const ScoreEvent = require('../models/ScoreEvent');
// --- END NEW ---

const router = express.Router();
const AI_URL = process.env.AI_URL;

router.post('/enroll/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { events } = req.body;

    const aiResponse = await axios.post(
      `${AI_URL}/api/enroll/${userId}`,
      { events },
      { timeout: 10000 }
    );
    console.log('Python AI responded:', aiResponse.data);

    if (aiResponse.data.status === 'SUCCESS') {
      await User.findByIdAndUpdate(userId, {
        is_enrolled: true
      });
    }

    res.json({
      message: 'Enrollment complete!',
      status: aiResponse.data.status
    });

  } catch (error) {
    res.status(500).json({
      message: 'Enrollment failed',
      error: error.message
    });
  }
});

router.get('/status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      is_enrolled: user.is_enrolled,
      username: user.username
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

const setupWebSocket = (server) => {
  const wss = new WebSocket.Server({ server });

  wss.on('connection', (ws, req) => {
    const userId = req.url.split('/').pop();
    console.log(`WebSocket connected for user: ${userId}`);

    // --- NEW: create a Session doc for this connection. Best-effort —
    // if this fails, the live relay below is completely unaffected;
    // sessionDoc just stays null and score events simply won't be saved.
    let sessionDoc = null;
    let sessionFrameCount = 0;
    let sessionScoreSum = 0;
    let sessionMinScore = null;
    let sessionAnomalyCount = 0;
    let sessionEndReason = 'normal';

    Session.create({ userId })
      .then((doc) => { sessionDoc = doc; })
      .catch((err) => console.log(`Session create failed for user ${userId}:`, err.message));
    // --- END NEW ---

    // ============ RISK SMOOTHING STATE ============
    // Rolling window: 5 frames at a 2s send cadence ≈ last 10 seconds of behavior.
    const RISK_WINDOW_SIZE = 5;
    // Average risk (0-100) across the window must stay above this to trigger a warning.
    const RISK_AVG_THRESHOLD = 50;
    // OR: this many STEP_UP_AUTH verdicts in a row (within the window above)
    // triggers a warning regardless of the average.
    const CONSECUTIVE_STEP_UP_LIMIT = 8;

    // --- NEW: hard termination threshold ---
    // consecutiveStepUp above is capped at RISK_WINDOW_SIZE (5), so it can
    // never tell us "this has been bad for a long time" — only "bad right
    // now". sustainedBadFrames below is a separate, UNCAPPED counter that
    // tracks how many consecutive frames the *smoothed* decision has been
    // STEP_UP_AUTH. Once behavior stays bad this long, we terminate the
    // session ourselves instead of waiting on the Python AI to ask for it.
    // 8 frames at a 2s send cadence ≈ 16 seconds of sustained anomalous
    // behavior. Tune this up/down depending on how strict you want it.
    const CONSECUTIVE_TERMINATE_LIMIT = 8;
    let sustainedBadFrames = 0;
    // --- END NEW ---

    const GOOD_VERDICT = 'CLEAR';
    const STEP_UP_VERDICT = 'STEP_UP_AUTH';

    const riskHistory = [];
    const verdictHistory = [];

    let aiWs = null;
    let aiReconnectTimer = null;
    let frontendClosed = false;
    const AI_RECONNECT_DELAY_MS = 1500;
    const MAX_AI_RECONNECT_ATTEMPTS = 5;
    let aiReconnectAttempts = 0;

    const connectToAI = () => {
      aiWs = new WebSocket(
        `${AI_URL.replace('https://', 'wss://')}/ws/auth/${userId}`
      );

      aiWs.on('open', () => {
        console.log(`AI WebSocket connected for user: ${userId}`);
        aiReconnectAttempts = 0; 
      });

      aiWs.on('message', (data) => {
        console.log(`RAW AI MESSAGE for ${userId}:`, data.toString());

        if (ws.readyState !== WebSocket.OPEN) return;

        let response;
        try {
          response = JSON.parse(data);
        } catch (err) {
          console.log(`Bad JSON from AI for user ${userId}:`, err.message);
          return;
        }
      

        if (response.status === 'CONNECTED') {
          ws.send(JSON.stringify(response));
          return;
        }

        if (response.status === 'WAITING') {
          ws.send(JSON.stringify(response));
          return;
        }

        if (response.action === 'FORCE_LOGOUT') {
          console.log(`FORCE_LOGOUT (from AI) for user ${userId}: ${response.reason}`);
          // --- NEW ---
          sessionEndReason = 'force_logout_ai';
          // --- END NEW ---
          ws.send(JSON.stringify(response));
          return;
        }

        if (response.status !== 'PROCESSED') {
          return;
        }

        // ---- Update rolling history ----
        const latestVerdict = response.verdict || GOOD_VERDICT;
        const latestRisk = Number.isFinite(response.risk_score) ? response.risk_score : 0;

        verdictHistory.push(latestVerdict);
        if (verdictHistory.length > RISK_WINDOW_SIZE) verdictHistory.shift();

        riskHistory.push(latestRisk);
        if (riskHistory.length > RISK_WINDOW_SIZE) riskHistory.shift();

        // ---- Consecutive STEP_UP_AUTH streak (from the tail backward, within window) ----
        let consecutiveStepUp = 0;
        for (let i = verdictHistory.length - 1; i >= 0; i--) {
          if (verdictHistory[i] === STEP_UP_VERDICT) {
            consecutiveStepUp++;
          } else {
            break;
          }
        }

        // ---- Rolling average risk over the window ----
        const avgRisk = riskHistory.reduce((a, b) => a + b, 0) / riskHistory.length;

        // ---- Trigger conditions ----
        const trendIsBad = avgRisk >= RISK_AVG_THRESHOLD;
        const consecutiveIsBad = consecutiveStepUp >= CONSECUTIVE_STEP_UP_LIMIT;
        const smoothedDecision = (trendIsBad || consecutiveIsBad) ? STEP_UP_VERDICT : GOOD_VERDICT;

        // --- NEW: track sustained bad behavior across the whole session,
        // not just the last 5 frames, and force-logout once it's persisted
        // too long.
        if (smoothedDecision === STEP_UP_VERDICT) {
          sustainedBadFrames++;
        } else {
          sustainedBadFrames = 0;
        }

        if (sustainedBadFrames >= CONSECUTIVE_TERMINATE_LIMIT) {
          console.log(`FORCE_LOGOUT (sustained anomaly) for user ${userId}: ${sustainedBadFrames} consecutive bad frames`);
          sessionEndReason = 'force_logout_sustained';

          if (sessionDoc) {
            sessionFrameCount++;
            sessionScoreSum += (response.behavior_confidence ?? 100);
            sessionAnomalyCount++;
            ScoreEvent.create({
              sessionId: sessionDoc._id,
              userId,
              trustScore: response.behavior_confidence ?? 100,
              riskScore: latestRisk,
              avgRiskScore: Math.round(avgRisk * 10) / 10,
              decision: smoothedDecision,
              rawVerdict: latestVerdict,
              consecutiveBad: consecutiveStepUp,
            }).catch((err) => console.log(`ScoreEvent save failed for user ${userId}:`, err.message));
          }

          ws.send(JSON.stringify({
            action: 'FORCE_LOGOUT',
            reason: `Sustained anomalous behavior detected for ${sustainedBadFrames} consecutive frames (~${sustainedBadFrames * 2}s). Session terminated for your protection.`,
          }));
          return;
        }
        // --- END NEW ---

        const trustScoreValue = response.behavior_confidence ?? 100;

        // --- NEW: persist this scored frame + update in-memory session summary.
        // Fire-and-forget — never awaited, never blocks the ws.send() below.
        if (sessionDoc) {
          sessionFrameCount++;
          sessionScoreSum += trustScoreValue;
          sessionMinScore = sessionMinScore === null ? trustScoreValue : Math.min(sessionMinScore, trustScoreValue);
          if (smoothedDecision !== GOOD_VERDICT) sessionAnomalyCount++;

          ScoreEvent.create({
            sessionId: sessionDoc._id,
            userId,
            trustScore: trustScoreValue,
            riskScore: latestRisk,
            avgRiskScore: Math.round(avgRisk * 10) / 10,
            decision: smoothedDecision,
            rawVerdict: latestVerdict,
            consecutiveBad: consecutiveStepUp,
          }).catch((err) => console.log(`ScoreEvent save failed for user ${userId}:`, err.message));
        }
        // --- END NEW ---

        ws.send(JSON.stringify({
          ...response,
          trust_score: trustScoreValue,
          risk_score: latestRisk,
          avg_risk_score: Math.round(avgRisk * 10) / 10,
          risk_window_size: riskHistory.length,
          decision: smoothedDecision,
          raw_verdict: latestVerdict,
          consecutive_bad: consecutiveStepUp,
        }));
      });

      aiWs.on('close', (code, reason) => {
        console.log(`AI disconnected for user: ${userId} | code: ${code} | reason: ${reason.toString()}`);

        if (frontendClosed || code === 1000) return;

        if (aiReconnectAttempts >= MAX_AI_RECONNECT_ATTEMPTS) {
          console.log(`Giving up on AI reconnect for user ${userId} after ${aiReconnectAttempts} attempts.`);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              status: 'AI_UNAVAILABLE',
              message: 'Behavioral engine is unreachable. Retrying will not help right now.',
            }));
          }
          // --- NEW ---
          sessionEndReason = 'ai_unavailable';
          // --- END NEW ---
          return;
        }

        aiReconnectAttempts++;
        console.log(`Reconnecting to AI for user ${userId} (attempt ${aiReconnectAttempts})...`);
        aiReconnectTimer = setTimeout(connectToAI, AI_RECONNECT_DELAY_MS);
      });

      aiWs.on('error', (err) => {
        console.log(`AI WebSocket error: ${err.message}`);
      });
    };

    ws.on('message', (data) => {
      console.log(`Frontend -> AI for ${userId}:`, data.toString());
      if (aiWs && aiWs.readyState === WebSocket.OPEN) {
        aiWs.send(data.toString());
      }
    });

    ws.on('close', () => {
      console.log(`Frontend disconnected for user: ${userId}`);
      frontendClosed = true;
      clearTimeout(aiReconnectTimer);
      if (aiWs) aiWs.close();

      // --- NEW: finalize the session doc with summary stats.
      // Best-effort — if sessionDoc was never created (e.g. Mongo hiccup on
      // connect), this is silently skipped; nothing here can throw upward.
      if (sessionDoc) {
        Session.findByIdAndUpdate(sessionDoc._id, {
          endedAt: new Date(),
          endReason: sessionEndReason,
          frameCount: sessionFrameCount,
          avgTrustScore: sessionFrameCount ? Math.round((sessionScoreSum / sessionFrameCount) * 10) / 10 : null,
          minTrustScore: sessionMinScore,
          anomalyCount: sessionAnomalyCount,
        }).catch((err) => console.log(`Session finalize failed for user ${userId}:`, err.message));
      }
      // --- END NEW ---
    });

    connectToAI();
  });

  return wss;
};

module.exports = { router, setupWebSocket };