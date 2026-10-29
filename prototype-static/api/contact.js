const { IS_DEMO, readJson, send } = require('./_stripe');

const SUBJECTS = ['Question sur une commande', 'Devenir vendeur', 'Signaler un problème', 'Autre demande'];

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Formulaire de contact : transmis à l'équipe par Resend, avec l'adresse du visiteur en « répondre à ».
module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Méthode non autorisée' });
  if (IS_DEMO) return send(res, 200, { demo: true });
  try {
    const body = await readJson(req);
    // Champ invisible pour les humains : un robot qui le remplit reçoit un succès sans que rien ne parte.
    if (body.website) return send(res, 200, { sent: true });
    const name = String(body.name || '').trim().slice(0, 100);
    const email = String(body.email || '').trim().slice(0, 200);
    const subject = SUBJECTS.includes(body.subject) ? body.subject : 'Autre demande';
    const message = String(body.message || '').trim().slice(0, 5000);
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || message.length < 10) {
      return send(res, 400, { error: 'Merci de renseigner votre nom, un courriel valide et un message d\'au moins 10 caractères.' });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey || !apiKey.startsWith('re_')) return send(res, 503, { error: 'L\'envoi de messages n\'est pas encore disponible. Écrivez-nous à aide@cheznous.ca.' });
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'Chez Nous <aide@cheznous.ca>',
        to: process.env.CONTACT_TO || 'aide@cheznous.ca',
        reply_to: email,
        subject: `[Contact] ${subject} — ${name}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:560px;color:#131A17">
          <p><b>De :</b> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;<br><b>Sujet :</b> ${escapeHtml(subject)}</p>
          <p style="white-space:pre-wrap">${escapeHtml(message)}</p>
        </div>`,
      }),
    });
    if (!r.ok) {
      console.error('contact resend error:', r.status, await r.text());
      return send(res, 502, { error: 'Le message n\'a pas pu être envoyé. Écrivez-nous à aide@cheznous.ca.' });
    }
    return send(res, 200, { sent: true });
  } catch (err) {
    console.error('contact error:', err.message);
    return send(res, 500, { error: 'Le message n\'a pas pu être envoyé. Écrivez-nous à aide@cheznous.ca.' });
  }
};
