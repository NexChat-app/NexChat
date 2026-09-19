const express = require('express');
const admin = require('firebase-admin');
const { AccessToken } = require('livekit-server-sdk');

const router = express.Router();

function getFirebaseAdmin() {
  if (admin.apps.length) return admin.app();

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not configured.');

  const serviceAccount = JSON.parse(raw);
  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

router.post('/token', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) return res.status(401).json({ error: 'Authentication required.' });

    const firebase = getFirebaseAdmin();
    const decoded = await firebase.auth().verifyIdToken(token);
    const roomName = String(req.body?.roomName || '').trim();
    const participantName = String(req.body?.participantName || decoded.uid).trim();

    if (!roomName) return res.status(400).json({ error: 'roomName is required.' });

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !livekitUrl) {
      return res.status(503).json({ error: 'LiveKit is not configured on the server.' });
    }

    const accessToken = new AccessToken(apiKey, apiSecret, {
      identity: decoded.uid,
      name: participantName,
      ttl: '2h',
    });

    accessToken.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    return res.json({
      token: await accessToken.toJwt(),
      url: livekitUrl,
    });
  } catch (error) {
    console.error(error);
    return res.status(401).json({ error: 'Invalid authentication or LiveKit configuration.' });
  }
});

module.exports = router;
