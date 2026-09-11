// utils/brevo.js — Envoi d'email transactionnel via l'API REST Brevo
// Documentation : https://developers.brevo.com/reference/sendtransacemail

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

async function sendVerificationEmail(toEmail, code) {
  const response = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "api-key": process.env.BREVO_API_KEY
    },
    body: JSON.stringify({
      sender: {
        name: "NexChat",
        email: process.env.SENDER_EMAIL
      },
      to: [{ email: toEmail }],
      subject: "Ton code de vérification NexChat",
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 420px; margin: auto;">
          <h2 style="color:#FF6B00;">NexChat</h2>
          <p>Voici ton code de vérification :</p>
          <p style="font-size: 32px; font-weight: bold; letter-spacing: 6px;">${code}</p>
          <p style="color:#6B6B6B; font-size: 13px;">Ce code expire dans 10 minutes. Si tu n'es pas à l'origine de cette demande, ignore cet email.</p>
        </div>
      `
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Échec de l'envoi Brevo (${response.status}) : ${errorBody}`);
  }
}

module.exports = { sendVerificationEmail };
