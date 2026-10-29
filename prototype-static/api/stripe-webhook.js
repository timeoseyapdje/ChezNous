const crypto = require('crypto');
const { send } = require('./_stripe');
const { retrieveSession, recordPaidSession } = require('./_orders');

const TOLERANCE_SECONDS = 300;

async function readRaw(req) {
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return raw;
}

// Même vérification que stripe.webhooks.constructEvent : HMAC-SHA256 de "timestamp.corps" avec le secret du endpoint.
function verifySignature(raw, header, secret) {
  const parts = Object.fromEntries(String(header || '').split(',').map(p => p.split('=')));
  const timestamp = Number(parts.t);
  const signatures = String(header || '').split(',').filter(p => p.startsWith('v1=')).map(p => p.slice(3));
  if (!timestamp || signatures.length === 0) return false;
  if (Math.abs(Date.now() / 1000 - timestamp) > TOLERANCE_SECONDS) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${raw}`, 'utf8').digest('hex');
  return signatures.some(sig => sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)));
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Méthode non autorisée' });
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return send(res, 503, { error: 'STRIPE_WEBHOOK_SECRET manquant' });

  const raw = await readRaw(req);
  if (!verifySignature(raw, req.headers['stripe-signature'], secret)) return send(res, 400, { error: 'Signature invalide' });

  const event = JSON.parse(raw);
  try {
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = await retrieveSession(event.data.object.id);
      await recordPaidSession(session);
    }
    return send(res, 200, { received: true });
  } catch (err) {
    // Une réponse 500 fait réessayer Stripe plus tard, ce qui est voulu si Supabase est momentanément indisponible.
    console.error('stripe-webhook error:', err.message);
    return send(res, 500, { error: 'Enregistrement impossible' });
  }
};

// Vercel ne doit pas parser le corps : la signature porte sur les octets bruts.
module.exports.config = { api: { bodyParser: false } };
module.exports.verifySignature = verifySignature;
