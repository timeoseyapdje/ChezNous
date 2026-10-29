const crypto = require('crypto');
const { stripeRequest, priceOrder } = require('./_stripe');
const { supabaseRest } = require('./_supabase');

const METHOD_LABELS = {
  card: 'Carte bancaire', apple_pay: 'Apple Pay', google_pay: 'Google Pay', link: 'Link',
  klarna: 'Klarna', afterpay_clearpay: 'Afterpay', affirm: 'Affirm', acss_debit: 'Prélèvement bancaire',
};

function releaseCode() {
  return crypto.randomBytes(4).toString('hex').slice(0, 6).toUpperCase();
}

async function retrieveSession(id) {
  return stripeRequest('GET', `/checkout/sessions/${id}`, { expand: ['payment_intent.payment_method'] });
}

function paymentMethodLabel(session) {
  const pi = session.payment_intent && typeof session.payment_intent === 'object' ? session.payment_intent : null;
  const pm = pi && pi.payment_method;
  const methodType = pm ? (pm.card && pm.card.wallet ? pm.card.wallet.type : pm.type) : 'card';
  return METHOD_LABELS[methodType] || 'Carte bancaire';
}

// Démo : rien n'est enregistré en base, on renvoie seulement le détail recalculé pour la commande locale.
async function describeDemoSession(session) {
  const mode = session.metadata.mode === 'booking' ? 'booking' : 'cart';
  const { lines, subtotal, fees, total } = await priceOrder(mode, JSON.parse(session.metadata.items || '[]'), { paid: true });
  return {
    paid: true,
    mode,
    items: lines.map(l => ({ id: l.listing.id, name: l.listing.name, seller: l.listing.seller, cat: l.listing.cat, qty: l.quantity, unitPrice: l.unitPrice })),
    subtotal, fees, total,
    slot: session.metadata.slot || '',
    details: session.metadata.details || '',
    paymentMethod: paymentMethodLabel(session),
    paidAt: new Date(session.created * 1000).toISOString(),
  };
}

// Crée une commande par vendeur pour une session Stripe payée. Appelée par la page de retour et par le webhook :
// l'index unique (stripe_session_id, seller_name) garantit qu'une session n'est jamais enregistrée deux fois.
async function recordPaidSession(session) {
  if (session.payment_status !== 'paid') return [];
  const buyerId = session.metadata && session.metadata.buyer_id;
  if (!buyerId) throw Object.assign(new Error('Session sans acheteur'), { status: 400 });

  const mode = session.metadata.mode === 'booking' ? 'booking' : 'cart';
  // paid : une annonce retirée après le paiement reste lisible, et le prix payé fait foi.
  const { lines, fees } = await priceOrder(mode, JSON.parse(session.metadata.items || '[]'), { paid: true });
  const pi = session.payment_intent && typeof session.payment_intent === 'object' ? session.payment_intent : null;
  const pm = pi && pi.payment_method;
  const methodType = pm ? (pm.card && pm.card.wallet ? pm.card.wallet.type : pm.type) : 'card';
  const paidAt = new Date(session.created * 1000).toISOString();

  const bySeller = new Map();
  for (const { listing, quantity, unitPrice } of lines) {
    if (!bySeller.has(listing.seller)) bySeller.set(listing.seller, { sellerId: listing.sellerId || null, items: [] });
    bySeller.get(listing.seller).items.push({ id: listing.id, name: listing.name, cat: listing.cat, qty: quantity, unitPrice });
  }

  const rows = [...bySeller.entries()].map(([seller, { sellerId, items }]) => {
    const subtotal = Math.round(items.reduce((s, i) => s + i.unitPrice * i.qty, 0) * 100) / 100;
    return {
      buyer_id: buyerId,
      seller_id: sellerId,
      seller_name: seller,
      items,
      slot: session.metadata.slot || null,
      details: session.metadata.details || null,
      subtotal_cad: subtotal,
      fees_cad: fees,
      amount_cad: subtotal + fees,
      status: 'confirmee',
      escrow_status: 'retenu',
      payment_method: METHOD_LABELS[methodType] || 'Carte bancaire',
      release_code: releaseCode(),
      stripe_session_id: session.id,
      stripe_payment_intent_id: pi ? pi.id : session.payment_intent,
      paid_at: paidAt,
    };
  });

  await supabaseRest('POST', 'orders?on_conflict=stripe_session_id,seller_name', rows, {
    Prefer: 'resolution=ignore-duplicates,return=minimal',
  });
  return supabaseRest('GET', `orders?stripe_session_id=eq.${encodeURIComponent(session.id)}&order=order_number.asc`);
}

module.exports = { retrieveSession, recordPaidSession, describeDemoSession };
