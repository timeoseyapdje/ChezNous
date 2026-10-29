const crypto = require('crypto');
const { readJson, send } = require('./_stripe');
const { supabaseRest, requireUser } = require('./_supabase');

const MAX_ATTEMPTS = 5;

function sameCode(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

// Le vendeur saisit le code que le client lui donne à la réception : le séquestre est alors libéré.
// Le code n'est jamais renvoyé au vendeur, et les essais sont limités pour empêcher de le deviner.
module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Méthode non autorisée' });
  try {
    const user = await requireUser(req);
    const { orderNumber, code } = await readJson(req);
    const number = Number(orderNumber);
    if (!Number.isInteger(number) || number <= 0) return send(res, 400, { error: 'Commande invalide' });

    const [order] = await supabaseRest('GET', `orders?order_number=eq.${number}&seller_id=eq.${user.id}&select=order_number,status,escrow_status,release_code,release_attempts`);
    if (!order) return send(res, 404, { error: 'Commande introuvable' });
    if (order.status !== 'confirmee' || order.escrow_status !== 'retenu') return send(res, 409, { error: 'Cette commande n\'attend plus de code.' });
    if ((order.release_attempts || 0) >= MAX_ATTEMPTS) return send(res, 429, { error: 'Trop d\'essais : contactez notre équipe pour débloquer le paiement.' });

    if (!sameCode(String(code || '').trim().toUpperCase(), order.release_code)) {
      await supabaseRest('PATCH', `orders?order_number=eq.${number}`, { release_attempts: (order.release_attempts || 0) + 1 }, { Prefer: 'return=minimal' });
      return send(res, 400, { error: 'Code incorrect. Vérifiez avec le client.' });
    }
    await supabaseRest('PATCH', `orders?order_number=eq.${number}&escrow_status=eq.retenu`, { status: 'terminee', escrow_status: 'libéré' }, { Prefer: 'return=minimal' });
    return send(res, 200, { released: true });
  } catch (err) {
    console.error('release-order error:', err.message);
    return send(res, err.status || 500, { error: err.status === 401 ? err.message : 'Validation impossible pour le moment.' });
  }
};
