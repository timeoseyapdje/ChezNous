const crypto = require('crypto');
const { stripeRequest, priceOrder } = require('./_stripe');
const { supabaseRest } = require('./_supabase');
const email = require('./_email');

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
  // no_payment_required : commande entièrement couverte par un code promo.
  if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') return [];
  const buyerId = session.metadata && session.metadata.buyer_id;
  if (!buyerId) throw Object.assign(new Error('Session sans acheteur'), { status: 400 });

  const mode = session.metadata.mode === 'booking' ? 'booking' : 'cart';
  // paid : une annonce retirée après le paiement reste lisible, et le prix payé fait foi.
  const { lines, fees, shippingBySeller } = await priceOrder(mode, JSON.parse(session.metadata.items || '[]'), { paid: true });
  const pi = session.payment_intent && typeof session.payment_intent === 'object' ? session.payment_intent : null;
  const pm = pi && pi.payment_method;
  const methodType = pm ? (pm.card && pm.card.wallet ? pm.card.wallet.type : pm.type) : 'card';
  const paidAt = new Date(session.created * 1000).toISOString();

  const bySeller = new Map();
  for (const { listing, quantity, unitPrice } of lines) {
    if (!bySeller.has(listing.seller)) bySeller.set(listing.seller, { sellerId: listing.sellerId || null, items: [] });
    bySeller.get(listing.seller).items.push({ id: listing.id, name: listing.name, cat: listing.cat, qty: quantity, unitPrice });
  }

  // Ventes de la Boutique AkwaOne : pas de séquestre ni de code, la livraison est confirmée par l'administration.
  const sellerIds = [...new Set([...bySeller.values()].map(v => v.sellerId).filter(Boolean))];
  const officialRows = sellerIds.length ? await supabaseRest('GET', `official_shops?seller_id=in.(${sellerIds.join(',')})&select=seller_id`) : [];
  const official = new Set((officialRows || []).map(r => r.seller_id));
  const slotTime = Date.parse(session.metadata.slot_at || '');

  // Code promo : la réduction (payée par AkwaOne) est répartie entre les vendeurs au prorata ; le dernier reçoit l'arrondi.
  const discountTotal = Math.round(Number((session.total_details && session.total_details.amount_discount) || 0)) / 100;
  const groups = [...bySeller.entries()].map(([seller, g]) => ({
    seller, ...g,
    subtotal: Math.round(g.items.reduce((s, i) => s + i.unitPrice * i.qty, 0) * 100) / 100,
    shipping: Number(shippingBySeller[seller] || 0),
  }));
  const gross = groups.reduce((s, g) => s + g.subtotal + g.shipping, 0) || 1;
  let discountLeft = discountTotal;
  groups.forEach((g, i) => {
    g.discount = i === groups.length - 1 ? Math.round(discountLeft * 100) / 100 : Math.round(discountTotal * (g.subtotal + g.shipping) / gross * 100) / 100;
    discountLeft -= g.discount;
  });

  const rows = groups.map(({ seller, sellerId, items, subtotal, shipping, discount }) => {
    return {
      buyer_id: buyerId,
      seller_id: sellerId,
      seller_name: seller,
      items,
      slot: session.metadata.slot || null,
      slot_at: slotTime ? new Date(slotTime).toISOString() : null,
      channel: sellerId && official.has(sellerId) ? 'boutique' : 'marketplace',
      details: session.metadata.details || null,
      subtotal_cad: subtotal,
      fees_cad: fees,
      shipping_cad: shipping,
      discount_cad: discount,
      amount_cad: Math.max(0, Math.round((subtotal + fees + shipping - discount) * 100) / 100),
      status: 'confirmee',
      escrow_status: 'retenu',
      payment_method: METHOD_LABELS[methodType] || 'Carte bancaire',
      release_code: releaseCode(),
      stripe_session_id: session.id,
      stripe_payment_intent_id: pi ? pi.id : session.payment_intent,
      paid_at: paidAt,
    };
  });

  // ignore-duplicates : seules les commandes réellement créées maintenant sont renvoyées, et reçoivent le courriel.
  const insert = (list) => supabaseRest('POST', 'orders?on_conflict=stripe_session_id,seller_name', list, {
    Prefer: 'resolution=ignore-duplicates,return=representation',
  });
  let created;
  try {
    created = await insert(rows);
  } catch (err) {
    // Migration 0014 pas encore exécutée : la commande est enregistrée quand même, sans les nouvelles colonnes.
    if (!/slot_at|channel|shipping_cad|discount_cad|column/i.test(err.message)) throw err;
    console.error('orders: migration 0014/0016 manquante —', err.message);
    try { created = await insert(rows.map(({ shipping_cad, discount_cad, ...r }) => r)); }
    catch (e2) { created = await insert(rows.map(({ slot_at, channel, shipping_cad, discount_cad, ...r }) => r)); }
  }
  for (const o of created || []) await email.orderConfirmed(o).catch(e => console.error('email commande:', e.message));
  return supabaseRest('GET', `orders?stripe_session_id=eq.${encodeURIComponent(session.id)}&order=order_number.asc`);
}

module.exports = { retrieveSession, recordPaidSession, describeDemoSession };
