import { brevoConfig } from '../config/brevo';

async function post(path: string, body: Record<string, unknown>) {
  const response = await fetch(`${brevoConfig.baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Une erreur est survenue.');
  return data;
}

export function sendVerificationCode(email: string) {
  return post(brevoConfig.sendCodePath, { email: email.trim().toLowerCase() });
}

export function verifyVerificationCode(email: string, code: string) {
  return post(brevoConfig.verifyCodePath, { email: email.trim().toLowerCase(), code: code.trim() });
}
