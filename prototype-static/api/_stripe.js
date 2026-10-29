const CATALOG = require('../assets/catalog.js');

// Projet Vercel de la démo : CHEZNOUS_MODE=demo. Jamais de clé live sur la démo.
const IS_DEMO = process.env.CHEZNOUS_MODE === 'demo';

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

async function stripeRequest(method, path, params, extraHeaders = {}) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw Object.assign(new Error('STRIPE_SECRET_KEY manquante'), { status: 503 });
  if (IS_DEMO && !key.startsWith('sk_test_')) throw Object.assign(new Error('La démo exige une clé Stripe de test'), { status: 503 });
  const query = params ? toForm(params) : '';
  const res = await fetch(`https://api.stripe.com/v1${path}${method === 'GET' && query ? `?${query}` : ''}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      ...extraHeaders,
    },
    body: method === 'GET' ? undefined : query,
  });
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data.error?.message || 'Erreur Stripe'), { status: 502 });
  return data;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEMO_MAX_CUSTOM_PRICE = 1000;
const badItem = () => Object.assign(new Error("Cette annonce n'est pas encore payable en ligne."), { status: 400 });

// Site réel : les annonces des vendeurs sont lues en base avec la clé serveur, jamais depuis le navigateur.
async function fetchDbListings(ids, includeInactive) {
  if (IS_DEMO || ids.length === 0) return [];
  const { supabaseRest } = require('./_supabase');
  const rows = await supabaseRest('GET', `listings?id=in.(${ids.join(',')})&select=id,seller_id,seller_name,type,category,name,price_cad,active`);
  return rows.filter(r => includeInactive || r.active).map(r => ({
    id: r.id, sellerId: r.seller_id, seller: r.seller_name, type: r.type, cat: r.category, name: r.name, price: Number(r.price_cad),
  }));
}

// Démo : une annonce créée dans le navigateur n'existe nulle part côté serveur ; on accepte ses données, bornées,
// puisque la démo n'encaisse qu'en mode test.
function demoCustomListing(raw) {
  const c = raw.custom || (raw.n ? { name: raw.n, seller: raw.s, type: raw.t, price: raw.p } : null);
  if (!IS_DEMO || !c) return null;
  const price = Number(c.price);
  const name = String(c.name || '').trim().slice(0, 40);
  if (!name || !(price > 0 && price <= DEMO_MAX_CUSTOM_PRICE)) return null;
  return { id: String(raw.id).slice(0, 20), name, seller: String(c.seller || 'Ma Boutique').trim().slice(0, 40), type: c.type === 'service' ? 'service' : 'produit', cat: '', price, custom: true };
}

// Le navigateur n'envoie que des identifiants et des quantités : le prix vient du catalogue ou de la base.
// Une fois la session payée (paid), le prix gardé dans ses métadonnées fait foi, même si le vendeur l'a changé depuis.
async function priceOrder(mode, rawItems, { paid = false } = {}) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) throw Object.assign(new Error('Panier vide'), { status: 400 });
  const dbIds = [...new Set(rawItems.map(r => String(r && r.id).toLowerCase()).filter(id => UUID.test(id)))];
  const dbListings = await fetchDbListings(dbIds, paid);
  const lines = rawItems.map(raw => {
    const id = String(raw && raw.id).toLowerCase();
    const listing = UUID.test(id) ? dbListings.find(l => l.id === id)
      : CATALOG.find(p => p.id === Number(id)) || demoCustomListing(raw);
    if (!listing) throw badItem();
    const quantity = mode === 'booking' ? 1 : Math.min(MAX_QTY, Math.max(1, Math.floor(Number(raw.qty) || 1)));
    const unitPrice = paid && Number(raw.p) > 0 ? Number(raw.p) : listing.price;
    return { listing, quantity, unitPrice };
  });
  if (mode === 'booking' && (lines.length !== 1 || lines[0].listing.type !== 'service')) {
    throw Object.assign(new Error('Réservation invalide'), { status: 400 });
  }
  // Une prestation passe toujours par la réservation : sinon elle échapperait aux frais de service et au créneau.
  if (mode !== 'booking' && lines.some(l => l.listing.type === 'service')) {
    throw Object.assign(new Error('Les prestations se réservent depuis leur fiche, avec un créneau.'), { status: 400 });
  }
  const subtotal = Math.round(lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0) * 100) / 100;
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

module.exports = { CATALOG, IS_DEMO, stripeRequest, priceOrder, siteOrigin, readJson, send };
