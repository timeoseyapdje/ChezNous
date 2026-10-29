const { stripeRequest, readJson, send } = require('./_stripe');
const { supabaseRest, requireUser } = require('./_supabase');

// Annulation par l'acheteur tant que l'argent est en séquestre : remboursement Stripe réel de la part de ce vendeur.
module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Méthode non autorisée' });
  try {
    const user = await requireUser(req);
    const { orderNumber } = await readJson(req);
    const number = Number(orderNumber);
    if (!Number.isInteger(number) || number <= 0) return send(res, 400, { error: 'Commande invalide' });

    const [order] = await supabaseRest('GET', `orders?order_number=eq.${number}&buyer_id=eq.${user.id}&select=*`);
    if (!order) return send(res, 404, { error: 'Commande introuvable' });
    if (order.status !== 'confirmee' || order.escrow_status !== 'retenu') {
      return send(res, 409, { error: 'Cette commande ne peut plus être annulée.' });
    }

    if (order.stripe_payment_intent_id) {
      await stripeRequest('POST', '/refunds', {
        payment_intent: order.stripe_payment_intent_id,
        amount: Math.round(Number(order.amount_cad) * 100),
        metadata: { order_number: String(order.order_number) },
      }, { 'Idempotency-Key': `cancel-order-${order.order_number}` });
    }

    const [updated] = await supabaseRest(
      'PATCH',
      `orders?order_number=eq.${number}&buyer_id=eq.${user.id}&status=eq.confirmee`,
      { status: 'annulee', escrow_status: 'remboursé', cancelled_at: new Date().toISOString() },
      { Prefer: 'return=representation' }
    );
    return send(res, 200, { order: updated || { ...order, status: 'annulee', escrow_status: 'remboursé' } });
  } catch (err) {
    console.error('cancel-order error:', err.message);
    return send(res, err.status || 500, { error: err.status === 401 ? err.message : 'Annulation impossible pour le moment.' });
  }
};
