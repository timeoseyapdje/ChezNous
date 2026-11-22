const { IS_DEMO, readJson, send } = require('./_stripe');
const { supabaseRest, requireUser } = require('./_supabase');
const email = require('./_email');
const { retryPendingPayouts } = require('./_payouts');

// Notifications par courriel (cahier 3.10).
//  POST { action: 'message', messageId }   prévient le destinataire d'un nouveau message (s'il a accepté les courriels)
//  GET  (tâche planifiée Vercel, chaque jour) rappels 24 h avant les réservations + réessai des versements aux vendeurs
//       Vercel envoie « Authorization: Bearer CRON_SECRET » : variable CRON_SECRET à définir dans Vercel.
//  POST ?relais=1                          relais du suivi des erreurs (Sentry) par le domaine du site, pour que
//                                          les bloqueurs de publicité ne coupent pas les rapports d'erreur.

// Seul le projet Sentry d'AkwaOne est accepté par le relais.
const SENTRY_HOST = 'o4512476959735808.ingest.us.sentry.io';
const SENTRY_PROJECT = '4512477683318784';

async function readRawBody(req) {
  if (typeof req.body === 'string') return req.body;
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
  if (req.body && typeof req.body === 'object') return null; // déjà converti en JSON : pas une enveloppe Sentry
  let raw = '';
  for await (const chunk of req) { raw += chunk; if (raw.length > 1024 * 1024) break; }
  return raw;
}

async function relayErrors(req, res) {
  const raw = await readRawBody(req);
  if (!raw || raw.length > 1024 * 1024) return send(res, 400, { error: 'Enveloppe invalide' });
  let header;
  try { header = JSON.parse(raw.slice(0, raw.indexOf('\n'))); } catch (e) { return send(res, 400, { error: 'Enveloppe invalide' }); }
  let dsn;
  try { dsn = new URL(header.dsn); } catch (e) { return send(res, 400, { error: 'DSN invalide' }); }
  if (dsn.hostname !== SENTRY_HOST || dsn.pathname.replace(/\//g, '') !== SENTRY_PROJECT) return send(res, 403, { error: 'Projet non autorisé' });
  const r = await fetch(`https://${SENTRY_HOST}/api/${SENTRY_PROJECT}/envelope/`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-sentry-envelope' }, body: raw,
  });
  res.statusCode = r.status;
  res.end();
}

module.exports = async (req, res) => {
  try {
    if (req.method === 'POST' && /[?&]relais=1/.test(req.url || '')) return await relayErrors(req, res);
    if (req.method === 'GET') return send(res, 200, await dailyJob(req));
    if (req.method !== 'POST') return send(res, 405, { error: 'Méthode non autorisée' });
    const body = await readJson(req).catch(() => ({}));
    if (body.action === 'message') return send(res, 200, await messageNotice(req, body));
    return send(res, 400, { error: 'Action inconnue' });
  } catch (err) {
    console.error('notify error:', err.message);
    return send(res, err.status || 500, { error: err.status && err.status < 500 ? err.message : "Le courriel n'a pas pu être envoyé." });
  }
};

const fail = (message, status = 400) => Object.assign(new Error(message), { status });

// Un seul courriel par série de messages : seulement si c'est le premier message non lu de cet expéditeur.
async function messageNotice(req, body) {
  if (IS_DEMO) return { sent: false };
  const user = await requireUser(req);
  const id = String(body.messageId || '');
  if (!/^[0-9a-zA-Z-]{1,64}$/.test(id)) throw fail('Message invalide');
  const [m] = await supabaseRest('GET', `messages?id=eq.${encodeURIComponent(id)}&sender_id=eq.${user.id}&select=id,recipient_id,body,created_at`);
  if (!m) throw fail('Message introuvable', 404);
  if (Date.now() - Date.parse(m.created_at) > 5 * 60 * 1000) return { sent: false };
  const unread = await supabaseRest('GET', `messages?sender_id=eq.${user.id}&recipient_id=eq.${m.recipient_id}&read_at=is.null&select=id&limit=2`);
  if ((unread || []).length > 1) return { sent: false };
  const [p] = await supabaseRest('GET', `profiles?id=eq.${user.id}&select=full_name`);
  const sent = await email.newMessage(m.recipient_id, (p && p.full_name) || 'Un membre AkwaOne', m.body);
  return { sent };
}

async function dailyJob(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) throw fail('Non autorisé', 401);
  if (IS_DEMO) return { skipped: 'demo' };

  // Rappels : réservations payées dont le créneau tombe dans les 36 prochaines heures (la tâche passe une fois par jour).
  const now = new Date();
  const until = new Date(now.getTime() + 36 * 3600 * 1000);
  const due = await supabaseRest('GET',
    `orders?status=eq.confirmee&reminder_sent_at=is.null&slot_at=gte.${now.toISOString()}&slot_at=lte.${until.toISOString()}&select=order_number,buyer_id,seller_id,seller_name,items,slot,amount_cad,payment_method&limit=200`);
  let reminders = 0;
  for (const o of due || []) {
    await email.bookingReminder(o).catch(e => console.error('rappel:', e.message));
    await supabaseRest('PATCH', `orders?order_number=eq.${o.order_number}`, { reminder_sent_at: new Date().toISOString() }, { Prefer: 'return=minimal' });
    reminders++;
  }
  const payouts = await retryPendingPayouts().catch(e => { console.error('payouts:', e.message); return []; });
  return { reminders, payouts };
}
