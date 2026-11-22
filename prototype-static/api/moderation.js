const { IS_DEMO, stripeRequest, readJson, send } = require('./_stripe');
const { supabaseRest, requireUser } = require('./_supabase');

// Modération et espace administrateur (cahier des charges 3.5 et 3.8).
// POST { action, ... }
//  Membres connectés : report, open-dispute, seller-evidence
//  Administrateurs   : admin-overview, set-seller-status, resolve-report, resolve-dispute

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const COMMISSION = { basique: 0.15, pro: 0.10, premium: 0.06 };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const text = (v, max) => String(v == null ? '' : v).trim().slice(0, max);
const enc = encodeURIComponent;

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return send(res, 405, { error: 'Méthode non autorisée' });
    if (IS_DEMO) return send(res, 400, { error: 'Version démo : la modération réelle est disponible sur le site réel.' });
    const user = await requireUser(req);
    const body = await readJson(req);
    switch (body.action) {
      case 'report': return send(res, 200, await report(user, body));
      case 'open-dispute': return send(res, 200, await openDispute(user, body));
      case 'seller-evidence': return send(res, 200, await sellerEvidence(user, body));
      case 'admin-overview': await requireAdmin(user); return send(res, 200, await overview());
      case 'set-seller-status': await requireAdmin(user); return send(res, 200, await setSellerStatus(user, body));
      case 'resolve-report': await requireAdmin(user); return send(res, 200, await resolveReport(user, body));
      case 'resolve-dispute': await requireAdmin(user); return send(res, 200, await resolveDispute(user, body));
      default: return send(res, 400, { error: 'Action inconnue' });
    }
  } catch (err) {
    console.error('moderation error:', err.message);
    return send(res, err.status || 500, { error: err.status && err.status < 500 ? err.message : 'Action impossible pour le moment.' });
  }
};

async function requireAdmin(user) {
  const [p] = await supabaseRest('GET', `profiles?id=eq.${user.id}&select=role`);
  if (!p || p.role !== 'admin') throw fail('Réservé aux administrateurs.', 403);
}
async function audit(adminId, action, targetType, targetId, note) {
  await supabaseRest('POST', 'admin_audit', { admin_id: adminId, action, target_type: targetType, target_id: String(targetId), note: note || null }, { Prefer: 'return=minimal' });
}

// ----- Membres -----
async function report(user, body) {
  const type = body.targetType;
  const id = text(body.targetId, 80);
  const reason = text(body.reason, 500);
  if (!['listing', 'message', 'review'].includes(type) || !id) throw fail('Contenu invalide');
  if (reason.length < 3) throw fail('Précisez la raison du signalement.');
  let excerpt = null;
  if (type === 'listing') {
    const [l] = await supabaseRest('GET', `listings?id=eq.${enc(id)}&select=name,description,seller_name`);
    if (!l) throw fail('Annonce introuvable', 404);
    excerpt = `${l.name} — ${l.seller_name || ''}${l.description ? ` : ${l.description}` : ''}`;
  } else if (type === 'message') {
    // Seul le destinataire peut signaler un message reçu.
    const [m] = await supabaseRest('GET', `messages?id=eq.${enc(id)}&recipient_id=eq.${user.id}&select=body`);
    if (!m) throw fail('Message introuvable', 404);
    excerpt = m.body;
  } else {
    const [r] = await supabaseRest('GET', `reviews?id=eq.${enc(id)}&select=comment,rating`);
    if (!r) throw fail('Avis introuvable', 404);
    excerpt = `${r.rating}/5 — ${r.comment || ''}`;
  }
  try {
    await supabaseRest('POST', 'reports', {
      reporter_id: user.id, target_type: type, target_id: id, reason, excerpt: text(excerpt, 1000),
    }, { Prefer: 'return=minimal' });
  } catch (e) {
    throw fail('Vous avez déjà signalé ce contenu. Notre équipe l\'examine.', 409);
  }
  return { ok: true };
}

async function openDispute(user, body) {
  const number = Number(body.orderNumber);
  const evidence = text(body.evidence, 2000);
  if (!Number.isInteger(number) || number <= 0) throw fail('Commande invalide');
  if (evidence.length < 10) throw fail('Décrivez le problème en quelques phrases (10 caractères minimum).');
  const [order] = await supabaseRest('GET', `orders?order_number=eq.${number}&buyer_id=eq.${user.id}&select=order_number,seller_id,status,escrow_status`);
  if (!order) throw fail('Commande introuvable', 404);
  if (order.status !== 'confirmee' || order.escrow_status !== 'retenu') throw fail('Un litige ne peut être ouvert que sur une commande payée en attente de réception.', 409);
  try {
    await supabaseRest('POST', 'disputes', {
      order_number: number, buyer_id: user.id, seller_id: order.seller_id || null, buyer_evidence: evidence,
    }, { Prefer: 'return=minimal' });
  } catch (e) {
    throw fail('Un litige est déjà ouvert pour cette commande.', 409);
  }
  // Le paiement reste bloqué jusqu'à la décision d'un administrateur.
  await supabaseRest('PATCH', `orders?order_number=eq.${number}&escrow_status=eq.retenu`, { escrow_status: 'litige' }, { Prefer: 'return=minimal' });
  return { ok: true };
}

async function sellerEvidence(user, body) {
  const number = Number(body.orderNumber);
  const evidence = text(body.evidence, 2000);
  if (!Number.isInteger(number) || number <= 0) throw fail('Commande invalide');
  if (evidence.length < 10) throw fail('Expliquez votre version en quelques phrases (10 caractères minimum).');
  const rows = await supabaseRest('PATCH', `disputes?order_number=eq.${number}&seller_id=eq.${user.id}&status=eq.open`, { seller_evidence: evidence }, { Prefer: 'return=representation' });
  if (!rows || !rows.length) throw fail('Aucun litige ouvert pour cette commande.', 404);
  return { ok: true };
}

// ----- Administrateurs -----
async function authUsers() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!r.ok) return {};
  const data = await r.json().catch(() => ({}));
  return Object.fromEntries((data.users || []).map((u) => [u.id, u.email]));
}

async function overview() {
  const [orders, sellers, plans, officials, listings, reports, disputes, auditLog, emails] = await Promise.all([
    supabaseRest('GET', 'orders?select=order_number,seller_id,seller_name,subtotal_cad,fees_cad,amount_cad,status,escrow_status&limit=20000'),
    supabaseRest('GET', 'profiles?role=eq.seller&select=id,full_name,city,seller_status,seller_status_note,seller_status_at,created_at&order=created_at.desc&limit=2000'),
    supabaseRest('GET', 'seller_plans?select=seller_id,plan,shop_name,status'),
    supabaseRest('GET', 'official_shops?select=seller_id'),
    supabaseRest('GET', 'listings?active=eq.true&select=seller_id&limit=20000'),
    supabaseRest('GET', 'reports?status=eq.pending&select=id,target_type,target_id,reason,excerpt,created_at,reporter_id&order=created_at.asc&limit=200'),
    supabaseRest('GET', 'disputes?status=eq.open&select=id,order_number,buyer_id,seller_id,buyer_evidence,seller_evidence,created_at&order=created_at.asc&limit=200'),
    supabaseRest('GET', 'admin_audit?select=action,target_type,target_id,note,created_at&order=created_at.desc&limit=30'),
    authUsers(),
  ]);
  const planOf = Object.fromEntries((plans || []).map((p) => [p.seller_id, p]));
  const official = new Set((officials || []).map((o) => o.seller_id));
  const listingCount = {};
  (listings || []).forEach((l) => { listingCount[l.seller_id] = (listingCount[l.seller_id] || 0) + 1; });

  // Statistiques : ventes payées (non remboursées), vendeurs actifs, commissions des ventes libérées (hors Boutique AkwaOne) + frais de service.
  const paid = (orders || []).filter((o) => o.status === 'confirmee' || o.status === 'terminee');
  const totalSales = paid.reduce((s, o) => s + Number(o.amount_cad || 0), 0);
  const released = (orders || []).filter((o) => o.status === 'terminee' && o.escrow_status === 'libéré');
  const commissions = released.reduce((s, o) => {
    const fees = Number(o.fees_cad || 0);
    if (!o.seller_id || official.has(o.seller_id)) return s + fees;
    const plan = planOf[o.seller_id] && planOf[o.seller_id].status === 'active' ? planOf[o.seller_id].plan : 'basique';
    return s + Number(o.subtotal_cad || 0) * (COMMISSION[plan] || COMMISSION.basique) + fees;
  }, 0);
  const activeSellers = (sellers || []).filter((s) => s.seller_status === 'active').length;

  const orderNumbers = (disputes || []).map((d) => d.order_number);
  const disputeOrders = orderNumbers.length
    ? await supabaseRest('GET', `orders?order_number=in.(${orderNumbers.join(',')})&select=order_number,seller_name,items,amount_cad,paid_at`)
    : [];
  const orderOf = Object.fromEntries((disputeOrders || []).map((o) => [o.order_number, o]));
  const names = Object.fromEntries((sellers || []).map((s) => [s.id, s.full_name]));

  return {
    stats: { totalSales: Math.round(totalSales * 100) / 100, activeSellers, commissions: Math.round(commissions * 100) / 100, openDisputes: (disputes || []).length, pendingReports: (reports || []).length },
    sellers: (sellers || []).map((s) => ({
      id: s.id, name: s.full_name || '', email: emails[s.id] || '', city: s.city || '',
      shop: (planOf[s.id] && planOf[s.id].shop_name) || '', plan: (planOf[s.id] && planOf[s.id].status === 'active' && planOf[s.id].plan) || 'basique',
      official: official.has(s.id), listings: listingCount[s.id] || 0,
      status: s.seller_status, note: s.seller_status_note || '', statusAt: s.seller_status_at, createdAt: s.created_at,
    })),
    reports: (reports || []).map((r) => ({ id: r.id, type: r.target_type, targetId: r.target_id, reason: r.reason, excerpt: r.excerpt || '', createdAt: r.created_at, reporter: emails[r.reporter_id] || '' })),
    disputes: (disputes || []).map((d) => {
      const o = orderOf[d.order_number] || {};
      return {
        id: d.id, orderNumber: d.order_number, seller: o.seller_name || names[d.seller_id] || '', amount: Number(o.amount_cad || 0),
        items: (o.items || []).map((i) => `${i.name} x${i.qty}`).join(', '),
        buyer: emails[d.buyer_id] || '', buyerEvidence: d.buyer_evidence, sellerEvidence: d.seller_evidence || '', createdAt: d.created_at,
      };
    }),
    audit: auditLog || [],
  };
}

async function setSellerStatus(admin, body) {
  const id = String(body.sellerId || '');
  const status = body.status === 'suspended' ? 'suspended' : body.status === 'active' ? 'active' : null;
  if (!UUID.test(id) || !status) throw fail('Demande invalide');
  const note = text(body.note, 300);
  if (status === 'suspended' && note.length < 3) throw fail('Indiquez la raison de la suspension.');
  const rows = await supabaseRest('PATCH', `profiles?id=eq.${id}&role=eq.seller`, {
    seller_status: status, seller_status_note: note || null, seller_status_at: new Date().toISOString(),
  }, { Prefer: 'return=representation' });
  if (!rows || !rows.length) throw fail('Vendeur introuvable', 404);
  await audit(admin.id, status === 'suspended' ? 'suspend_seller' : 'reactivate_seller', 'seller', id, note);
  return { ok: true };
}

async function resolveReport(admin, body) {
  const id = String(body.reportId || '');
  const decision = body.decision === 'removed' ? 'removed' : body.decision === 'approved' ? 'approved' : null;
  if (!UUID.test(id) || !decision) throw fail('Demande invalide');
  const [r] = await supabaseRest('GET', `reports?id=eq.${id}&status=eq.pending&select=id,target_type,target_id`);
  if (!r) throw fail('Signalement déjà traité ou introuvable.', 404);
  if (decision === 'removed') {
    // Retrait : l'annonce est désactivée, le message ou l'avis est supprimé.
    if (r.target_type === 'listing') await supabaseRest('PATCH', `listings?id=eq.${enc(r.target_id)}`, { active: false }, { Prefer: 'return=minimal' });
    if (r.target_type === 'message') await supabaseRest('DELETE', `messages?id=eq.${enc(r.target_id)}`, undefined, { Prefer: 'return=minimal' });
    if (r.target_type === 'review') await supabaseRest('DELETE', `reviews?id=eq.${enc(r.target_id)}`, undefined, { Prefer: 'return=minimal' });
  }
  // Tous les signalements sur le même contenu sont clos par la même décision.
  await supabaseRest('PATCH', `reports?target_type=eq.${r.target_type}&target_id=eq.${enc(r.target_id)}&status=eq.pending`, {
    status: decision, resolved_by: admin.id, resolved_at: new Date().toISOString(),
  }, { Prefer: 'return=minimal' });
  await audit(admin.id, decision === 'removed' ? 'report_removed' : 'report_approved', r.target_type, r.target_id);
  return { ok: true };
}

async function resolveDispute(admin, body) {
  const id = String(body.disputeId || '');
  const decision = body.decision === 'buyer' ? 'buyer' : body.decision === 'seller' ? 'seller' : null;
  if (!UUID.test(id) || !decision) throw fail('Demande invalide');
  const [d] = await supabaseRest('GET', `disputes?id=eq.${id}&status=eq.open&select=id,order_number`);
  if (!d) throw fail('Litige déjà tranché ou introuvable.', 404);
  const [order] = await supabaseRest('GET', `orders?order_number=eq.${d.order_number}&select=order_number,amount_cad,status,escrow_status,stripe_payment_intent_id`);
  if (!order || order.escrow_status !== 'litige') throw fail('La commande n\'est plus en litige.', 409);

  if (decision === 'buyer') {
    // Remboursement réel de l'acheteur.
    if (order.stripe_payment_intent_id) {
      await stripeRequest('POST', '/refunds', {
        payment_intent: order.stripe_payment_intent_id,
        amount: Math.round(Number(order.amount_cad) * 100),
        metadata: { order_number: String(order.order_number), reason: 'dispute' },
      }, { 'Idempotency-Key': `dispute-refund-${order.order_number}` });
    }
    await supabaseRest('PATCH', `orders?order_number=eq.${order.order_number}&escrow_status=eq.litige`, {
      status: 'remboursee', escrow_status: 'remboursé', cancelled_at: new Date().toISOString(),
    }, { Prefer: 'return=minimal' });
  } else {
    // Paiement libéré au vendeur : la commande est terminée.
    await supabaseRest('PATCH', `orders?order_number=eq.${order.order_number}&escrow_status=eq.litige`, {
      status: 'terminee', escrow_status: 'libéré',
    }, { Prefer: 'return=minimal' });
  }
  await supabaseRest('PATCH', `disputes?id=eq.${id}`, {
    status: 'resolved', decision, decided_by: admin.id, decided_at: new Date().toISOString(),
  }, { Prefer: 'return=minimal' });
  await audit(admin.id, decision === 'buyer' ? 'dispute_buyer' : 'dispute_seller', 'order', order.order_number);
  return { ok: true };
}
