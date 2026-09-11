// routes/auth.js — /api/auth/send-code et /api/auth/verify-code
//
// NOTE (à faire évoluer à une prochaine étape) : les codes sont actuellement
// stockés en mémoire du process. Sur Render (plan gratuit), le service peut
// redémarrer/se mettre en veille, ce qui invaliderait les codes en attente.
// Pour la suite, on pourra migrer ce stockage vers Firestore (collection
// "verificationCodes") si besoin de persistance entre redémarrages.

const express = require("express");
const { sendVerificationEmail } = require("../utils/brevo");

const router = express.Router();

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const pendingCodes = new Map(); // email -> { code, expiresAt }

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

router.post("/send-code", async (req, res) => {
  const { email } = req.body;
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ error: "Adresse email invalide." });
  }

  const code = generateCode();
  pendingCodes.set(email, { code, expiresAt: Date.now() + CODE_TTL_MS });

  try {
    await sendVerificationEmail(email, code);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Impossible d'envoyer l'email de vérification." });
  }
});

router.post("/verify-code", (req, res) => {
  const { email, code } = req.body;
  const entry = pendingCodes.get(email);

  if (!entry) {
    return res.status(400).json({ error: "Aucun code en attente pour cet email." });
  }
  if (Date.now() > entry.expiresAt) {
    pendingCodes.delete(email);
    return res.status(400).json({ error: "Le code a expiré, demande un nouveau code." });
  }
  if (entry.code !== String(code).trim()) {
    return res.status(400).json({ error: "Code incorrect." });
  }

  pendingCodes.delete(email);
  res.json({ ok: true });
});

module.exports = router;
