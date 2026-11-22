const { stripeRequest } = require('./_stripe');
const { supabaseRest } = require('./_supabase');

// Versement au vendeur (Stripe Connect) quand le séquestre est libéré : code de réception validé, ou litige tranché pour lui.
// Montant versé = sous-total de ses articles moins la commission de sa formule. Les frais de service restent à AkwaOne.
// Sans compte bancaire Stripe (ou s'il n'est pas encore activé), le versement attend (pending) et est réessayé chaque jour.

const COMMISSION = { basique: 0.15, pro: 0.10, premium: 0.06 };

async function sellerRate(sellerId) {
  const [plan] = await supabaseRest('GET', `seller_plans?seller_id=eq.${sellerId}&select=plan,status`);
  const key = plan && plan.status === 'active' ? plan.plan : 'basique';
  return COMMISSION[key] || COMMISSION.basique;
}

async function payoutOrder(orderNumber) {
  const [o] = await supabaseRest('GET', `orders?order_number=eq.${Number(orderNumber)}&select=order_number,seller_id,channel,subtotal_cad,shipping_cad,status,escrow_status,payout_status,stripe_payment_intent_id`).catch(() =>
    supabaseRest('GET', `orders?order_number=eq.${Number(orderNumber)}&select=order_number,seller_id,channel,subtotal_cad,status,escrow_status,payout_status,stripe_payment_intent_id`));
  if (!o || o.status !== 'terminee' || o.escrow_status !== 'libéré') return { status: 'skipped' };
  if (o.payout_status === 'paid' || o.payout_status === 'platform') return { status: o.payout_status };

  const patch = (fields) => supabaseRest('PATCH', `orders?order_number=eq.${o.order_number}`, fields, { Prefer: 'return=minimal' });

  // Boutique AkwaOne : AkwaOne est le vendeur, rien à verser.
  const official = o.seller_id ? await supabaseRest('GET', `official_shops?seller_id=eq.${o.seller_id}&select=seller_id`) : [];
  if (o.channel === 'boutique' || !o.seller_id || (official && official.length)) {
    await patch({ payout_status: 'platform', payout_error: null });
    return { status: 'platform' };
  }

  const rate = await sellerRate(o.seller_id);
  // Le vendeur expédie : ses frais de livraison lui reviennent en entier (pas de commission dessus).
  const amount = Math.round((Number(o.subtotal_cad || 0) * (1 - rate) + Number(o.shipping_cad || 0)) * 100) / 100;
  const [acct] = await supabaseRest('GET', `payment_accounts?user_id=eq.${o.seller_id}&select=stripe_account_id`);
  if (!acct || !acct.stripe_account_id) {
    await patch({ payout_status: 'pending', payout_amount_cad: amount, payout_error: 'Le vendeur n\'a pas encore ajouté ses coordonnées bancaires.' });
    return { status: 'pending' };
  }
  if (!o.stripe_payment_intent_id || amount <= 0) {
    await patch({ payout_status: 'failed', payout_amount_cad: amount, payout_error: 'Paiement Stripe introuvable pour cette commande.' });
    return { status: 'failed' };
  }

  try {
    const pi = await stripeRequest('GET', `/payment_intents/${o.stripe_payment_intent_id}`);
    const transfer = await stripeRequest('POST', '/transfers', {
      amount: Math.round(amount * 100),
      currency: 'cad',
      destination: acct.stripe_account_id,
      // Le virement est rattaché au paiement du client : il part dès que les fonds sont disponibles chez Stripe.
      ...(pi.latest_charge ? { source_transaction: typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.latest_charge.id } : {}),
      transfer_group: `order_${o.order_number}`,
      metadata: { order_number: String(o.order_number), commission_rate: String(rate) },
    }, { 'Idempotency-Key': `payout-${o.order_number}` });
    await patch({ payout_status: 'paid', payout_amount_cad: amount, payout_transfer_id: transfer.id, payout_error: null });
    return { status: 'paid', amount };
  } catch (err) {
    // Compte pas encore activé (vérification Stripe en cours) : on réessaiera.
    const msg = String(err.message || 'Virement refusé').slice(0, 300);
    await patch({ payout_status: 'failed', payout_amount_cad: amount, payout_error: msg });
    console.error(`payout #${o.order_number}:`, msg);
    return { status: 'failed' };
  }
}

// Réessai quotidien (api/notify.js, tâche planifiée) des versements en attente ou refusés.
async function retryPendingPayouts(limit = 50) {
  const rows = await supabaseRest('GET', `orders?payout_status=in.(pending,failed)&status=eq.terminee&select=order_number&order=order_number.asc&limit=${limit}`);
  const results = [];
  for (const r of rows || []) results.push({ order: r.order_number, ...(await payoutOrder(r.order_number)) });
  return results;
}

module.exports = { payoutOrder, retryPendingPayouts, COMMISSION };
