const { stripeRequest } = require('./_stripe');
const { supabaseRest } = require('./_supabase');

// Prix annuels en CAD, fixés côté serveur comme ceux du catalogue.
const SELLER_PLANS = {
  pro: { label: 'Formule Pro Chez Nous', price: 129 },
  premium: { label: 'Formule Premium Chez Nous', price: 299 },
};

const STATUS_MAP = { active: 'active', trialing: 'active', past_due: 'past_due', unpaid: 'past_due' };

async function retrievePlanSession(id) {
  return stripeRequest('GET', `/checkout/sessions/${id}`, { expand: ['subscription'] });
}

function isPlanSession(session) {
  return !!(session && session.metadata && session.metadata.kind === 'seller_plan' && SELLER_PLANS[session.metadata.plan]);
}

function periodEnd(subscription) {
  const end = subscription && typeof subscription === 'object'
    ? subscription.current_period_end || (subscription.items && subscription.items.data[0] && subscription.items.data[0].current_period_end)
    : null;
  return end ? new Date(end * 1000).toISOString() : null;
}

// Idempotent : le retour de Stripe et le webhook peuvent tous deux arriver, la ligne est simplement réécrite.
async function recordSellerPlan(session) {
  const meta = session.metadata;
  const sellerId = meta.buyer_id;
  const subscription = session.subscription;
  await supabaseRest('POST', 'seller_plans?on_conflict=seller_id', {
    seller_id: sellerId,
    plan: meta.plan,
    shop_name: meta.shop || null,
    status: 'active',
    stripe_customer_id: typeof session.customer === 'string' ? session.customer : null,
    stripe_subscription_id: typeof subscription === 'object' && subscription ? subscription.id : subscription || null,
    stripe_session_id: session.id,
    current_period_end: periodEnd(subscription),
    updated_at: new Date().toISOString(),
  }, { Prefer: 'resolution=merge-duplicates,return=minimal' });
  // Un admin garde son rôle : seul un acheteur passe vendeur.
  await supabaseRest('PATCH', `profiles?id=eq.${sellerId}&role=eq.buyer`, { role: 'seller' }, { Prefer: 'return=minimal' });
  return { plan: meta.plan, shop: meta.shop || '' };
}

async function updateSubscriptionStatus(subscription, deleted) {
  const status = deleted ? 'canceled' : STATUS_MAP[subscription.status] || 'canceled';
  await supabaseRest('PATCH', `seller_plans?stripe_subscription_id=eq.${encodeURIComponent(subscription.id)}`, {
    status,
    current_period_end: periodEnd(subscription),
    updated_at: new Date().toISOString(),
  }, { Prefer: 'return=minimal' });
}

module.exports = { SELLER_PLANS, retrievePlanSession, isPlanSession, recordSellerPlan, updateSubscriptionStatus };
