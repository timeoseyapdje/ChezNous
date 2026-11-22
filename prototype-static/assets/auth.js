// Session réelle Supabase. Le localStorage n'est qu'un cache d'affichage : le rôle fait foi dans la table profiles,
// protégée par RLS et par un trigger qui interdit à un utilisateur de changer son propre rôle.
const SUPABASE_URL = 'https://ejsgiahqztydhulwbgly.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqc2dpYWhxenR5ZGh1bHdiZ2x5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxMjYzODUsImV4cCI6MjEwNTcwMjM4NX0.Xyg6vdIILJHAPvnE4Iemxy6kE6a_gF_7LAV0SErqom0';
// La démo ne touche jamais Supabase : comptes, commandes et messages y restent dans le navigateur.
const sb = !IS_DEMO && window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

async function fetchServerProfile(){
  if(!sb) throw new Error('Supabase indisponible');
  const { data:{ session } } = await sb.auth.getSession();
  if(!session) return null;
  const { data, error } = await sb.from('profiles').select('full_name, role, avatar_url').eq('id', session.user.id).maybeSingle();
  if(error) console.warn('profil Supabase :', error.message);
  // Boutique officielle AkwaOne : compte vendeur unique, sans mode acheteur.
  // Thème Premium : appliqué seulement tant que la formule Premium est active.
  const [shop, theme, plan] = await Promise.all([
    sb.from('official_shops').select('seller_id').eq('seller_id', session.user.id).maybeSingle(),
    sb.from('premium_themes').select('site_accent, site_mode, shop_accent').eq('seller_id', session.user.id).maybeSingle(),
    sb.from('seller_plans').select('plan, status').eq('seller_id', session.user.id).maybeSingle()
  ]);
  const premium = !!(plan && plan.data && plan.data.plan==='premium' && plan.data.status==='active');
  return {
    avatar: (data && safeImageUrl(data.avatar_url)) || '',
    premium,
    theme: premium && theme && theme.data ? theme.data : null,
    officialShop: !!(shop && shop.data),
    id: session.user.id,
    email: session.user.email,
    name: (data && data.full_name) || (session.user.user_metadata && session.user.user_metadata.full_name) || nameFromEmail(session.user.email),
    role: (data && data.role) || 'buyer'
  };
}

function applyProfileCache(profile){
  const known = getCurrentUser() || {};
  const sameUser = known.email && known.email.toLowerCase()===profile.email.toLowerCase();
  if(!sameUser){
    // Autre compte sur le même navigateur : rien de l'ancien compte ne doit rester affiché.
    try{ ['akwaone_orders','akwaone_messages_v1','akwaone_read_notifs'].forEach(k=>localStorage.removeItem(k)); }catch(e){}
  }
  saveCurrentUser({ ...(sameUser ? known : {}), name: profile.name, email: profile.email, avatar: profile.avatar || '' });
  saveSiteTheme(profile.theme);
  try{
    localStorage.setItem('akwaone_logged_in','1');
    localStorage.setItem('akwaone_server_role', profile.role);
    if(profile.officialShop) localStorage.setItem('akwaone_official_shop','1'); else localStorage.removeItem('akwaone_official_shop');
  }catch(e){}
  if(profile.officialShop) persistRole('seller');
  else if(!isRoleAllowed(getRolePersisted(), profile.role)) persistRole('buyer');
}

function clearSessionCache(){
  try{
    ['akwaone_logged_in','akwaone_user','akwaone_server_role','akwaone_role','akwaone_official_shop','akwaone_site_theme','akwaone_messages_v1','akwaone_orders'].forEach(k=>localStorage.removeItem(k));
  }catch(e){}
}

// everywhere : ferme aussi les sessions ouvertes sur les autres appareils.
async function signOutEverywhere(everywhere){
  try{ if(sb) await sb.auth.signOut(everywhere ? { scope:'global' } : undefined); }catch(e){}
  clearSessionCache();
}

// En-tête à joindre aux appels /api : le serveur revalide ce jeton auprès de Supabase.
async function authHeaders(){
  if(!sb) return {};
  const { data:{ session } } = await sb.auth.getSession();
  return session ? { Authorization: 'Bearer ' + session.access_token } : {};
}

function authStateSignature(){
  return [isLoggedIn(), getServerRole(), getRolePersisted(), (getCurrentUser()||{}).email || ''].join('|');
}

// Au chargement, le cache est resynchronisé avec la vraie session ; s'il affichait un état faux, la page se recharge une fois.
const authReady = (async ()=>{
  if(IS_DEMO) return { offline:false, profile:null, demo:true };
  const before = authStateSignature();
  let profile;
  try{ profile = await fetchServerProfile(); }
  catch(e){ return { offline:true, profile:null }; }
  // A2F activée mais code pas encore saisi : la session reste incomplète tant que le code n'est pas validé.
  if(profile){
    let pending = false;
    try{ const { data } = await sb.auth.mfa.getAuthenticatorAssuranceLevel(); pending = !!(data && data.nextLevel==='aal2' && data.currentLevel!=='aal2'); }catch(e){}
    if(pending){
      const page = location.pathname.split('/').pop() || 'index.html';
      if(page !== 'connexion.html') location.replace('connexion.html?retour=' + encodeURIComponent(page + location.search));
      return { offline:false, profile:null, mfaPending:true };
    }
  }
  if(profile) applyProfileCache(profile); else clearSessionCache();
  let reloaded = false;
  try{ reloaded = sessionStorage.getItem('akwaone_auth_reload')==='1'; }catch(e){}
  if(before !== authStateSignature() && !reloaded){
    try{ sessionStorage.setItem('akwaone_auth_reload','1'); }catch(e){}
    location.reload();
  } else {
    try{ sessionStorage.removeItem('akwaone_auth_reload'); }catch(e){}
  }
  if(profile){ syncUnreadMessages(); syncServerNotifications(profile); }
  return { offline:false, profile };
})();

// Annonces actives de la marketplace (lecture publique, protégée par RLS).
const LISTING_COLUMNS = 'id, seller_id, seller_name, type, category, name, description, price_cad, cover_url, city, active, created_at';
// La colonne channel (boutique ou marketplace) vient de la migration 0007 : tant qu'elle n'existe pas, on relit sans elle.
async function loadRemoteListings(){
  if(!sb) return;
  try{
    let res = await sb.from('listings').select(LISTING_COLUMNS + ', channel').eq('active', true).order('created_at', { ascending:false }).limit(500);
    if(res.error) res = await sb.from('listings').select(LISTING_COLUMNS).eq('active', true).order('created_at', { ascending:false }).limit(500);
    if(!res.error && res.data){
      // Couleur choisie par les vendeurs Premium pour leurs annonces.
      const ids = [...new Set(res.data.map(r=>r.seller_id).filter(Boolean))];
      // Notes réelles : moyenne et nombre d'avis vérifiés par annonce (vue listing_ratings, migration 0014).
      if(res.data.length){
        const rt = await sb.from('listing_ratings').select('listing_id, rating, reviews').limit(5000);
        const byId = Object.fromEntries(((rt && rt.data) || []).map(x=>[x.listing_id, x]));
        res.data.forEach(r=>{ const x = byId[r.id]; r.rating = x ? Number(x.rating) : 0; r.reviews = x ? Number(x.reviews) : 0; });
      }
      if(ids.length){
        const themes = await sb.from('premium_themes').select('seller_id, shop_accent').in('seller_id', ids);
        const accents = Object.fromEntries(((themes && themes.data) || []).map(t=>[t.seller_id, t.shop_accent]));
        res.data.forEach(r=>{ r.shop_accent = accents[r.seller_id] || null; });
      }
      setRemoteListings(res.data);
    }
  }catch(e){}
}
loadRemoteListings();

// La cloche du site réel : commandes de l'acheteur, nouvelles commandes du vendeur et décisions de litige, lues dans Supabase.
async function syncServerNotifications(profile){
  try{
    const short = (iso)=> iso ? new Date(iso).toLocaleDateString('fr-CA',{day:'numeric',month:'short'}) : '';
    const fmtCad = (n)=> (typeof fmt==='function' ? fmt(Number(n)||0) : `${(Number(n)||0).toFixed(2)} $`);
    const cols = 'order_number, seller_name, status, escrow_status, amount_cad, paid_at, cancelled_at, created_at';
    const [bought, sold, disputes, reviews] = await Promise.all([
      sb.from('orders').select(cols).eq('buyer_id', profile.id).order('created_at', { ascending:false }).limit(8),
      profile.role==='seller' || profile.role==='admin'
        ? sb.from('orders').select(cols).eq('seller_id', profile.id).order('created_at', { ascending:false }).limit(8) : Promise.resolve({ data: [] }),
      sb.from('disputes').select('order_number, status, decision, decided_at, buyer_id, seller_id').or(`buyer_id.eq.${profile.id},seller_id.eq.${profile.id}`).order('created_at', { ascending:false }).limit(8),
      sb.from('reviews').select('order_number').limit(200)
    ]);
    const decided = new Map(((disputes && disputes.data) || []).filter(d=>d.status==='resolved').map(d=>[d.order_number, d]));
    const reviewed = new Set(((reviews && reviews.data) || []).map(r=>r.order_number));
    const list = [];
    ((bought && bought.data) || []).forEach(o=>{
      const n = o.order_number, seller = o.seller_name || 'AkwaOne', d = decided.get(n);
      if(d) list.push({ id:`s${n}-litige-${d.decision}`, icon:'scale', text: d.decision==='buyer' ? `Litige tranché en votre faveur : commande #${n} remboursée` : `Litige de la commande #${n} tranché en faveur du vendeur`, time: short(d.decided_at) });
      else if(o.status==='annulee' || o.status==='remboursee') list.push({ id:`s${n}-annulee`, icon:'rotate-ccw', text:`Commande annulée chez ${seller} — remboursement de ${fmtCad(o.amount_cad)}`, time: short(o.cancelled_at || o.created_at) });
      else if(o.escrow_status==='litige') list.push({ id:`s${n}-litige`, icon:'alert-triangle', text:`Litige en cours d'examen sur votre commande chez ${seller}`, time: short(o.created_at) });
      else if(o.status==='terminee' && !reviewed.has(n)) list.push({ id:`s${n}-avis`, icon:'star', text:`Laissez un avis pour ${seller}`, time: short(o.paid_at) });
      else if(o.status==='confirmee') list.push({ id:`s${n}-confirmee`, icon:'check-circle', text:`Commande confirmée chez ${seller} (${fmtCad(o.amount_cad)})`, time: short(o.paid_at) });
    });
    ((sold && sold.data) || []).forEach(o=>{
      const n = o.order_number, d = decided.get(n);
      if(d) list.push({ id:`v${n}-litige-${d.decision}`, icon:'scale', text: d.decision==='seller' ? `Litige #${n} tranché en votre faveur : paiement versé` : `Litige #${n} tranché en faveur du client (remboursé)`, time: short(d.decided_at), href:'tableau-de-bord.html' });
      else if(o.escrow_status==='litige') list.push({ id:`v${n}-litige`, icon:'alert-triangle', text:`Litige ouvert sur la commande #${n} : donnez votre version`, time: short(o.created_at), href:'tableau-de-bord.html' });
      else if(o.status==='confirmee' && o.escrow_status==='retenu') list.push({ id:`v${n}-nouvelle`, icon:'shopping-bag', text:`Nouvelle commande reçue #${n} (${fmtCad(o.amount_cad)})`, time: short(o.paid_at), href:'tableau-de-bord.html' });
      else if(o.status==='annulee' || o.status==='remboursee') list.push({ id:`v${n}-annulee`, icon:'rotate-ccw', text:`Commande #${n} annulée par le client`, time: short(o.cancelled_at || o.created_at), href:'tableau-de-bord.html' });
    });
    localStorage.setItem('akwaone_server_notifs', JSON.stringify(list.slice(0, 12)));
    if(typeof refreshNotifBadge==='function') refreshNotifBadge();
  }catch(e){}
}

// La cloche compte les messages non lus : on rafraîchit ce résumé depuis Supabase sur chaque page.
async function syncUnreadMessages(){
  try{
    const { data, error } = await sb.rpc('my_conversations');
    if(error) return;
    localStorage.setItem('akwaone_messages_v1', JSON.stringify(data.filter(r=>Number(r.unread)>0).map(r=>({
      id:r.partner_id, name:r.partner_name, unread:Number(r.unread), messages:[{text:r.last_body, time:''}]
    }))));
    if(typeof refreshNotifBadge==='function') refreshNotifBadge();
  }catch(e){}
}

document.addEventListener('DOMContentLoaded', restrictRoleSelect);
