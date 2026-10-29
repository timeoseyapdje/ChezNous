const { IS_DEMO, stripeRequest, siteOrigin, readJson, send } = require('./_stripe');
const { requireUser } = require('./_supabase');
const { SELLER_PLANS, retrievePlanSession, isPlanSession, recordSellerPlan } = require('./_seller-plans');

// POST : ouvre un abonnement annuel Stripe. GET ?session_id= : vérifie le paiement au retour et active la formule.
module.exports = async (req, res) => {
  try {
    if (req.method === 'POST') return await startSubscription(req, res);
    if (req.method === 'GET') return await confirmSubscription(req, res);
    return send(res, 405, { error: 'Méthode non autorisée' });
  } catch (err) {
    console.error('seller-plan error:', err.message);
    return send(res, err.status || 500, { error: err.status && err.status < 500 ? err.message : 'Abonnement indisponible pour le moment.' });
  }
};

async function startSubscription(req, res) {
  const user = IS_DEMO ? null : await requireUser(req);
  const body = await readJson(req);
  const planKey = String(body.plan || '');
  const plan = SELLER_PLANS[planKey];
  if (!plan) return send(res, 400, { error: 'Formule inconnue' });
  const shop = String(body.shopName || '').trim().slice(0, 80);
  const origin = siteOrigin(req);
  const metadata = { kind: 'seller_plan', plan: planKey, shop, app_mode: IS_DEMO ? 'demo' : 'real', buyer_id: user ? user.id : undefined };

  const session = await stripeRequest('POST', '/checkout/sessions', {
    mode: 'subscription',
    line_items: [{
      quantity: 1,
      price_data: { currency: 'cad', unit_amount: plan.price * 100, recurring: { interval: 'year' }, product_data: { name: plan.label } },
    }],
    payment_method_types: ['card', 'link'],
    // Abonnement facturé en CAD, comme les commandes : pas de conversion de devise par Stripe.
    adaptive_pricing: { enabled: false },
    customer_email: user ? user.email : undefined,
    client_reference_id: user ? user.id : undefined,
    locale: body.lang === 'en' ? 'en' : 'fr',
    success_url: `${origin}/devenir-vendeur.html?abonnement=ok&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/devenir-vendeur.html?abonnement=annule`,
    metadata,
    subscription_data: { metadata },
  });
  return send(res, 200, { url: session.url });
}

async function confirmSubscription(req, res) {
  const id = new URL(req.url, 'http://x').searchParams.get('session_id') || '';
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(id)) return send(res, 400, { error: 'Session invalide' });
  const user = IS_DEMO ? null : await requireUser(req);
  const session = await retrievePlanSession(id);
  if (!isPlanSession(session) || session.metadata.app_mode !== (IS_DEMO ? 'demo' : 'real')) return send(res, 403, { error: 'Session invalide' });
  if (!IS_DEMO && session.metadata.buyer_id !== user.id) return send(res, 403, { error: 'Cet abonnement ne vous appartient pas.' });
  if (session.status !== 'complete' || session.payment_status !== 'paid') return send(res, 200, { paid: false });
  // Démo : aucun compte réel, la formule reste dans le navigateur.
  if (IS_DEMO) return send(res, 200, { paid: true, plan: session.metadata.plan, shop: session.metadata.shop || '' });
  const result = await recordSellerPlan(session);
  return send(res, 200, { paid: true, ...result });
}
