const { IS_DEMO, stripeRequest, siteOrigin, readJson, send } = require('./_stripe');
const { supabaseRest, requireUser } = require('./_supabase');

// Moyens de paiement et versements, gérés par Stripe : AkwaOne ne voit jamais un numéro de carte ou de compte.
// Acheteurs : cartes enregistrées sur un client Stripe (cus_…), ajoutées via une page Stripe sécurisée (mode « setup »).
// Vendeurs : compte Stripe Connect Express (acct_…) où ils saisissent leurs coordonnées bancaires chez Stripe.
module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return send(res, 405, { error: 'Méthode non autorisée' });
    if (IS_DEMO) return send(res, 400, { error: 'Version démo : les moyens de paiement et versements sont disponibles sur le site réel.' });
    const user = await requireUser(req);
    const body = await readJson(req);
    const origin = siteOrigin(req);
    switch (body.action) {
      case 'status': return send(res, 200, await status(user));
      case 'add-method': return send(res, 200, await addMethod(user, origin));
      case 'confirm-method': return send(res, 200, await confirmMethod(user, String(body.sessionId || '')));
      case 'remove-method': return send(res, 200, await removeMethod(user, String(body.id || '')));
      case 'connect-onboard': return send(res, 200, await connectOnboard(user, origin));
      case 'connect-dashboard': return send(res, 200, await connectDashboard(user));
      default: return send(res, 400, { error: 'Action inconnue' });
    }
  } catch (err) {
    console.error('payments error:', err.message);
    return send(res, err.status || 500, { error: err.status && err.status < 500 ? err.message : 'Service de paiement indisponible pour le moment.' });
  }
};

const fail = (message, status = 400) => Object.assign(new Error(message), { status });

async function getAccount(userId) {
  const rows = await supabaseRest('GET', `payment_accounts?user_id=eq.${userId}&select=stripe_customer_id,stripe_account_id`);
  return (rows && rows[0]) || {};
}
async function saveAccount(userId, fields) {
  await supabaseRest('POST', 'payment_accounts?on_conflict=user_id', { user_id: userId, ...fields, updated_at: new Date().toISOString() },
    { Prefer: 'resolution=merge-duplicates,return=minimal' });
}
async function userRole(userId) {
  const rows = await supabaseRest('GET', `profiles?id=eq.${userId}&select=role`);
  return (rows && rows[0] && rows[0].role) || 'buyer';
}

async function ensureCustomer(user) {
  const acct = await getAccount(user.id);
  if (acct.stripe_customer_id) return acct.stripe_customer_id;
  const customer = await stripeRequest('POST', '/customers', { email: user.email, metadata: { user_id: user.id } });
  await saveAccount(user.id, { stripe_customer_id: customer.id });
  return customer.id;
}

async function status(user) {
  const acct = await getAccount(user.id);
  const out = { methods: [], payouts: null, role: await userRole(user.id) };
  if (acct.stripe_customer_id) {
    const list = await stripeRequest('GET', `/customers/${acct.stripe_customer_id}/payment_methods`, { type: 'card', limit: 20 });
    out.methods = (list.data || []).map((pm) => ({
      id: pm.id, brand: pm.card && pm.card.brand, last4: pm.card && pm.card.last4,
      expMonth: pm.card && pm.card.exp_month, expYear: pm.card && pm.card.exp_year,
    }));
  }
  if (acct.stripe_account_id) {
    const a = await stripeRequest('GET', `/accounts/${acct.stripe_account_id}`);
    const bank = a.external_accounts && a.external_accounts.data && a.external_accounts.data[0];
    out.payouts = {
      connected: true, detailsSubmitted: !!a.details_submitted, payoutsEnabled: !!a.payouts_enabled,
      bank: bank ? { name: bank.bank_name || null, last4: bank.last4 || null, currency: bank.currency || null } : null,
    };
  }
  return out;
}

async function addMethod(user, origin) {
  const customer = await ensureCustomer(user);
  const session = await stripeRequest('POST', '/checkout/sessions', {
    mode: 'setup', currency: 'cad', customer, payment_method_types: ['card'], locale: 'fr',
    success_url: `${origin}/profil.html?moyen=ok&session_id={CHECKOUT_SESSION_ID}#paiements`,
    cancel_url: `${origin}/profil.html#paiements`,
    metadata: { kind: 'save_payment_method', user_id: user.id },
  });
  return { url: session.url };
}

// Retour de Stripe : la carte enregistrée est rendue réutilisable au paiement (elle s'affichera dans Stripe Checkout).
async function confirmMethod(user, sessionId) {
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) throw fail('Session invalide');
  const acct = await getAccount(user.id);
  const session = await stripeRequest('GET', `/checkout/sessions/${sessionId}`, { expand: ['setup_intent'] });
  if (!acct.stripe_customer_id || session.customer !== acct.stripe_customer_id || !session.metadata || session.metadata.user_id !== user.id) throw fail('Session invalide', 403);
  const pm = session.setup_intent && session.setup_intent.payment_method;
  if (pm) await stripeRequest('POST', `/payment_methods/${typeof pm === 'string' ? pm : pm.id}`, { allow_redisplay: 'always' });
  return { ok: true };
}

async function removeMethod(user, id) {
  if (!/^pm_[A-Za-z0-9]+$/.test(id)) throw fail('Moyen de paiement invalide');
  const acct = await getAccount(user.id);
  const pm = await stripeRequest('GET', `/payment_methods/${id}`);
  if (!acct.stripe_customer_id || pm.customer !== acct.stripe_customer_id) throw fail('Ce moyen de paiement ne vous appartient pas.', 403);
  await stripeRequest('POST', `/payment_methods/${id}/detach`);
  return { ok: true };
}

async function connectOnboard(user, origin) {
  const role = await userRole(user.id);
  if (role !== 'seller' && role !== 'admin') throw fail('Réservé aux comptes vendeurs.', 403);
  const acct = await getAccount(user.id);
  let accountId = acct.stripe_account_id;
  if (!accountId) {
    const account = await stripeRequest('POST', '/accounts', {
      type: 'express', country: 'CA', email: user.email, default_currency: 'cad',
      capabilities: { transfers: { requested: true } },
      metadata: { user_id: user.id },
    });
    accountId = account.id;
    await saveAccount(user.id, { stripe_account_id: accountId });
  }
  const link = await stripeRequest('POST', '/account_links', {
    account: accountId, type: 'account_onboarding',
    refresh_url: `${origin}/profil.html?versements=reprendre#paiements`,
    return_url: `${origin}/profil.html?versements=ok#paiements`,
  });
  return { url: link.url };
}

// Tableau de bord Stripe Express du vendeur : modifier son compte bancaire, voir ses versements.
async function connectDashboard(user) {
  const acct = await getAccount(user.id);
  if (!acct.stripe_account_id) throw fail('Ajoutez d\'abord vos coordonnées bancaires.');
  const link = await stripeRequest('POST', `/accounts/${acct.stripe_account_id}/login_links`);
  return { url: link.url };
}
