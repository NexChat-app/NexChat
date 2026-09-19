const express = require('express');
const crypto = require('crypto');

const router = express.Router();
const pendingCodes = new Map();
const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function hashCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

function generateCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

async function sendEmail({ email, code }) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.SENDER_EMAIL;
  const senderName = process.env.SENDER_NAME || 'NexChat';

  if (!apiKey || !senderEmail) {
    throw new Error('Brevo is not configured on the server.');
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to: [{ email }],
      subject: 'Ton code de vérification NexChat',
      htmlContent: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#171A24">
          <h2 style="margin-bottom:8px">Vérification NexChat</h2>
          <p>Utilise ce code pour confirmer ton adresse e-mail :</p>
          <div style="font-size:32px;font-weight:800;letter-spacing:8px;margin:24px 0;color:#6180F2">${code}</div>
          <p style="color:#6E7485">Le code expire dans 10 minutes. Si tu n'es pas à l'origine de cette demande, ignore cet e-mail.</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Brevo error ${response.status}: ${body || 'email delivery failed'}`);
  }
}

router.post('/send-code', async (req, res) => {
  const email = normalizeEmail(req.body?.email);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Adresse e-mail invalide.' });
  }

  const existing = pendingCodes.get(email);
  if (existing && Date.now() - existing.sentAt < RESEND_COOLDOWN_MS) {
    return res.status(429).json({ error: 'Attends une minute avant de demander un nouveau code.' });
  }

  const code = generateCode();

  try {
    await sendEmail({ email, code });
    pendingCodes.set(email, {
      codeHash: hashCode(code),
      expiresAt: Date.now() + CODE_TTL_MS,
      sentAt: Date.now(),
      attempts: 0,
    });
    return res.json({ ok: true });
  } catch (error) {
    console.error(error);
    return res.status(502).json({ error: 'Impossible d’envoyer le code de vérification.' });
  }
});

router.post('/verify-code', (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const code = String(req.body?.code || '').trim();
  const pending = pendingCodes.get(email);

  if (!pending || Date.now() > pending.expiresAt) {
    pendingCodes.delete(email);
    return res.status(400).json({ error: 'Code expiré ou introuvable.' });
  }

  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: 'Code invalide.' });
  }

  pending.attempts += 1;
  if (pending.attempts > 5) {
    pendingCodes.delete(email);
    return res.status(429).json({ error: 'Trop de tentatives. Demande un nouveau code.' });
  }

  if (hashCode(code) !== pending.codeHash) {
    return res.status(400).json({ error: 'Code incorrect.' });
  }

  pendingCodes.delete(email);
  return res.json({ ok: true, verified: true });
});

module.exports = router;
