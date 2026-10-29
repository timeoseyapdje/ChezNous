const { stripeRequest, priceOrder, send } = require('./_stripe');

const METHOD_LABELS = { card: 'Carte bancaire', apple_pay: 'Apple Pay', google_pay: 'Google Pay', link: 'Link', paypal: 'PayPal' };

// Le retour de Stripe ne prouve rien à lui seul : on relit la session côté serveur avant de créer la commande.
module.exports = async (req, res) => {
  const id = new URL(req.url, 'http://x').searchParams.get('session_id') || '';
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(id)) return send(res, 400, { error: 'Session invalide' });
  try {
    const session = await stripeRequest('GET', `/checkout/sessions/${id}`, { expand: ['payment_intent.payment_method'] });
    if (session.payment_status !== 'paid') return send(res, 200, { paid: false });

    const mode = session.metadata.mode === 'booking' ? 'booking' : 'cart';
    const { lines, subtotal, fees, total } = priceOrder(mode, JSON.parse(session.metadata.items || '[]'));
    const pm = session.payment_intent && session.payment_intent.payment_method;
    const methodType = pm ? (pm.card && pm.card.wallet ? pm.card.wallet.type : pm.type) : 'card';

    return send(res, 200, {
      paid: true,
      sessionId: session.id,
      mode,
      items: lines.map(l => ({ id: l.listing.id, name: l.listing.name, seller: l.listing.seller, cat: l.listing.cat, qty: l.quantity, unitPrice: l.listing.price })),
      subtotal,
      fees,
      total,
      amountPaid: session.amount_total / 100,
      currency: session.currency,
      slot: session.metadata.slot || '',
      details: session.metadata.details || '',
      paymentMethod: METHOD_LABELS[methodType] || 'Carte bancaire',
      paidAt: new Date(session.created * 1000).toISOString(),
    });
  } catch (err) {
    console.error('checkout-session error:', err.message);
    return send(res, err.status || 500, { error: 'Vérification du paiement impossible.' });
  }
};
