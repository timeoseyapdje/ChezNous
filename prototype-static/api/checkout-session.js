const { IS_DEMO, send } = require('./_stripe');
const { requireUser } = require('./_supabase');
const { retrieveSession, recordPaidSession, describeDemoSession } = require('./_orders');

// Le retour de Stripe ne prouve rien à lui seul : on relit la session côté serveur et on enregistre la commande
// (le webhook fait de même si le client ferme l'onglet avant de revenir).
module.exports = async (req, res) => {
  const id = new URL(req.url, 'http://x').searchParams.get('session_id') || '';
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(id)) return send(res, 400, { error: 'Session invalide' });
  try {
    if (IS_DEMO) {
      const session = await retrieveSession(id);
      if (!session.metadata || session.metadata.app_mode !== 'demo' || session.metadata.kind === 'seller_plan') return send(res, 403, { error: 'Session invalide' });
      if (session.payment_status !== 'paid') return send(res, 200, { paid: false, pending: session.status === 'complete' });
      return send(res, 200, await describeDemoSession(session));
    }
    const user = await requireUser(req);
    const session = await retrieveSession(id);
    if (!session.metadata || session.metadata.buyer_id !== user.id) return send(res, 403, { error: 'Cette commande ne vous appartient pas.' });
    if (session.metadata.kind === 'seller_plan') return send(res, 403, { error: 'Session invalide' });
    // Un prélèvement bancaire (DPA) est accepté mais se confirme quelques jours plus tard : le webhook créera la commande.
    if (session.payment_status !== 'paid') return send(res, 200, { paid: false, pending: session.status === 'complete' });
    const orders = await recordPaidSession(session);
    return send(res, 200, { paid: true, mode: session.metadata.mode === 'booking' ? 'booking' : 'cart', orders });
  } catch (err) {
    console.error('checkout-session error:', err.message);
    return send(res, err.status || 500, { error: err.status === 401 ? err.message : 'Vérification du paiement impossible.' });
  }
};
