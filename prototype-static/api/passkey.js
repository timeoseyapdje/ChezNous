const crypto = require('crypto');
const { IS_DEMO, readJson, send } = require('./_stripe');
const { supabaseRest, requireUser } = require('./_supabase');

// Clés d'accès (WebAuthn) sans dépendance : le navigateur fournit la clé publique au format SPKI
// (getPublicKey), le serveur vérifie challenge, origine, rpId et signature avec le module crypto de Node.
// POST { action: 'register-options' | 'register-verify' | 'login-options' | 'login-verify', ... }

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const CHALLENGE_TTL_MS = 3 * 60 * 1000;
const ALGORITHMS = [-7, -8, -257];

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return send(res, 405, { error: 'Méthode non autorisée' });
    if (IS_DEMO) return send(res, 400, { error: "Les clés d'accès sont disponibles sur le site réel uniquement." });
    const body = await readJson(req);
    const rpId = relyingPartyId(req);
    switch (body.action) {
      case 'register-options': return send(res, 200, await registerOptions(req, rpId));
      case 'register-verify': return send(res, 200, await registerVerify(req, body, rpId));
      case 'login-options': return send(res, 200, loginOptions(rpId));
      case 'login-verify': return send(res, 200, await loginVerify(body, rpId));
      default: return send(res, 400, { error: 'Action inconnue' });
    }
  } catch (err) {
    console.error('passkey error:', err.message);
    return send(res, err.status || 500, { error: err.status && err.status < 500 ? err.message : "Clé d'accès indisponible pour le moment." });
  }
};

const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const b64url = (buf) => Buffer.from(buf).toString('base64url');
const fromB64url = (s) => Buffer.from(String(s || ''), 'base64url');
const sha256 = (data) => crypto.createHash('sha256').update(data).digest();

// www.akwaone.ca et akwaone.ca partagent les mêmes clés : le rpId est le domaine sans « www. ».
function relyingPartyId(req) {
  const host = String(process.env.SITE_URL ? new URL(process.env.SITE_URL).host : (req.headers['x-forwarded-host'] || req.headers.host || ''));
  return host.split(':')[0].replace(/^www\./, '').toLowerCase();
}

// Challenge sans état : signé par le serveur, valable 3 minutes, lié à l'usage et au compte.
function challengeSecret() {
  const key = process.env.PASSKEY_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw fail('Supabase non configuré', 503);
  return crypto.createHmac('sha256', key).update('akwaone-passkey-challenge').digest();
}
function issueChallenge(purpose, userId) {
  const challenge = b64url(crypto.randomBytes(32));
  const payload = b64url(JSON.stringify({ c: challenge, p: purpose, u: userId || null, e: Date.now() + CHALLENGE_TTL_MS }));
  const sig = b64url(crypto.createHmac('sha256', challengeSecret()).update(payload).digest());
  return { challenge, token: `${payload}.${sig}` };
}
function readChallenge(token, purpose, userId) {
  const [payload, sig] = String(token || '').split('.');
  if (!payload || !sig) throw fail('Demande expirée, réessayez.');
  const expected = crypto.createHmac('sha256', challengeSecret()).update(payload).digest();
  const given = fromB64url(sig);
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) throw fail('Demande invalide.');
  const data = JSON.parse(fromB64url(payload).toString('utf8'));
  if (data.p !== purpose || Date.now() > data.e || (userId && data.u !== userId)) throw fail('Demande expirée, réessayez.');
  return data.c;
}

function checkClientData(clientDataJSON, type, challenge, rpId) {
  let data;
  try { data = JSON.parse(fromB64url(clientDataJSON).toString('utf8')); } catch (e) { throw fail('Réponse de la clé illisible.'); }
  if (data.type !== type || data.challenge !== challenge) throw fail('Réponse de la clé invalide.');
  let origin;
  try { origin = new URL(data.origin); } catch (e) { throw fail('Origine invalide.'); }
  const host = origin.hostname.toLowerCase();
  const local = host === 'localhost' || host === '127.0.0.1';
  if ((origin.protocol !== 'https:' && !local) || (host !== rpId && !host.endsWith('.' + rpId))) throw fail('Origine invalide.');
}

// authenticatorData : rpIdHash (32) | flags (1) | signCount (4) | [données de la clé créée]
function parseAuthData(authData, rpId) {
  if (authData.length < 37) throw fail('Réponse de la clé incomplète.');
  if (!authData.subarray(0, 32).equals(sha256(rpId))) throw fail('Clé créée pour un autre site.');
  const flags = authData[32];
  if (!(flags & 0x01)) throw fail("Présence de l'utilisateur non confirmée.");
  return { flags, signCount: authData.readUInt32BE(33) };
}

async function registerOptions(req, rpId) {
  const user = await requireUser(req);
  const existing = await supabaseRest('GET', `passkeys?user_id=eq.${user.id}&select=credential_id,transports`);
  const { challenge, token } = issueChallenge('register', user.id);
  return {
    token,
    publicKey: {
      challenge,
      rp: { id: rpId, name: 'AkwaOne' },
      user: { id: b64url(Buffer.from(user.id)), name: user.email, displayName: (user.user_metadata && user.user_metadata.full_name) || user.email },
      pubKeyCredParams: ALGORITHMS.map((alg) => ({ type: 'public-key', alg })),
      authenticatorSelection: { residentKey: 'required', requireResidentKey: true, userVerification: 'preferred' },
      attestation: 'none',
      timeout: CHALLENGE_TTL_MS,
      excludeCredentials: (existing || []).map((p) => ({ type: 'public-key', id: p.credential_id, transports: p.transports || [] })),
    },
  };
}

async function registerVerify(req, body, rpId) {
  const user = await requireUser(req);
  const cred = body.credential || {};
  const challenge = readChallenge(body.token, 'register', user.id);
  checkClientData(cred.clientDataJSON, 'webauthn.create', challenge, rpId);
  const authData = fromB64url(cred.authenticatorData);
  const { flags, signCount } = parseAuthData(authData, rpId);
  if (!(flags & 0x40) || authData.length < 55) throw fail('Réponse de la clé incomplète.');
  const idLength = authData.readUInt16BE(53);
  const credentialId = authData.subarray(55, 55 + idLength);
  if (!credentialId.equals(fromB64url(cred.rawId))) throw fail('Réponse de la clé incohérente.');
  const algorithm = Number(cred.publicKeyAlgorithm);
  if (!ALGORITHMS.includes(algorithm)) throw fail('Type de clé non pris en charge.');
  const spki = fromB64url(cred.publicKey);
  try { crypto.createPublicKey({ key: spki, format: 'der', type: 'spki' }); } catch (e) { throw fail('Clé publique invalide.'); }
  const transports = Array.isArray(cred.transports) ? cred.transports.filter((t) => typeof t === 'string').slice(0, 6) : [];
  const name = String(body.name || '').trim().slice(0, 60) || 'Clé d\'accès';
  await supabaseRest('POST', 'passkeys', {
    user_id: user.id, credential_id: b64url(credentialId), public_key: b64url(spki), algorithm, sign_count: signCount, transports, name,
  }, { Prefer: 'return=minimal' });
  return { ok: true };
}

function loginOptions(rpId) {
  const { challenge, token } = issueChallenge('login');
  return { token, publicKey: { challenge, rpId, userVerification: 'preferred', timeout: CHALLENGE_TTL_MS, allowCredentials: [] } };
}

async function loginVerify(body, rpId) {
  const cred = body.credential || {};
  const challenge = readChallenge(body.token, 'login');
  checkClientData(cred.clientDataJSON, 'webauthn.get', challenge, rpId);
  const credentialId = b64url(fromB64url(cred.rawId));
  const rows = await supabaseRest('GET', `passkeys?credential_id=eq.${encodeURIComponent(credentialId)}&select=id,user_id,public_key,algorithm,sign_count`);
  const row = rows && rows[0];
  if (!row) throw fail("Cette clé d'accès n'est enregistrée sur aucun compte.", 401);
  if (cred.userHandle && fromB64url(cred.userHandle).toString('utf8') !== row.user_id) throw fail("Clé d'accès invalide.", 401);

  const authData = fromB64url(cred.authenticatorData);
  const { signCount } = parseAuthData(authData, rpId);
  const signed = Buffer.concat([authData, sha256(fromB64url(cred.clientDataJSON))]);
  const key = crypto.createPublicKey({ key: fromB64url(row.public_key), format: 'der', type: 'spki' });
  const valid = crypto.verify(row.algorithm === -8 ? null : 'sha256', signed, key, fromB64url(cred.signature));
  if (!valid) throw fail("Clé d'accès invalide.", 401);
  // Compteur de signatures : s'il recule, la clé a peut-être été copiée.
  if ((signCount > 0 || Number(row.sign_count) > 0) && signCount <= Number(row.sign_count)) throw fail("Clé d'accès refusée.", 401);
  await supabaseRest('PATCH', `passkeys?id=eq.${row.id}`, { sign_count: signCount, last_used_at: new Date().toISOString() }, { Prefer: 'return=minimal' });

  // Ouverture de la session : lien de connexion à usage unique généré côté serveur, échangé aussitôt par le navigateur.
  const email = await userEmail(row.user_id);
  const link = await authAdmin('POST', 'generate_link', { type: 'magiclink', email });
  const tokenHash = link.hashed_token || (link.properties && link.properties.hashed_token);
  if (!tokenHash) throw fail('Connexion impossible pour le moment.', 502);
  return { token_hash: tokenHash };
}

async function authAdmin(method, path, body) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !key) throw fail('Supabase non configuré', 503);
  const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/${path}`, {
    method,
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw fail('Connexion impossible pour le moment.', 502);
  return data;
}
async function userEmail(userId) {
  const user = await authAdmin('GET', `users/${userId}`);
  if (!user || !user.email) throw fail('Compte introuvable.', 401);
  return user.email;
}
