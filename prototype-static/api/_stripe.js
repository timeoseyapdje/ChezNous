const CATALOG = require('../assets/catalog.js');

const BOOKING_FEE_RATE = 0.10;
const MAX_QTY = 20;

function toForm(obj, prefix, out = []) {
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;
    const name = prefix ? `${prefix}[${key}]` : key;
    if (typeof value === 'object') toForm(value, name, out);
    else out.push(`${encodeURIComponent(name)}=${encodeURIComponent(value)}`);
  }
  return out.join('&');
}

async function stripeRequest(method, path, params) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw Object.assign(new Error('STRIPE_SECRET_KEY manquante'), { status: 503 });
  const query = params ? toForm(params) : '';
  const res = await fetch(`https://api.stripe.com/v1${path}${method === 'GET' && query ? `?${query}` : ''}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: method === 'GET' ? undefined : query,
  });
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data.error?.message || 'Erreur Stripe'), { status: 502 });
  return data;
}

// Le navigateur n'envoie que des identifiants et des quantités : le prix vient toujours du catalogue serveur.
function priceOrder(mode, rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) throw Object.assign(new Error('Panier vide'), { status: 400 });
  const lines = rawItems.map(({ id, qty }) => {
    const listing = CATALOG.find(p => p.id === Number(id));
    if (!listing) throw Object.assign(new Error("Cette annonce n'est pas encore payable en ligne."), { status: 400 });
    const quantity = mode === 'booking' ? 1 : Math.min(MAX_QTY, Math.max(1, Math.floor(Number(qty) || 1)));
    return { listing, quantity };
  });
  if (mode === 'booking' && (lines.length !== 1 || lines[0].listing.type !== 'service')) {
    throw Object.assign(new Error('Réservation invalide'), { status: 400 });
  }
  const subtotal = lines.reduce((s, l) => s + l.listing.price * l.quantity, 0);
  const fees = mode === 'booking' ? Math.round(subtotal * BOOKING_FEE_RATE * 100) / 100 : 0;
  return { lines, subtotal, fees, total: subtotal + fees };
}

function siteOrigin(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  const proto = req.headers['x-forwarded-proto'] || 'http';
  return `${proto}://${req.headers['x-forwarded-host'] || req.headers.host}`;
}

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return JSON.parse(raw || '{}');
}

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

module.exports = { CATALOG, stripeRequest, priceOrder, siteOrigin, readJson, send };
