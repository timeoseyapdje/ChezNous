// Clés d'accès (WebAuthn) : création depuis Mon profil, connexion sans mot de passe depuis la page Connexion.
const PK_B64 = {
  enc: (buf)=> btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''),
  dec: (s)=> Uint8Array.from(atob(String(s).replace(/-/g,'+').replace(/_/g,'/') + '==='.slice((String(s).length + 3) % 4)), c=>c.charCodeAt(0)).buffer
};
function passkeysSupported(){
  return !!(window.PublicKeyCredential && navigator.credentials && navigator.credentials.create);
}
async function passkeyApi(action, payload, withAuth){
  const headers = { 'Content-Type':'application/json', ...(withAuth ? await authHeaders() : {}) };
  const res = await fetch('api/passkey', { method:'POST', headers, body: JSON.stringify({ action, ...payload }) });
  const data = await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data.error || "Clé d'accès indisponible pour le moment.");
  return data;
}
function passkeyCancelled(err){
  return err && (err.name === 'NotAllowedError' || err.name === 'AbortError');
}

async function createPasskey(name){
  if(!passkeysSupported()) throw new Error("Cet appareil ou ce navigateur ne prend pas en charge les clés d'accès.");
  const { token, publicKey } = await passkeyApi('register-options', {}, true);
  publicKey.challenge = PK_B64.dec(publicKey.challenge);
  publicKey.user.id = PK_B64.dec(publicKey.user.id);
  publicKey.excludeCredentials = publicKey.excludeCredentials.map(c=>({ ...c, id: PK_B64.dec(c.id) }));
  let cred;
  try{ cred = await navigator.credentials.create({ publicKey }); }
  catch(err){
    if(err && err.name === 'InvalidStateError') throw new Error("Une clé d'accès existe déjà pour ce compte sur cet appareil.");
    if(passkeyCancelled(err)) return false;
    throw err;
  }
  const r = cred.response;
  if(typeof r.getPublicKey !== 'function' || !r.getPublicKey()) throw new Error("Mettez votre navigateur à jour pour créer une clé d'accès.");
  await passkeyApi('register-verify', {
    token, name,
    credential: {
      rawId: PK_B64.enc(cred.rawId),
      clientDataJSON: PK_B64.enc(r.clientDataJSON),
      authenticatorData: PK_B64.enc(r.getAuthenticatorData()),
      publicKey: PK_B64.enc(r.getPublicKey()),
      publicKeyAlgorithm: r.getPublicKeyAlgorithm(),
      transports: typeof r.getTransports === 'function' ? r.getTransports() : []
    }
  }, true);
  return true;
}

// Connexion : la clé signe le challenge, le serveur vérifie puis renvoie un jeton à usage unique échangé contre une session.
async function signInWithPasskey(){
  if(!passkeysSupported()) throw new Error("Cet appareil ou ce navigateur ne prend pas en charge les clés d'accès.");
  const { token, publicKey } = await passkeyApi('login-options', {}, false);
  publicKey.challenge = PK_B64.dec(publicKey.challenge);
  let cred;
  try{ cred = await navigator.credentials.get({ publicKey }); }
  catch(err){ if(passkeyCancelled(err)) return false; throw err; }
  const r = cred.response;
  const { token_hash } = await passkeyApi('login-verify', {
    token,
    credential: {
      rawId: PK_B64.enc(cred.rawId),
      clientDataJSON: PK_B64.enc(r.clientDataJSON),
      authenticatorData: PK_B64.enc(r.authenticatorData),
      signature: PK_B64.enc(r.signature),
      userHandle: r.userHandle ? PK_B64.enc(r.userHandle) : null
    }
  }, false);
  const { error } = await sb.auth.verifyOtp({ token_hash, type: 'magiclink' });
  if(error) throw new Error('Connexion impossible pour le moment.');
  return true;
}
