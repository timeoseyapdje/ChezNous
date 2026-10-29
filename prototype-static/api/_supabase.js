const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');

function serviceKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !key) throw Object.assign(new Error('Supabase non configuré'), { status: 503 });
  return key;
}

// Écritures réservées au serveur : la clé service_role contourne la RLS, elle ne quitte jamais ces fonctions.
async function supabaseRest(method, path, body, extraHeaders = {}) {
  const key = serviceKey();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw Object.assign(new Error((data && data.message) || 'Erreur Supabase'), { status: 502 });
  return data;
}

// Le navigateur prouve son identité avec son jeton de session Supabase ; on le fait valider par Supabase Auth.
async function requireUser(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw Object.assign(new Error('Connexion requise'), { status: 401 });
  const key = serviceKey();
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${token}` } });
  if (!res.ok) throw Object.assign(new Error('Session expirée, reconnectez-vous.'), { status: 401 });
  return res.json();
}

module.exports = { supabaseRest, requireUser };
