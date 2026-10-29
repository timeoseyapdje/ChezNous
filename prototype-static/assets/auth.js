// Session réelle Supabase. Le localStorage n'est qu'un cache d'affichage : le rôle fait foi dans la table profiles,
// protégée par RLS et par un trigger qui interdit à un utilisateur de changer son propre rôle.
const SUPABASE_URL = 'https://ejsgiahqztydhulwbgly.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqc2dpYWhxenR5ZGh1bHdiZ2x5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxMjYzODUsImV4cCI6MjEwNTcwMjM4NX0.Xyg6vdIILJHAPvnE4Iemxy6kE6a_gF_7LAV0SErqom0';
const sb = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

async function fetchServerProfile(){
  if(!sb) throw new Error('Supabase indisponible');
  const { data:{ session } } = await sb.auth.getSession();
  if(!session) return null;
  const { data, error } = await sb.from('profiles').select('full_name, role').eq('id', session.user.id).maybeSingle();
  if(error) console.warn('profil Supabase :', error.message);
  return {
    email: session.user.email,
    name: (data && data.full_name) || (session.user.user_metadata && session.user.user_metadata.full_name) || nameFromEmail(session.user.email),
    role: (data && data.role) || 'buyer'
  };
}

function applyProfileCache(profile){
  const known = getCurrentUser() || {};
  const sameUser = known.email && known.email.toLowerCase()===profile.email.toLowerCase();
  saveCurrentUser({ ...(sameUser ? known : {}), name: profile.name, email: profile.email });
  try{
    localStorage.setItem('cheznous_logged_in','1');
    localStorage.setItem('cheznous_server_role', profile.role);
  }catch(e){}
  if(!isRoleAllowed(getRolePersisted(), profile.role)) persistRole('buyer');
}

function clearSessionCache(){
  try{
    ['cheznous_logged_in','cheznous_user','cheznous_server_role','cheznous_role'].forEach(k=>localStorage.removeItem(k));
  }catch(e){}
}

async function signOutEverywhere(){
  try{ if(sb) await sb.auth.signOut(); }catch(e){}
  clearSessionCache();
}

function authStateSignature(){
  return [isLoggedIn(), getServerRole(), getRolePersisted(), (getCurrentUser()||{}).email || ''].join('|');
}

// Au chargement, le cache est resynchronisé avec la vraie session ; s'il affichait un état faux, la page se recharge une fois.
const authReady = (async ()=>{
  const before = authStateSignature();
  let profile;
  try{ profile = await fetchServerProfile(); }
  catch(e){ return { offline:true, profile:null }; }
  if(profile) applyProfileCache(profile); else clearSessionCache();
  let reloaded = false;
  try{ reloaded = sessionStorage.getItem('cheznous_auth_reload')==='1'; }catch(e){}
  if(before !== authStateSignature() && !reloaded){
    try{ sessionStorage.setItem('cheznous_auth_reload','1'); }catch(e){}
    location.reload();
  } else {
    try{ sessionStorage.removeItem('cheznous_auth_reload'); }catch(e){}
  }
  return { offline:false, profile };
})();

document.addEventListener('DOMContentLoaded', restrictRoleSelect);
