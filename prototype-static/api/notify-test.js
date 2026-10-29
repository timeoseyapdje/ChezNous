const { send } = require('./_stripe');
const { supabaseRest, requireUser } = require('./_supabase');

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Envoie à la personne connectée, et à elle seule, un exemple du rappel 24 h basé sur sa prochaine commande.
module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Méthode non autorisée' });
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !apiKey.startsWith('re_')) return send(res, 503, { error: "L'envoi de courriels n'est pas encore configuré." });
  try {
    const user = await requireUser(req);
    const [order] = await supabaseRest(
      'GET',
      `orders?buyer_id=eq.${user.id}&status=eq.confirmee&order=created_at.desc&limit=1&select=order_number,seller_name,items,slot,amount_cad`
    );
    const what = order
      ? `${escapeHtml(order.seller_name)} — ${escapeHtml((order.items || []).map(i => `${i.name} x${i.qty}`).join(', '))}`
      : 'Votre prochaine commande Chez Nous';
    const when = order && order.slot ? escapeHtml(order.slot) : 'dans 24 heures';

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'Chez Nous <aide@cheznous.ca>',
        to: user.email,
        subject: 'Test — rappel de votre commande Chez Nous',
        html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#131A17">
          <h2 style="color:#146B4F">Rappel : votre commande approche</h2>
          <p>${what}</p>
          <p><b>Quand :</b> ${when}${order ? `<br><b>Total payé :</b> ${Number(order.amount_cad).toFixed(2)} $ CA<br><b>Commande :</b> #${order.order_number}` : ''}</p>
          <p style="font-size:12px;color:#777">Ceci est un courriel de test envoyé depuis « Mes commandes ». Vous recevrez ce rappel automatiquement 24 h avant chaque rendez-vous.</p>
        </div>`,
      }),
    });
    if (!r.ok) {
      console.error('notify-test resend error:', r.status, await r.text());
      return send(res, 502, { error: "Le courriel n'a pas pu être envoyé." });
    }
    return send(res, 200, { sentTo: user.email });
  } catch (err) {
    console.error('notify-test error:', err.message);
    return send(res, err.status || 500, { error: err.status === 401 ? err.message : "Le courriel n'a pas pu être envoyé." });
  }
};
