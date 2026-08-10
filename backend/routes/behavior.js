const express = require('express');
const axios = require('axios');
const WebSocket = require('ws');
const User = require('../models/User');
const Session = require('../models/Session');
const ScoreEvent = require('../models/ScoreEvent');

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

    let sessionDoc = null;
    let sessionFrameCount = 0;
    let sessionScoreSum = 0;
    let sessionMinScore = null;
    let sessionAnomalyCount = 0;
    let sessionEndReason = 'normal';

    Session.create({ userId })
      .then((doc) => { sessionDoc = doc; })
      .catch((err) => console.log(`Session create failed for user ${userId}:`, err.message));

    // ============ RISK SMOOTHING STATE ============
    const RISK_WINDOW_SIZE = 5;
    // Drives the softer, avg-based "elevated risk" banner in the UI. Not
    // used for termination — see sustainedBadFrames below for that.
    const RISK_AVG_THRESHOLD = 50;

    // Hard termination threshold — driven by the AI's raw per-frame
    // verdict, not the smoothed average (the average rarely reaches
    // RISK_AVG_THRESHOLD even during genuinely sustained anomalous
    // behavior, confirmed via real testing). 7 frames at a 2s send cadence
    // ≈ 14 seconds of sustained anomalous behavior.
    const CONSECUTIVE_TERMINATE_LIMIT = 7;
    // A single clean frame doesn't wipe the streak back to 0 — it only
    // partially forgives it, since real anomalous sessions are rarely
    // perfectly uniform frame-to-frame.
    const DECAY_ON_CLEAR = 2;
    let sustainedBadFrames = 0;

    const GOOD_VERDICT = 'CLEAR';
    const STEP_UP_VERDICT = 'STEP_UP_AUTH';

    const riskHistory = [];

    let aiWs = null;
    let aiReconnectTimer = null;
    let frontendClosed = false;
    const AI_RECONNECT_DELAY_MS = 1500;
    const MAX_AI_RECONNECT_ATTEMPTS = 5;
    let aiReconnectAttempts = 0;

    // Flags this account so the NEXT login attempt (by anyone — real user
    // or attacker) is gated behind OTP email verification instead of a
    // normal password-only login. Fire-and-forget, same pattern as the
    // other persistence calls in this file — never blocks the ws relay.
    const flagRequiresStepUp = () => {
      User.findByIdAndUpdate(userId, { requiresStepUp: true })
        .catch((err) => console.log(`Failed to set requiresStepUp for user ${userId}:`, err.message));
    };

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
          sessionEndReason = 'force_logout_ai';
          flagRequiresStepUp();
          ws.send(JSON.stringify(response));
          return;
        }

        if (response.status !== 'PROCESSED') {
          return;
        }

        const latestVerdict = response.verdict || GOOD_VERDICT;
        const latestRisk = Number.isFinite(response.risk_score) ? response.risk_score : 0;

        riskHistory.push(latestRisk);
        if (riskHistory.length > RISK_WINDOW_SIZE) riskHistory.shift();

        const avgRisk = riskHistory.reduce((a, b) => a + b, 0) / riskHistory.length;

        const trendIsBad = avgRisk >= RISK_AVG_THRESHOLD;
        const smoothedDecision = trendIsBad ? STEP_UP_VERDICT : GOOD_VERDICT;

        if (latestVerdict === STEP_UP_VERDICT) {
          sustainedBadFrames++;
        } else {
          sustainedBadFrames = Math.max(0, sustainedBadFrames - DECAY_ON_CLEAR);
        }

        if (sustainedBadFrames >= CONSECUTIVE_TERMINATE_LIMIT) {
          console.log(`FORCE_LOGOUT (sustained anomaly) for user ${userId}: ${sustainedBadFrames} consecutive bad frames`);
          sessionEndReason = 'force_logout_sustained';
          flagRequiresStepUp();

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
              consecutiveBad: sustainedBadFrames,
            }).catch((err) => console.log(`ScoreEvent save failed for user ${userId}:`, err.message));
          }

          ws.send(JSON.stringify({
            action: 'FORCE_LOGOUT',
            reason: `Sustained anomalous behavior detected for ${sustainedBadFrames} consecutive frames (~${sustainedBadFrames * 2}s). Session terminated for your protection. You'll need to verify your email to log back in.`,
          }));
          return;
        }

        const trustScoreValue = response.behavior_confidence ?? 100;

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
            consecutiveBad: sustainedBadFrames,
          }).catch((err) => console.log(`ScoreEvent save failed for user ${userId}:`, err.message));
        }

        ws.send(JSON.stringify({
          ...response,
          trust_score: trustScoreValue,
          risk_score: latestRisk,
          avg_risk_score: Math.round(avgRisk * 10) / 10,
          risk_window_size: riskHistory.length,
          decision: smoothedDecision,
          raw_verdict: latestVerdict,
          consecutive_bad: sustainedBadFrames,
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
          sessionEndReason = 'ai_unavailable';
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
    });

    connectToAI();
  });

  return wss;
};

module.exports = { router, setupWebSocket };