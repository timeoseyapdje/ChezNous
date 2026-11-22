// Pages réservées aux utilisateurs connectés : sans session, on les masque de la navigation
// et un accès direct renvoie vers la connexion, qui ramène ensuite à la page demandée.
const PRIVATE_PAGES = ['mes-commandes.html','messagerie.html','tableau-de-bord.html','profil.html'];
function isLoggedIn(){
  try{ return localStorage.getItem('akwaone_logged_in')==='1'; }catch(e){ return false; }
}
(function guardPrivatePages(){
  const page = location.pathname.split('/').pop() || 'index.html';
  if(PRIVATE_PAGES.includes(page) && !isLoggedIn()){
    location.replace('connexion.html?retour=' + encodeURIComponent(page + location.search));
    return;
  }
  const style = document.createElement('style');
  // Malik reste caché tant que le bandeau cookies ou une fenêtre est ouvert, sinon il les recouvre sur mobile.
  const overlays = ['#confirmModal','#akwaNotice','#cartModal','#stripeModal','#bookingModal','#profileModal','#orderModal','#notifMenu','#deliverMenu','#accountMenu','#prefsMenu'];
  style.textContent = overlays.map(o=>`body:has(${o}:not(.hidden)) #malikBtn, body:has(${o}:not(.hidden)) #malikBox`).join(',') + '{display:none !important}';
  // Menus déroulants de l'en-tête partagé (notifications, ville) : défini ici pour que toutes les pages l'aient.
  style.textContent += '.dropdown-panel{position:absolute;top:calc(100% + 8px);right:0;width:280px;max-width:calc(100vw - 32px);background:#fff;border-radius:16px;box-shadow:0 20px 40px -12px rgba(0,0,0,.35);padding:8px;z-index:50}';
  // Téléphone et petite tablette : en-tête sur deux rangées (logo + icônes, puis recherche) au lieu de quatre.
  // Langue, devise et ville passent dans le menu Préférences ; les icônes font 40 px pour le doigt.
  // Fenêtres de réservation et de paiement : sur un petit écran, leur contenu défile au lieu d'être coupé.
  style.textContent += '#bookingBody{min-height:0}#stripeModal>div:last-child{max-height:calc(100dvh - 24px);overflow-y:auto}';
  style.textContent += `#prefsWrap,.acct-icon{display:none}
  @media (max-width:767px){
    header>div:first-child{gap:8px !important;padding-top:10px !important;padding-bottom:10px !important;position:relative}
    header div:has(>#currencySelect)>div.relative{position:static}
    header div:has(>#currencySelect) .dropdown-panel{top:58px;left:16px;right:16px;width:auto;max-width:none}
    header>div:first-child>:first-child{order:1}
    header>div:first-child>:first-child .text-\\[9px\\]{display:none}
    header div:has(>#currencySelect){order:2;flex-wrap:nowrap !important;gap:2px !important;margin-left:auto}
    header div:has(>#heroSearch){order:3;flex-basis:100% !important;min-width:0 !important}
    header div:has(>#deliverBtn),#currencySelect,#langSelect{display:none !important}
    #prefsWrap{display:block}
    .acct-text{display:none}
    .acct-icon{display:block}
    #prefsBtn,#accountBtn,#notifBtn,#cartLauncher{min-width:40px;min-height:40px;display:flex;align-items:center;justify-content:center}
    #malikBtn{width:48px !important;height:48px !important;bottom:16px !important;right:12px !important}
    #malikBox{bottom:72px !important;right:8px !important;left:8px !important;width:auto !important;max-width:none !important;max-height:calc(100dvh - 96px) !important}
    #toasts{left:12px !important;right:72px !important}
    #cartCount{top:2px !important;right:0 !important}
    #notifBadge{top:6px !important;right:6px !important}
    header .h-11>a,header .h-11 button{padding-top:10px;padding-bottom:10px}
    input:not([type=checkbox]):not([type=radio]):not([type=file]),select,textarea{font-size:16px !important}
  }
  @media (pointer:coarse){
    #notifBtn,#cartLauncher,#accountBtn{min-width:40px;min-height:40px;display:flex;align-items:center;justify-content:center}
    #currencySelect,#langSelect{min-height:40px}
    header .h-11>a{padding-top:10px;padding-bottom:10px}
    input:not([type=checkbox]):not([type=radio]):not([type=file]),textarea{font-size:16px !important}
  }`;
  if(IS_DEMO) document.addEventListener('DOMContentLoaded', ()=>{
    if(document.getElementById('demoBanner')) return;
    const banner = document.createElement('div');
    banner.id = 'demoBanner';
    banner.setAttribute('role','note');
    banner.style.cssText = 'background:#F5B700;color:#131A17;font-size:12px;font-weight:600;text-align:center;padding:6px 16px;line-height:1.4';
    banner.textContent = 'Version démo : boutiques et données fictives. Paiements Stripe en mode test, aucun débit réel (carte 4242 4242 4242 4242).';
    document.body.prepend(banner);
  });
  if(!isLoggedIn()){
    const nav = PRIVATE_PAGES.map(p=>`header a[href^="${p}"], #mobileMenu a[href^="${p}"], footer a[href^="${p}"]`).join(',');
    style.textContent += `${nav}, header div:has(> #roleSelect){display:none !important}`;
  }
  // Boutique AkwaOne : ni sélecteur de rôle, ni panier, ni liens réservés aux acheteurs ou aux futurs vendeurs.
  if(isOfficialShop()){
    style.textContent += `header div:has(> #roleSelect), #cartLauncher, a[href^="mes-commandes.html"], a[href^="devenir-vendeur.html"], .buyer-only{display:none !important}`;
  }
  style.textContent += siteThemeCss(getSiteTheme());
  // Annonces des vendeurs Premium : bordure et bouton à la couleur choisie par le vendeur.
  style.textContent += '.shop-themed{border:2px solid var(--shop-accent) !important}.shop-themed .bg-forest{background-color:var(--shop-accent) !important}';
  style.id = 'akwaBaseStyle';
  document.head.appendChild(style);
})();

// Deux espaces : la boutique (produits d'AkwaOne) et la marketplace (vendeurs indépendants).
function getBoutiqueListings(){
  return getAllListings().filter(p=>p.channel==='boutique');
}
function getMarketplaceListings(){
  return getAllListings().filter(p=>p.channel!=='boutique');
}
function getCategoryVendorCount(catId){
  return new Set(getMarketplaceListings().filter(p=>p.cat===catId).map(p=>p.seller)).size;
}
function getTopListings(n){
  return getMarketplaceListings().sort((a,b)=> (b.rating*Math.log(b.reviews+1)) - (a.rating*Math.log(a.reviews+1)) || String(b.createdAt||'').localeCompare(String(a.createdAt||''))).slice(0,n);
}
// Carrousel d'accueil : annonces des vendeurs Premium (démo : boutiques fictives ; site réel : formules payées).
function getSponsoredListings(){
  return getMarketplaceListings().filter(p=>p.plan==='premium').slice(0, 6);
}
// Mise en avant dans les recherches (formules Pro et Premium) : à pertinence égale, elles passent devant.
const PLAN_BOOST = { premium: 2, pro: 1, basique: 0 };
function planBoost(p){ return PLAN_BOOST[p && p.plan] || 0; }
// Argument d'un onclick : les annonces de démo ont un id numérique, celles de la base un uuid (texte).
function jsArg(id){
  return typeof id==='number' ? String(id) : `'${String(id).replace(/[^a-zA-Z0-9-]/g,'')}'`;
}
function listingIdFrom(value){
  const v = String(value||'');
  return /^\d+$/.test(v) ? Number(v) : v;
}

const CUR = {
  CAD: { rate: 1, label: 'CAD — Dollar canadien', fmt: v => `${v.toFixed(2)} $` },
  USD: { rate: 0.73, label: 'USD — Dollar américain', fmt: v => `${v.toFixed(2)} $US` },
  EUR: { rate: 0.68, label: 'EUR — Euro', fmt: v => `${v.toFixed(2)} €` },
  XOF: { rate: 446, label: 'XOF — Franc CFA (Afrique de l\'Ouest)', fmt: v => `${Math.round(v).toLocaleString('fr-FR')} FCFA` },
  XAF: { rate: 446, label: 'XAF — Franc CFA (Afrique centrale)', fmt: v => `${Math.round(v).toLocaleString('fr-FR')} FCFA` },
  NGN: { rate: 1120, label: 'NGN — Naira nigérian', fmt: v => `${Math.round(v).toLocaleString('fr-FR')} ₦` },
  GHS: { rate: 10.9, label: 'GHS — Cedi ghanéen', fmt: v => `${v.toFixed(2)} GH₵` },
  ZAR: { rate: 13.4, label: 'ZAR — Rand sud-africain', fmt: v => `${v.toFixed(2)} R` },
  EGP: { rate: 36, label: 'EGP — Livre égyptienne', fmt: v => `${v.toFixed(2)} EGP` },
  MAD: { rate: 7.3, label: 'MAD — Dirham marocain', fmt: v => `${v.toFixed(2)} DH` },
  DZD: { rate: 98, label: 'DZD — Dinar algérien', fmt: v => `${v.toFixed(2)} DA` },
  TND: { rate: 2.3, label: 'TND — Dinar tunisien', fmt: v => `${v.toFixed(3)} DT` },
  LYD: { rate: 3.6, label: 'LYD — Dinar libyen', fmt: v => `${v.toFixed(3)} LD` },
  KES: { rate: 94, label: 'KES — Shilling kényan', fmt: v => `${Math.round(v).toLocaleString('fr-FR')} KSh` },
  TZS: { rate: 1900, label: 'TZS — Shilling tanzanien', fmt: v => `${Math.round(v).toLocaleString('fr-FR')} TSh` },
  UGX: { rate: 2700, label: 'UGX — Shilling ougandais', fmt: v => `${Math.round(v).toLocaleString('fr-FR')} USh` },
  RWF: { rate: 990, label: 'RWF — Franc rwandais', fmt: v => `${Math.round(v).toLocaleString('fr-FR')} FRw` },
  BIF: { rate: 2130, label: 'BIF — Franc burundais', fmt: v => `${Math.round(v).toLocaleString('fr-FR')} FBu` },
  ETB: { rate: 88, label: 'ETB — Birr éthiopien', fmt: v => `${v.toFixed(2)} Br` },
  SOS: { rate: 415, label: 'SOS — Shilling somalien', fmt: v => `${Math.round(v).toLocaleString('fr-FR')} Sh.So.` },
  DJF: { rate: 103, label: 'DJF — Franc djiboutien', fmt: v => `${Math.round(v).toLocaleString('fr-FR')} Fdj` },
  SDG: { rate: 440, label: 'SDG — Livre soudanaise', fmt: v => `${v.toFixed(2)} SDG` },
  SSP: { rate: 950, label: 'SSP — Livre sud-soudanaise', fmt: v => `${v.toFixed(2)} SSP` },
  ERN: { rate: 11, label: 'ERN — Nakfa érythréen', fmt: v => `${v.toFixed(2)} Nfk` },
  GMD: { rate: 51, label: 'GMD — Dalasi gambien', fmt: v => `${v.toFixed(2)} D` },
  GNF: { rate: 6300, label: 'GNF — Franc guinéen', fmt: v => `${Math.round(v).toLocaleString('fr-FR')} FG` },
  SLE: { rate: 16.5, label: 'SLE — Leone sierra-léonais', fmt: v => `${v.toFixed(2)} Le` },
  LRD: { rate: 137, label: 'LRD — Dollar libérien', fmt: v => `${v.toFixed(2)} L$` },
  CVE: { rate: 74, label: 'CVE — Escudo cap-verdien', fmt: v => `${v.toFixed(2)} $` },
  STN: { rate: 16.8, label: 'STN — Dobra santoméen', fmt: v => `${v.toFixed(2)} Db` },
  AOA: { rate: 660, label: 'AOA — Kwanza angolais', fmt: v => `${Math.round(v).toLocaleString('fr-FR')} Kz` },
  MZN: { rate: 47, label: 'MZN — Metical mozambicain', fmt: v => `${v.toFixed(2)} MT` },
  ZMW: { rate: 19, label: 'ZMW — Kwacha zambien', fmt: v => `${v.toFixed(2)} ZK` },
  MWK: { rate: 1270, label: 'MWK — Kwacha malawite', fmt: v => `${Math.round(v).toLocaleString('fr-FR')} MK` },
  ZWL: { rate: 12, label: 'ZWL — Dollar zimbabwéen', fmt: v => `${v.toFixed(2)} Z$` },
  BWP: { rate: 10, label: 'BWP — Pula botswanais', fmt: v => `${v.toFixed(2)} P` },
  NAD: { rate: 13.4, label: 'NAD — Dollar namibien', fmt: v => `${v.toFixed(2)} N$` },
  LSL: { rate: 13.4, label: 'LSL — Loti lesothan', fmt: v => `${v.toFixed(2)} L` },
  SZL: { rate: 13.4, label: 'SZL — Lilangeni eswatinien', fmt: v => `${v.toFixed(2)} E` },
  MGA: { rate: 3200, label: 'MGA — Ariary malgache', fmt: v => `${Math.round(v).toLocaleString('fr-FR')} Ar` },
  KMF: { rate: 340, label: 'KMF — Franc comorien', fmt: v => `${Math.round(v).toLocaleString('fr-FR')} CF` },
  SCR: { rate: 9.9, label: 'SCR — Roupie seychelloise', fmt: v => `${v.toFixed(2)} SR` },
  MUR: { rate: 34, label: 'MUR — Roupie mauricienne', fmt: v => `${v.toFixed(2)} Rs` },
  MRU: { rate: 29, label: 'MRU — Ouguiya mauritanien', fmt: v => `${v.toFixed(2)} UM` }
};

function getCurrency(){
  try{ return localStorage.getItem('akwaone_currency') || 'CAD'; }catch(e){ return 'CAD'; }
}
// Taux de change à jour (cahier 3.14) : source publique quotidienne, base CAD, gardée 12 h dans le navigateur.
// Les prix restent stockés et payés en CAD ; sans réseau, les taux ci-dessus servent de repli.
const RATES_URL = 'https://open.er-api.com/v6/latest/CAD';
function applyRates(rates){
  if(!rates) return false;
  let changed = false;
  Object.keys(CUR).forEach(code=>{
    const r = Number(rates[code]);
    if(code!=='CAD' && r > 0 && isFinite(r)){ if(CUR[code].rate !== r) changed = true; CUR[code].rate = r; }
  });
  return changed;
}
(function loadRates(){
  let cached = null;
  try{ cached = JSON.parse(localStorage.getItem('akwaone_rates') || 'null'); }catch(e){}
  if(cached) applyRates(cached.rates);
  if(cached && Date.now() - cached.at < 12*3600*1000) return;
  fetch(RATES_URL).then(r=>r.ok ? r.json() : null).then(data=>{
    if(!data || data.result !== 'success' || !data.rates) return;
    try{ localStorage.setItem('akwaone_rates', JSON.stringify({ at: Date.now(), rates: data.rates })); }catch(e){}
    // Prix déjà affichés dans une autre devise : on les recalcule avec les nouveaux taux.
    if(applyRates(data.rates) && window.currency && window.currency!=='CAD' && typeof onCurrencyChange === 'function') onCurrencyChange();
  }).catch(()=>{});
})();

function setCurrency(c){
  try{ localStorage.setItem('akwaone_currency', c); }catch(e){}
  window.currency = c;
  if(typeof onCurrencyChange === 'function') onCurrencyChange();
}
function fmt(amountCad){
  const c = CUR[window.currency] || CUR.CAD;
  return c.fmt(amountCad * c.rate);
}
function renderCurrencyOptions(){
  const sel = document.getElementById('currencySelect');
  if(!sel) return;
  const groups = {
    'Amérique du Nord / Europe': ['CAD','USD','EUR'],
    'Afrique': Object.keys(CUR).filter(k=>!['CAD','USD','EUR'].includes(k))
  };
  sel.innerHTML = Object.entries(groups).map(([label, codes])=>`
    <optgroup label="${label}">
      ${codes.map(code=>`<option value="${code}" class="text-ink">${CUR[code].label}</option>`).join('')}
    </optgroup>
  `).join('');
  sel.value = window.currency;
}

const LANGS = { fr: 'Français', en: 'English' };
function getLangPersisted(){
  try{ return localStorage.getItem('akwaone_lang') || 'fr'; }catch(e){ return 'fr'; }
}
function persistLang(l){
  try{ localStorage.setItem('akwaone_lang', l); }catch(e){}
}
// Moteur de traduction commun à toutes les pages : chaque nœud texte et attribut visible
// est traduit via I18N_EN, y compris le contenu injecté après coup (observer).
const I18N_ATTRS = ['placeholder','title','aria-label','alt'];
const I18N_PATTERNS = [
  [/^1 résultat$/, '1 result'],
  [/^(\d+) résultats?$/, '$1 results'],
  [/^(\d+) avis vérifiés$/, '$1 verified reviews'],
  [/^(\d+) avis$/, '$1 reviews'],
  [/^(\d+) vendeurs?$/, '$1 sellers'],
  [/^(\d+) article\(s\)$/, '$1 item(s)'],
  [/^Panier — (\d+) article\(s\)$/, 'Cart — $1 item(s)'],
  [/^Plusieurs vendeurs — Panier — (\d+) article\(s\)$/, 'Several sellers — Cart — $1 item(s)'],
  [/^Payer (.+)$/, 'Pay $1'],
  [/^Écrivez votre premier message à (.+)\.$/, 'Write your first message to $1.'],
  [/^Vous : (.+)$/, 'You: $1'],
  [/^Bonjour, (.+)$/, 'Hello, $1'],
  [/^Commande #(\d+) — (.+)\. Le paiement reste bloqué jusqu'à la décision de notre équipe\.$/, 'Order #$1 — $2. The payment stays on hold until our team decides.'],
  [/^Commande #(\d+)$/, 'Order #$1'],
  [/^Commande #(\d+) • payée le (.+)$/, 'Order #$1 • paid on $2'],
  [/^Client : (.+) • Vendeur : (.+)$/, 'Customer: $1 • Seller: $2'],
  [/^Moyen de paiement : (.+)$/, 'Payment method: $1'],
  [/^Précisions : (.+)$/, 'Details: $1'],
  [/^Précisions du client : (.+)$/, 'Customer details: $1'],
  [/^Remboursement de (.+) émis sur votre moyen de paiement \(sous 5 jours ouvrables\)\.$/, 'Refund of $1 issued to your payment method (within 5 business days).'],
  [/^Avis laissé \((\d)\/5\)$/, 'Review left ($1/5)'],
  [/^Votre avis sur (.+)$/, 'Your review of $1'],
  [/^(.+) — avis vérifié \(achat payé\)$/, '$1 — verified review (paid purchase)'],
  [/^1 étoile$/, '1 star'],
  [/^(\d) étoiles$/, '$1 stars'],
  [/^Ouvert le (.+)$/, 'Opened on $1'],
  [/^Commande confirmée chez (.+) \((.+)\)$/, 'Order confirmed at $1 ($2)'],
  [/^Commande en attente chez (.+)$/, 'Order pending at $1'],
  [/^Commande annulée chez (.+) — remboursement de (.+) en cours$/, 'Order cancelled at $1 — refund of $2 in progress'],
  [/^Litige ouvert sur votre commande chez (.+)$/, 'Dispute opened on your order at $1'],
  [/^Laissez un avis pour (.+)$/, 'Leave a review for $1'],
  [/^Nouveau message de (.+)$/, 'New message from $1'],
  [/^(.+) • (Acheteur|Vendeur|Administrateur)$/, '$1 • $2'],
  [/^Un lien de confirmation a été envoyé à (.+)\. Votre courriel changera dès que vous l'aurez ouvert\.$/, 'A confirmation link was sent to $1. Your email will change once you open it.'],
  [/^Mise à jour du descriptif « (.+) »$/, 'Description update for “$1”'],
  [/^Formule (Pro|Premium) activée\. Reçu Stripe envoyé par courriel\. Redirection vers votre tableau de bord\.\.\.$/, '$1 plan activated. Stripe receipt sent by email. Redirecting to your dashboard...'],
  [/^(.+) • (.+) • à partir de (.+)$/, '$1 • $2 • from $3'],
  [/^(.+) — (.+)$/, '$1 — $2'],
  [/^(.+) • Acheteuse? vérifiée?$/, '$1 • Verified buyer'],
];
const i18nTextOriginals = new WeakMap();
const i18nAttrOriginals = new WeakMap();
let i18nObserver = null;

function translateFr(fr){
  const key = fr.replace(/\s+/g,' ').trim();
  if(!key) return null;
  if(typeof I18N_EN !== 'undefined' && I18N_EN[key]) return I18N_EN[key];
  for(const [re, rep] of I18N_PATTERNS){
    const m = key.match(re);
    // Les parties capturées (noms de catégories, etc.) sont elles-mêmes traduites si possible.
    if(m) return rep.replace(/\$(\d)/g, (_, i)=> translateFr(m[i]) || m[i]);
  }
  return null;
}
function i18nTranslateTextNode(node, lang){
  if(!i18nTextOriginals.has(node)) i18nTextOriginals.set(node, node.nodeValue);
  const original = i18nTextOriginals.get(node);
  let next = original;
  if(lang==='en'){
    const en = translateFr(original);
    if(en){
      const lead = original.match(/^\s*/)[0], trail = original.match(/\s*$/)[0];
      next = lead + en + trail;
    }
  }
  if(node.nodeValue !== next) node.nodeValue = next;
}
function i18nTranslateElementAttrs(el, lang){
  for(const attr of I18N_ATTRS){
    if(!el.hasAttribute(attr)) continue;
    let originals = i18nAttrOriginals.get(el);
    if(!originals){ originals = {}; i18nAttrOriginals.set(el, originals); }
    if(!(attr in originals)) originals[attr] = el.getAttribute(attr);
    const value = lang==='en' ? (translateFr(originals[attr]) || originals[attr]) : originals[attr];
    if(el.getAttribute(attr) !== value) el.setAttribute(attr, value);
  }
}
function i18nTranslateTree(root, lang){
  if(root.nodeType === 3){ i18nTranslateTextNode(root, lang); return; }
  if(root.nodeType !== 1) return;
  if(root.closest && root.closest('script,style,[translate="no"]')) return;
  // Le contenu d'un textarea est saisi par l'utilisateur : seul son placeholder se traduit.
  if(root.tagName === 'TEXTAREA'){ i18nTranslateElementAttrs(root, lang); return; }
  i18nTranslateElementAttrs(root, lang);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode(n){
      if(n.nodeType!==1) return NodeFilter.FILTER_ACCEPT;
      if(n.tagName==='TEXTAREA'){ i18nTranslateElementAttrs(n, lang); return NodeFilter.FILTER_REJECT; }
      return /^(SCRIPT|STYLE)$/.test(n.tagName) || n.getAttribute('translate')==='no' ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
    }
  });
  let n;
  while((n = walker.nextNode())){
    if(n.nodeType===3) i18nTranslateTextNode(n, lang);
    else i18nTranslateElementAttrs(n, lang);
  }
}
function applyI18n(lang){
  document.documentElement.lang = lang;
  if(!document.body) return;
  if(!window.__i18nTitleFr) window.__i18nTitleFr = document.title;
  document.title = lang==='en' ? (translateFr(window.__i18nTitleFr) || window.__i18nTitleFr) : window.__i18nTitleFr;
  if(i18nObserver) i18nObserver.disconnect();
  i18nTranslateTree(document.body, lang);
  i18nObserver = new MutationObserver(mutations=>{
    const current = getLangPersisted();
    for(const m of mutations) m.addedNodes.forEach(node=>i18nTranslateTree(node, current));
  });
  i18nObserver.observe(document.body, {childList:true, subtree:true});
  const sel = document.getElementById('langSelect');
  if(sel) sel.value = lang;
}
// Version par défaut ; l'accueil et la marketplace la redéfinissent pour leurs propres rendus.
function setLang(l){
  persistLang(l);
  applyI18n(l);
}
document.addEventListener('DOMContentLoaded', ()=>applyI18n(getLangPersisted()));

function renderLangOptions(){
  const sel = document.getElementById('langSelect');
  if(!sel) return;
  sel.innerHTML = Object.entries(LANGS).map(([code,label])=>`<option value="${code}" class="text-ink">${label}</option>`).join('');
  sel.value = getLangPersisted();
}

function getCart(){
  try{ return JSON.parse(localStorage.getItem('akwaone_cart') || '[]'); }catch(e){ return []; }
}
function setCart(cart){
  try{ localStorage.setItem('akwaone_cart', JSON.stringify(cart)); }catch(e){}
}
function cartCount(cart){
  return cart.reduce((s,c)=>s+c.qty, 0);
}

// Site réel : cache des commandes Supabase (« Mes commandes », retour de paiement). Démo : commandes d'exemple locales.
function getOrders(){
  try{
    const raw = localStorage.getItem('akwaone_orders');
    if(raw) return JSON.parse(raw);
  }catch(e){}
  if(!IS_DEMO) return [];
  // Dates calculées depuis aujourd'hui : une commande « en cours » ne doit pas porter une date déjà passée.
  const seed = [
    {id:101, seller:'Ankara Boutique', service:'Pagnes wax premium x2', date:shortDateLabel(2), status:'confirmée', price:130, type:'mode', escrowStatus:'retenu', releaseCode:generateReleaseCode(), paidAt:new Date(Date.now()-86400000).toISOString()},
    {id:102, seller:'Épicerie Le Baobab', service:'Panier épicerie', date:`${shortDateLabel(1)} • ramassage 17:30`, status:'en attente', price:38, type:'epicerie', escrowStatus:'retenu', releaseCode:generateReleaseCode()},
    {id:103, seller:'Natural Roots Hair Studio', service:'Tresses box braids', date:`${shortDateLabel(-10)} • 10:30`, status:'terminée', price:80, type:'beaute', review:false, escrowStatus:'libéré', releaseCode:generateReleaseCode()}
  ];
  setOrders(seed);
  return seed;
}
function setOrders(orders){
  try{ localStorage.setItem('akwaone_orders', JSON.stringify(orders)); }catch(e){}
}
function shortDateLabel(daysFromToday){
  return new Date(Date.now() + daysFromToday*86400000).toLocaleDateString('fr-CA',{day:'2-digit',month:'short'});
}
function isoToShortDate(iso){
  // Une date seule (AAAA-MM-JJ) serait lue à minuit UTC, donc la veille au Canada : on la place à midi.
  const d = iso ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00` : iso) : null;
  return d && !isNaN(d) ? d.toLocaleDateString('fr-CA',{day:'2-digit',month:'short'}) : '';
}
// Heure toujours au format 17:54 : toLocaleTimeString('fr-CA') donnerait « 17 h 54 », différent des messages d'exemple.
function clockTime(date){
  const d = date instanceof Date ? date : new Date(date);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function generateReleaseCode(){
  return Math.random().toString(36).slice(2,8).toUpperCase();
}
function getDisputes(){
  try{ return JSON.parse(localStorage.getItem('akwaone_disputes') || '[]'); }catch(e){ return []; }
}
function setDisputes(list){
  try{ localStorage.setItem('akwaone_disputes', JSON.stringify(list)); }catch(e){}
}
function openDispute(orderId, buyerProof){
  const disputes = getDisputes();
  disputes.unshift({id:Date.now(), orderId, buyerProof, sellerProof:'', status:'ouvert', date:new Date().toLocaleDateString('fr-CA')});
  setDisputes(disputes);
  const orders = getOrders().map(o=> o.id===orderId ? {...o, escrowStatus:'litige'} : o);
  setOrders(orders);
}
function releaseEscrow(orderId, codeEntered){
  const orders = getOrders();
  const order = orders.find(o=>o.id===orderId);
  if(!order || order.releaseCode !== codeEntered.trim().toUpperCase()) return false;
  const updated = orders.map(o=> o.id===orderId ? {...o, escrowStatus:'libéré', status:'terminée'} : o);
  setOrders(updated);
  return true;
}

function normalizeText(str){
  return String(str).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
}
const PROHIBITED_WORDS = ['merde','putain','connard','connasse','conasse','salope','pute','batard','negre','negresse'];
const PROHIBITED_PREFIXES = ['encul'];
const PROHIBITED_PHRASES = ['sale noir','sale arabe'];
// Comparaison mot par mot : « dispute » ou « computer » ne contiennent pas un mot interdit,
// mais des lettres isolées sont recollées pour attraper « m e r d e ».
function containsProhibited(text){
  const words = normalizeText(text).replace(/[^a-z0-9]+/g,' ').trim().split(' ').filter(Boolean);
  const merged = [];
  let run = '';
  for(const w of words){
    if(w.length===1){ run += w; continue; }
    if(run){ merged.push(run); run = ''; }
    merged.push(w);
  }
  if(run) merged.push(run);
  const isBad = w => [w, w.replace(/s$/,'')].some(v => PROHIBITED_WORDS.includes(v) || PROHIBITED_PREFIXES.some(p=>v.startsWith(p)));
  const sentence = ' ' + merged.join(' ') + ' ';
  return merged.some(isBad) || PROHIBITED_PHRASES.some(p=>sentence.includes(' '+p+' '));
}

function safeUrl(url){
  return /^(https?:\/\/|assets\/)/i.test(String(url||'')) ? String(url) : '';
}
// Image fournie par un vendeur : https uniquement, une adresse http serait bloquée sur un site https.
function safeImageUrl(url){
  return /^(https:\/\/|assets\/|data:image\/(jpeg|png|webp);base64,)/i.test(String(url||'')) ? String(url) : '';
}

// Photo déposée par le vendeur : redimensionnée et recompressée en JPEG dans le navigateur (photo plus légère, sans données EXIF).
const LISTING_IMAGE_TYPES = ['image/jpeg','image/png','image/webp'];
const LISTING_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
function checkListingImage(file){
  if(!file) return '';
  if(!LISTING_IMAGE_TYPES.includes(file.type)) return 'Format non pris en charge : choisissez une photo JPG, PNG ou WebP.';
  if(file.size > LISTING_IMAGE_MAX_BYTES) return 'Photo trop lourde (10 Mo maximum).';
  return '';
}
function shrinkImage(file, maxSide, quality){
  return new Promise((resolve, reject)=>{
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = ()=>{
      const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(b=> b ? resolve({ blob: b, canvas }) : reject(new Error('Photo illisible.')), 'image/jpeg', quality);
    };
    img.onerror = ()=>{ URL.revokeObjectURL(url); reject(new Error('Photo illisible.')); };
    img.src = url;
  });
}
// Démo : la photo reste dans le navigateur (format data:, plus petite). Site réel : déposée dans Supabase Storage.
async function uploadListingImage(file){
  const problem = checkListingImage(file);
  if(problem) throw new Error(problem);
  if(IS_DEMO){
    const { canvas } = await shrinkImage(file, 800, 0.72);
    return canvas.toDataURL('image/jpeg', 0.72);
  }
  if(typeof sb === 'undefined' || !sb) throw new Error('Connexion requise pour déposer une photo.');
  const { data: { user } } = await sb.auth.getUser();
  if(!user) throw new Error('Connexion requise pour déposer une photo.');
  const { blob } = await shrinkImage(file, 1600, 0.85);
  const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.jpg`;
  const { error } = await sb.storage.from('listing-images').upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false });
  if(error) throw new Error("La photo n'a pas pu être envoyée. Vérifiez que la migration 0009 (photos des annonces) a été exécutée dans Supabase.");
  return sb.storage.from('listing-images').getPublicUrl(path).data.publicUrl;
}
// Zone de dépôt : aperçu immédiat de la photo choisie ou glissée.
function previewListingImage(input){
  const zone = input.closest('[data-photo-zone]');
  const preview = zone.querySelector('img');
  const label = zone.querySelector('[data-photo-label]');
  const file = input.files && input.files[0];
  const problem = checkListingImage(file);
  if(problem){ input.value=''; showToast(problem,'error'); }
  if(!file || problem){ preview.classList.add('hidden'); preview.removeAttribute('src'); label.textContent = label.dataset.empty; return; }
  if(preview.dataset.url) URL.revokeObjectURL(preview.dataset.url);
  preview.dataset.url = URL.createObjectURL(file);
  preview.src = preview.dataset.url;
  preview.classList.remove('hidden');
  label.textContent = file.name;
}
function resetListingImage(id){
  const input = document.getElementById(id);
  if(!input) return;
  input.value = '';
  previewListingImage(input);
}
// Visuels par défaut hébergés sur le site (aucune dépendance à un service d'images externe).
const DEFAULT_COVER = 'assets/visuels/couverture-defaut.svg';
const DEFAULT_AVATAR = 'assets/visuels/avatar-defaut.svg';
// Site réel : annonces lues dans Supabase par auth.js ; gardées en sessionStorage pour l'affichage immédiat de la page suivante.
let REMOTE_LISTINGS = (()=>{
  try{ return JSON.parse(sessionStorage.getItem('akwaone_listings_cache') || '[]'); }catch(e){ return []; }
})();
function listingFromRow(r){
  return {
    id: r.id, sellerId: r.seller_id, channel: r.channel==='boutique' ? 'boutique' : 'marketplace', cat: r.category, type: r.type, name: r.name, price: Number(r.price_cad),
    seller: r.seller_name, city: r.city, desc: r.description || '', tags: [], rating: Number(r.rating) || 0, reviews: Number(r.reviews) || 0, plan: ['pro','premium'].includes(r.plan) ? r.plan : 'basique',
    shipping: Number(r.shipping_cad) || 0,
    active: r.active !== false, createdAt: r.created_at,
    accent: /^#[0-9a-f]{6}$/i.test(r.shop_accent || '') ? r.shop_accent : '',
    cover: safeImageUrl(r.cover_url) || DEFAULT_COVER, image: DEFAULT_AVATAR
  };
}
function setRemoteListings(rows){
  REMOTE_LISTINGS = rows.map(listingFromRow);
  try{ sessionStorage.setItem('akwaone_listings_cache', JSON.stringify(REMOTE_LISTINGS)); }catch(e){}
  document.dispatchEvent(new CustomEvent('akwaone:listings'));
}
function getSellerListings(){
  try{ return JSON.parse(localStorage.getItem('akwaone_seller_catalog') || '[]'); }catch(e){ return []; }
}
// Les annonces publiées depuis le tableau de bord vendeur s'ajoutent au catalogue de démo.
function getAllListings(){
  // Site réel : seules les annonces enregistrées en base s'affichent (pas les brouillons locaux d'un navigateur).
  if(!IS_DEMO) return [...CATALOG, ...REMOTE_LISTINGS.filter(p=>p.active)];
  const ids = new Set(CATALOG.map(p=>p.id));
  let boutiqueExtras = [];
  try{ boutiqueExtras = JSON.parse(localStorage.getItem('akwaone_boutique_catalog') || '[]').filter(p=>p && p.channel==='boutique'); }catch(e){}
  const fromSellers = getSellerListings().filter(p=>p && !ids.has(p.id)).map(p=>({
    tags:[], desc:'', rating:5, reviews:0, plan:'basique', ...p,
    cover: safeImageUrl(p.cover) || DEFAULT_COVER,
    image: safeUrl(p.image) || DEFAULT_AVATAR
  }));
  return [...CATALOG, ...boutiqueExtras, ...fromSellers];
}
function orderTotal(o){
  return typeof o.total==='number' ? o.total : o.price;
}

const CITIES = ['Toronto','Montréal','Vancouver','Calgary','Ottawa','Québec','Winnipeg','Edmonton'];

function getDeliverCity(){
  try{ return localStorage.getItem('akwaone_city') || 'Toronto'; }catch(e){ return 'Toronto'; }
}
function setDeliverCity(city){
  try{ localStorage.setItem('akwaone_city', city); }catch(e){}
  const label = document.getElementById('deliverCityLabel');
  if(label) label.textContent = city;
  const menu = document.getElementById('deliverMenu');
  if(menu) menu.classList.add('hidden');
  const cityFilter = document.getElementById('filterCity');
  if(cityFilter && typeof filterMarket==='function'){ cityFilter.value = city; filterMarket(); }
}
function hasChosenDeliverCity(){
  try{ return !!localStorage.getItem('akwaone_city'); }catch(e){ return false; }
}
function toggleDeliverMenu(){
  const menu = document.getElementById('deliverMenu');
  if(!menu) return;
  if(menu.classList.contains('hidden')){
    menu.innerHTML = CITIES.map(c=>`<button onclick="setDeliverCity('${c}')" class="w-full text-left px-3 py-2 rounded-lg hover:bg-sand text-ink text-sm">${c}</button>`).join('');
  }
  menu.classList.toggle('hidden');
}

// Notifications calculées à partir des commandes et des messages non lus de la personne connectée.
function getNotifications(){
  if(!isLoggedIn()) return [];
  const list = [];
  // Site réel : notifications calculées depuis Supabase à chaque page (auth.js, syncServerNotifications).
  if(!IS_DEMO){
    try{ list.push(...JSON.parse(localStorage.getItem('akwaone_server_notifs') || '[]')); }catch(e){}
  }
  const disputes = getDisputes();
  // Chaque notification est datée du moment de l'événement (annulation, litige, paiement), pas du rendez-vous.
  (IS_DEMO ? getOrders().slice(0,5) : []).forEach(o=>{
    const total = fmt(orderTotal(o));
    const dispute = disputes.find(d=>d.orderId===o.id);
    if(o.status==='annulée') list.push({id:`o${o.id}-annulee`, icon:'rotate-ccw', text:`Commande annulée chez ${o.seller} — remboursement de ${total} en cours`, time:isoToShortDate(o.cancelledAt) || o.date});
    else if(o.escrowStatus==='litige') list.push({id:`o${o.id}-litige`, icon:'alert-triangle', text:`Litige ouvert sur votre commande chez ${o.seller}`, time:(dispute && isoToShortDate(dispute.date)) || o.date});
    else if(o.status==='terminée' && !o.review) list.push({id:`o${o.id}-avis`, icon:'star', text:`Laissez un avis pour ${o.seller}`, time:o.date});
    else if(o.status==='confirmée') list.push({id:`o${o.id}-confirmee`, icon:'check-circle', text:`Commande confirmée chez ${o.seller} (${total})`, time:isoToShortDate(o.paidAt) || o.date});
    else if(o.status==='en attente') list.push({id:`o${o.id}-attente`, icon:'clock', text:`Commande en attente chez ${o.seller}`, time:o.date});
  });
  try{
    const convs = JSON.parse(localStorage.getItem('akwaone_messages_v1') || '[]');
    convs.filter(c=>c.unread).forEach(c=>{
      const last = c.messages[c.messages.length-1];
      list.push({id:`m${c.id}-${c.messages.length}`, icon:'message-circle', text:`Nouveau message de ${c.name}`, time:last ? last.time : '', href:`messagerie.html?avec=${encodeURIComponent(c.id)}`});
    });
  }catch(e){}
  return list;
}
function getReadNotifs(){
  try{ return JSON.parse(localStorage.getItem('akwaone_read_notifs') || '[]'); }catch(e){ return []; }
}
function setReadNotifs(ids){
  try{ localStorage.setItem('akwaone_read_notifs', JSON.stringify(ids)); }catch(e){}
}
function unreadNotifCount(){
  const read = getReadNotifs();
  return getNotifications().filter(n=>!read.includes(n.id)).length;
}
function refreshNotifBadge(){
  const badge = document.getElementById('notifBadge');
  if(!badge) return;
  const count = unreadNotifCount();
  badge.textContent = count;
  badge.classList.toggle('hidden', count===0);
}
function toggleNotifMenu(){
  const menu = document.getElementById('notifMenu');
  if(!menu) return;
  const opening = menu.classList.contains('hidden');
  if(opening){
    const read = getReadNotifs();
    const notifs = getNotifications();
    menu.innerHTML = notifs.length ? notifs.map(n=>`
      <a href="${n.href || 'mes-commandes.html'}" class="flex gap-3 px-3 py-2.5 rounded-lg hover:bg-sand ${read.includes(n.id)?'opacity-50':''}">
        <i data-lucide="${n.icon}" class="w-4 h-4 text-forest shrink-0 mt-0.5"></i>
        <div>
          <div class="text-sm text-ink">${escapeHtmlGlobal(n.text)}</div>
          <div class="text-[11px] opacity-50 text-ink">${escapeHtmlGlobal(n.time)}</div>
        </div>
      </a>
    `).join('') : `<div class="px-3 py-4 text-sm text-ink opacity-60 text-center">Aucune notification</div>`;
    // Seulement les icônes du menu : redessiner toute la page remplacerait l'icône de la cloche qu'on vient de cliquer.
    if(typeof lucide !== 'undefined') lucide.createIcons({root:menu});
    setReadNotifs(notifs.map(n=>n.id));
    refreshNotifBadge();
  }
  menu.classList.toggle('hidden');
}

document.addEventListener('keydown', function(e){
  if(e.key==='Enter' && e.target && e.target.id==='malikInput') sendChat();
});
// composedPath() garde le chemin du clic même si l'élément cliqué a été remplacé entre-temps (icônes redessinées).
document.addEventListener('click', function(e){
  const path = e.composedPath();
  const deliverMenu = document.getElementById('deliverMenu');
  const deliverBtn = document.getElementById('deliverBtn');
  if(deliverMenu && !deliverMenu.classList.contains('hidden') && !path.includes(deliverMenu) && !path.includes(deliverBtn)){
    deliverMenu.classList.add('hidden');
  }
  const prefsMenu = document.getElementById('prefsMenu');
  if(prefsMenu && !prefsMenu.classList.contains('hidden') && !path.includes(prefsMenu) && !path.includes(document.getElementById('prefsBtn'))){
    prefsMenu.classList.add('hidden');
  }
  const accountMenu = document.getElementById('accountMenu');
  const accountBtn = document.getElementById('accountBtn');
  if(accountMenu && !accountMenu.classList.contains('hidden') && !path.includes(accountMenu) && !path.includes(accountBtn)){
    accountMenu.classList.add('hidden');
  }
  const notifMenu = document.getElementById('notifMenu');
  const notifBtn = document.getElementById('notifBtn');
  if(notifMenu && !notifMenu.classList.contains('hidden') && !path.includes(notifMenu) && !path.includes(notifBtn)){
    notifMenu.classList.add('hidden');
  }
});

function ensureCartModal(){
  if(document.getElementById('cartModal')) return;
  const div = document.createElement('div');
  div.innerHTML = `
    <div id="cartModal" class="fixed inset-0 z-[90] hidden">
      <div class="absolute inset-0 bg-ink/50" onclick="closeCart()"></div>
      <div class="absolute right-0 top-0 bottom-0 w-full max-w-[420px] bg-white flex flex-col">
        <div class="p-5 border-b border-line flex items-center justify-between">
          <h3 class="font-display text-xl font-bold">Panier</h3>
          <button onclick="closeCart()" aria-label="Fermer" class="w-8 h-8 rounded-full bg-sand flex items-center justify-center"><i data-lucide="x" class="w-4 h-4"></i></button>
        </div>
        <div id="cartItems" class="flex-1 overflow-auto p-5 space-y-4"></div>
        <div class="p-5 border-t border-line space-y-3">
          <div class="flex justify-between text-sm"><span class="opacity-60">Sous-total</span><span id="cartSubtotal" class="font-semibold">0.00 $</span></div>
          <button onclick="window.location.href='marketplace.html?checkout=1'" class="w-full bg-coral hover:brightness-95 text-white rounded-full py-3 font-bold">Passer à la caisse</button>
          <p class="text-center text-[11px] opacity-50">Livraison estimée 3 à 5 jours ouvrables</p>
        </div>
      </div>
    </div>`;
  document.body.appendChild(div.firstElementChild);
}
function cartAdd(id, qty=1){
  const cart = getCart();
  const it = cart.find(c=>c.id===id);
  if(it) it.qty += qty; else cart.push({id, qty});
  setCart(cart);
  refreshCartBadge();
}
function renderCartGeneric(){
  const cart = getCart();
  const box = document.getElementById('cartItems');
  if(!box) return;
  if(cart.length===0){
    box.innerHTML = `<div class="text-center py-10 opacity-50 text-sm">Votre panier est vide.</div>`;
  } else {
    const listings = getAllListings();
    box.innerHTML = cart.map(c=>{
      const p = listings.find(x=>x.id===c.id);
      if(!p) return '';
      return `
      <div class="flex gap-3 items-center">
        <img alt="" src="${escapeHtmlGlobal(p.cover)}" loading="lazy" class="w-16 h-16 rounded-lg object-cover shrink-0">
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-sm truncate">${escapeHtmlGlobal(p.name)}</div>
          <div class="text-xs opacity-60">${fmt(p.price)} x ${c.qty}</div>
        </div>
      </div>`;
    }).join('');
  }
  const all = getAllListings();
  const subtotal = cart.reduce((s,c)=>{ const p = all.find(x=>x.id===c.id); return s + (p?p.price*c.qty:0); }, 0);
  const sub = document.getElementById('cartSubtotal');
  if(sub) sub.textContent = fmt(subtotal);
  if(typeof lucide !== 'undefined') lucide.createIcons();
}
if(typeof window.refreshCartBadge === 'undefined'){
  window.refreshCartBadge = function(){
    const el = document.getElementById('cartCount');
    if(el) el.textContent = cartCount(getCart());
  };
}
if(typeof window.openCart === 'undefined'){
  window.openCart = function(){
    ensureCartModal();
    renderCartGeneric();
    document.getElementById('cartModal').classList.remove('hidden');
  };
  window.closeCart = function(){
    const m = document.getElementById('cartModal');
    if(m) m.classList.add('hidden');
  };
}

const CATEGORIES = [
  {id:'epicerie', label:'Épicerie africaine', icon:'shopping-basket'},
  {id:'mode', label:'Mode & tissus', icon:'shirt'},
  {id:'beaute', label:'Beauté & cheveux afro', icon:'sparkles'},
  {id:'artisanat', label:'Artisanat & décoration', icon:'palette'},
  {id:'cuisine', label:'Cuisine maison & traiteur', icon:'utensils'},
  {id:'services', label:'Services communautaires', icon:'users'}
];

function renderSiteHeader(active){
  const navLink = (href, label, key)=> `<a href="${href}" class="shrink-0 hover:opacity-80 font-medium whitespace-nowrap ${active===key?'opacity-100 underline underline-offset-4':''}">${label}</a>`;
  return `
  <header class="bg-ink text-white">
    <div class="max-w-[1400px] mx-auto px-4 md:px-6 py-3 flex flex-wrap items-center gap-3">
      <a href="index.html" class="flex items-center gap-2 shrink-0">
        <img src="assets/logos/akwaone-icone.svg" alt="" width="36" height="36" class="w-9 h-9 rounded-lg shrink-0">
        <div class="leading-none">
          <div class="font-display font-bold text-lg">AkwaOne</div>
          <div class="text-[9px] opacity-60 tracking-wider">DIASPORA AFRICAINE • CANADA</div>
        </div>
      </a>
      <div class="relative shrink-0">
        <button id="deliverBtn" onclick="toggleDeliverMenu()" class="flex items-center gap-2 text-xs px-2 py-1.5 rounded hover:bg-white/10">
          <i data-lucide="map-pin" class="w-4 h-4"></i>
          <div class="text-left leading-tight">
            <div class="text-[10px]">Livrer à</div>
            <div class="font-semibold" id="deliverCityLabel">Toronto</div>
          </div>
        </button>
        <div id="deliverMenu" class="dropdown-panel hidden"></div>
      </div>
      <div class="flex-1 min-w-[220px] flex bg-white rounded-md overflow-hidden">
        <select id="heroCategory" aria-label="Catégorie" class="hidden sm:block bg-sand text-ink text-xs px-2 border-r border-line outline-none max-w-[160px]">
          <option value="">Toutes catégories</option>
          ${CATEGORIES.map(c=>`<option value="${c.id}">${c.label}</option>`).join('')}
        </select>
        <input id="heroSearch" onkeydown="if(event.key==='Enter')goToMarketplaceGlobal()" placeholder="Rechercher sur AkwaOne…" aria-label="Rechercher un produit, un plat, un service" class="flex-1 px-3 py-2 text-sm text-ink outline-none min-w-0">
        <button onclick="goToMarketplaceGlobal()" aria-label="Rechercher" class="bg-forest hover:brightness-110 text-white px-4 flex items-center justify-center shrink-0">
          <i data-lucide="search" class="w-4 h-4"></i>
        </button>
      </div>
      <div class="flex flex-wrap items-center justify-end gap-x-3 gap-y-1.5 text-xs min-w-0 ml-auto" style="max-width:100%">
        <select id="currencySelect" onchange="setCurrency(this.value)" aria-label="Devise" class="bg-transparent text-xs font-medium outline-none cursor-pointer" style="max-width:170px"></select>
        <select id="langSelect" aria-label="Langue" onchange="setLang(this.value)" class="bg-transparent text-xs font-medium outline-none cursor-pointer"></select>
        <div class="relative">
          <button id="accountBtn" class="text-left leading-tight hover:opacity-80"></button>
          <div id="accountMenu" class="dropdown-panel hidden"></div>
        </div>
        <div class="relative">
          <button id="notifBtn" onclick="toggleNotifMenu()" aria-label="Notifications" class="relative hover:opacity-80">
            <i data-lucide="bell" class="w-5 h-5"></i>
            <span id="notifBadge" class="absolute -top-1 -right-1 bg-coral text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center hidden">0</span>
          </button>
          <div id="notifMenu" class="dropdown-panel hidden"></div>
        </div>
        <button id="cartLauncher" onclick="openCart()" class="relative flex items-center hover:opacity-80">
          <i data-lucide="shopping-cart" class="w-6 h-6"></i>
          <span id="cartCount" class="absolute -top-2 -right-2 bg-forest text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">0</span>
        </button>
      </div>
    </div>
    <div class="border-t border-white/10 bg-forestDark">
      <div class="max-w-[1400px] mx-auto px-4 md:px-6 h-11 flex items-center gap-5 overflow-x-auto no-scrollbar text-sm">
        ${navLink('index.html','Accueil','accueil')}
        ${navLink('boutique.html','Boutique','boutique')}
        ${navLink('marketplace.html','Marketplace','marketplace')}
        <div class="nav-cats items-center gap-5">${CATEGORIES.map(c=>`<a href="marketplace.html?categorie=${c.id}" class="shrink-0 hover:opacity-80 font-medium whitespace-nowrap">${c.label}</a>`).join('')}</div>
        ${navLink('mes-commandes.html','Mes commandes','commandes')}
        ${navLink('messagerie.html','Messagerie','messagerie')}
        <div id="navDashboardLink" style="display:contents"></div>
        ${navLink('contact.html','Contact','contact')}
        <div class="hidden md:flex items-center gap-2 ml-auto shrink-0">
          <span class="text-[10px] font-semibold opacity-60">RÔLE</span>
          <select id="roleSelect" aria-label="Rôle" onchange="changeRoleGlobal(this.value)" class="bg-transparent text-xs font-medium outline-none cursor-pointer">
            <option value="buyer" class="text-ink">Acheteur</option>
            <option value="seller" class="text-ink">Vendeur</option>
            <option value="admin" class="text-ink">Administrateur</option>
          </select>
        </div>
        ${navLink('devenir-vendeur.html','<span class="md:hidden">Vendre</span><span class="hidden md:inline">Vendre sur AkwaOne</span>','vendre')}
      </div>
    </div>
  </header>`;
}

function goToMarketplaceGlobal(){
  const el = document.getElementById('heroSearch');
  const catEl = document.getElementById('heroCategory');
  const params = new URLSearchParams();
  if(el && el.value) params.set('q', el.value);
  if(catEl && catEl.value) params.set('categorie', catEl.value);
  window.location.href = 'marketplace.html' + (params.toString() ? '?'+params.toString() : '');
}

function getCurrentUser(){
  try{
    const u = JSON.parse(localStorage.getItem('akwaone_user'));
    if(u && u.email) return u;
  }catch(e){}
  return null;
}
function saveCurrentUser(user){
  try{ localStorage.setItem('akwaone_user', JSON.stringify(user)); }catch(e){}
}
// Pour une connexion sans nom saisi : « awa.diallo@mail.ca » devient « Awa Diallo ».
function nameFromEmail(email){
  return email.split('@')[0].split(/[._-]+/).filter(Boolean).map(w=>w[0].toUpperCase()+w.slice(1)).join(' ') || email;
}
function userFirstName(user){
  return user ? user.name.split(/\s+/)[0] : '';
}
function userInitials(user){
  return user ? user.name.split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join('') : '';
}
function escapeHtmlGlobal(str){
  return String(str).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function updateAccountButtonGlobal(){
  const btn = document.getElementById('accountBtn');
  if(!btn) return;
  let loggedIn = false;
  try{ loggedIn = localStorage.getItem('akwaone_logged_in')==='1'; }catch(e){}
  if(loggedIn){
    btn.onclick = toggleAccountMenu;
    btn.setAttribute('aria-haspopup','menu');
    const first = userFirstName(getCurrentUser());
    btn.setAttribute('aria-label','Mon compte');
    const u = getCurrentUser();
    const icon = u && safeImageUrl(u.avatar) ? `<img src="${escapeHtmlGlobal(u.avatar)}" alt="" class="acct-icon w-7 h-7 rounded-full object-cover">` : '<i data-lucide="circle-user" class="acct-icon w-6 h-6"></i>';
    btn.innerHTML = `<span class="acct-text"><div class="text-[10px]">${first ? 'Bonjour, ' + escapeHtmlGlobal(first) : 'Bonjour'}</div><div class="font-semibold">Comptes & Commandes</div></span>${icon}`;
  } else {
    btn.onclick = ()=>{ window.location.href='connexion.html'; };
    btn.setAttribute('aria-label','Se connecter');
    btn.innerHTML = `<span class="acct-text"><div class="font-semibold">Se connecter</div></span><i data-lucide="log-in" class="acct-icon w-6 h-6"></i>`;
  }
  if(typeof lucide!=='undefined') lucide.createIcons({root:btn});
}

const ROLE_NAMES = { buyer:'Acheteur', seller:'Vendeur', admin:'Administrateur' };
// Menu du compte, identique sur toutes les pages : profil, commandes, messagerie, tableau de bord et déconnexion.
function toggleAccountMenu(){
  const menu = document.getElementById('accountMenu');
  if(!menu) return;
  if(!menu.classList.contains('hidden')){ menu.classList.add('hidden'); return; }
  const user = getCurrentUser() || { name:'Mon compte', email:'' };
  const role = IS_DEMO ? getRolePersisted() : getServerRole();
  const item = (href, icon, label)=>`<a href="${href}" class="flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-sand text-ink text-sm"><i data-lucide="${icon}" class="w-4 h-4"></i> ${label}</a>`;
  menu.innerHTML = `
    <div class="flex items-center gap-3 px-3 py-2 border-b border-line mb-1">
      ${avatarHtml(user, 'w-10 h-10')}
      <div class="min-w-0 text-ink">
        <div class="font-semibold text-sm truncate">${escapeHtmlGlobal(user.name)}</div>
        <div class="text-xs opacity-60 truncate">${escapeHtmlGlobal([user.email, ROLE_NAMES[role]].filter(Boolean).join(' • '))}</div>
      </div>
    </div>
    ${item('profil.html','settings','Paramètres')}
    ${item('mes-commandes.html','package','Mes commandes')}
    ${item('messagerie.html','message-square','Messagerie')}
    ${role==='seller' || role==='admin' ? item('tableau-de-bord.html','layout-dashboard','Tableau de bord') : item('devenir-vendeur.html','store','Ouvrir ma boutique')}
    <button onclick="logoutGlobal()" class="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-sand text-ink text-sm border-t border-line mt-1"><i data-lucide="log-out" class="w-4 h-4"></i> Se déconnecter</button>`;
  menu.classList.remove('hidden');
  if(typeof lucide!=='undefined') lucide.createIcons({root:menu});
}
// Menu Préférences (téléphone) : mêmes réglages que les listes de l'en-tête, masquées sur petit écran.
function setupMobilePrefs(){
  const anchor = document.getElementById('accountBtn');
  const group = anchor && anchor.closest('header div:has(> #currencySelect)');
  if(!group || document.getElementById('prefsWrap')) return;
  const wrap = document.createElement('div');
  wrap.id = 'prefsWrap';
  wrap.className = 'relative';
  wrap.innerHTML = `<button id="prefsBtn" onclick="togglePrefsMenu()" aria-label="Langue, devise et ville" class="hover:opacity-80"><i data-lucide="globe" class="w-5 h-5"></i></button><div id="prefsMenu" class="dropdown-panel hidden"></div>`;
  group.insertBefore(wrap, anchor.parentElement);
  if(typeof lucide!=='undefined') lucide.createIcons({root:wrap});
}
function togglePrefsMenu(){
  const menu = document.getElementById('prefsMenu');
  if(!menu) return;
  if(!menu.classList.contains('hidden')){ menu.classList.add('hidden'); return; }
  const lang = document.getElementById('langSelect'), cur = document.getElementById('currencySelect');
  const field = 'width:100%;margin-top:4px;border:1px solid #E5E5E5;border-radius:12px;padding:10px 12px;background:#fff;color:#131A17';
  menu.innerHTML = `<div class="p-2 space-y-3 text-ink text-sm">
    <label class="block"><span class="text-xs font-bold tracking-widest opacity-60">LANGUE</span><select style="${field}" onchange="setLang(this.value)">${lang ? lang.innerHTML : ''}</select></label>
    <label class="block"><span class="text-xs font-bold tracking-widest opacity-60">DEVISE</span><select style="${field}" onchange="setCurrency(this.value)">${cur ? cur.innerHTML : ''}</select></label>
    <label class="block"><span class="text-xs font-bold tracking-widest opacity-60">LIVRER À</span><select style="${field}" onchange="setDeliverCity(this.value)">${CITIES.map(c=>`<option ${c===getDeliverCity()?'selected':''}>${c}</option>`).join('')}</select></label>
  </div>`;
  const selects = menu.querySelectorAll('select');
  if(lang) selects[0].value = lang.value;
  if(cur) selects[1].value = cur.value;
  menu.classList.remove('hidden');
}
document.addEventListener('DOMContentLoaded', setupMobilePrefs);

// Fenêtre de confirmation du site (remplace confirm() du navigateur). Renvoie une promesse : true si l'action est confirmée.
function confirmDialog({ title, message, confirmLabel = 'Confirmer', cancelLabel = 'Annuler', danger = false, icon = 'help-circle' }){
  return new Promise(resolve=>{
    const prev = document.activeElement;
    const wrap = document.createElement('div');
    wrap.id = 'confirmModal';
    wrap.className = 'fixed inset-0 flex items-center justify-center p-4';
    wrap.style.zIndex = '90';
    wrap.setAttribute('role','dialog');
    wrap.setAttribute('aria-modal','true');
    wrap.innerHTML = `
      <div data-close class="absolute inset-0" style="background:rgba(0,0,0,.5)"></div>
      <div class="relative bg-white text-ink rounded-2xl shadow-2xl w-full p-6" style="max-width:400px">
        <div class="w-12 h-12 rounded-full flex items-center justify-center ${danger ? 'bg-red-50 text-red-600' : 'bg-sand'}"><i data-lucide="${icon}" class="w-6 h-6"></i></div>
        <h2 id="confirmTitle" class="font-display font-bold text-xl mt-4">${escapeHtmlGlobal(title)}</h2>
        ${message ? `<p class="text-sm opacity-70 mt-2 leading-relaxed">${escapeHtmlGlobal(message)}</p>` : ''}
        <div class="flex gap-2 mt-6">
          <button data-close class="flex-1 border border-line rounded-full py-2.5 text-sm font-semibold hover:bg-sand">${escapeHtmlGlobal(cancelLabel)}</button>
          <button data-ok class="flex-1 rounded-full py-2.5 text-sm font-bold text-white ${danger ? 'bg-red-600 hover:brightness-110' : 'bg-forest hover:brightness-110'}">${escapeHtmlGlobal(confirmLabel)}</button>
        </div>
      </div>`;
    wrap.setAttribute('aria-labelledby','confirmTitle');
    const close = (ok)=>{ document.removeEventListener('keydown', onKey); wrap.remove(); if(prev && prev.focus) prev.focus(); resolve(ok); };
    const onKey = (e)=>{ if(e.key==='Escape') close(false); };
    wrap.querySelectorAll('[data-close]').forEach(el=>el.addEventListener('click', ()=>close(false)));
    wrap.querySelector('[data-ok]').addEventListener('click', ()=>close(true));
    document.addEventListener('keydown', onKey);
    document.body.appendChild(wrap);
    if(typeof lucide !== 'undefined') lucide.createIcons({ root: wrap });
    wrap.querySelector('[data-ok]').focus();
  });
}

async function logoutGlobal(everywhere){
  const ok = await confirmDialog(everywhere ? {
    title: 'Se déconnecter de tous les appareils ?',
    message: 'Vous serez déconnecté ici et sur tous vos autres appareils (téléphone, tablette, ordinateur). Il faudra vous reconnecter partout.',
    confirmLabel: 'Tout déconnecter', danger: true, icon: 'log-out'
  } : {
    title: 'Se déconnecter ?',
    message: 'Vous devrez saisir à nouveau vos identifiants pour accéder à votre compte, vos commandes et vos messages.',
    confirmLabel: 'Se déconnecter', icon: 'log-out'
  });
  if(!ok) return;
  if(typeof signOutEverywhere==='function') await signOutEverywhere(everywhere);
  try{ ['akwaone_logged_in','akwaone_user','akwaone_server_role','akwaone_role','akwaone_orders','akwaone_messages_v1','akwaone_seller_profile','akwaone_read_notifs','akwaone_server_notifs'].forEach(k=>localStorage.removeItem(k)); }catch(e){}
  window.location.href = 'index.html';
}

function changeRoleGlobal(role){
  if(isOfficialShop()) role = 'seller';
  if(!isRoleAllowed(role)) role = 'buyer';
  persistRole(role);
  if(role==='admin' || role==='seller'){
    window.location.href = 'tableau-de-bord.html';
  } else {
    window.location.href = 'index.html';
  }
}

function initSiteHeader(active){
  renderCurrencyOptions();
  renderLangOptions();
  refreshNotifBadge();
  refreshCartBadge();
  updateAccountButtonGlobal();
  const cityLabel = document.getElementById('deliverCityLabel');
  if(cityLabel) cityLabel.textContent = getDeliverCity();
  restrictRoleSelect();
  const dashSlot = document.getElementById('navDashboardLink');
  if(dashSlot && getRolePersisted()!=='buyer'){
    dashSlot.innerHTML = `<a href="tableau-de-bord.html" class="shrink-0 hover:opacity-80 font-medium whitespace-nowrap ${active==='dashboard'?'underline underline-offset-4':''}">Tableau de bord</a>`;
  }
  if(typeof lucide !== 'undefined') lucide.createIcons();
}

const CHAT_AVATAR_URL = 'assets/malik-airpods.jpg';
const CHAT_AVATAR_GUIDE_URL = 'assets/malik-classic.jpg';

function renderChatWidget(){
  if(document.getElementById('malikBtn')) return;
  const div = document.createElement('div');
  div.innerHTML = `
  <button id="malikBtn" onclick="toggleChat()" class="fixed z-[65] rounded-full shadow-xl border-none p-0 overflow-hidden" style="bottom:96px;right:20px;width:60px;height:60px;background:#146B4F" title="Discuter avec Malik">
    <img alt="" src="${CHAT_AVATAR_URL}" class="w-full h-full object-cover" style="object-position:50% 12%">
  </button>
  <div id="malikBox" class="fixed z-[70] bg-white rounded-2xl shadow-2xl flex-col overflow-hidden hidden" style="bottom:164px;right:20px;width:360px;max-width:92vw;height:500px;max-height:70vh">
    <div class="bg-forest text-white p-4 flex items-center gap-3 shrink-0">
      <img alt="" src="${CHAT_AVATAR_URL}" class="w-10 h-10 rounded-full object-cover border-2 border-white" style="object-position:50% 12%">
      <div class="flex-1">
        <div class="font-display font-bold text-sm">Malik</div>
        <div class="text-[11px] opacity-70">Assistant AkwaOne</div>
      </div>
      <button onclick="toggleChat()" aria-label="Fermer l'assistant" class="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center"><i data-lucide="x" class="w-4 h-4"></i></button>
    </div>
    <div id="malikMsgs" class="flex-1 overflow-y-auto p-4 space-y-2"></div>
    <div id="malikChips" class="flex gap-2 px-4 pb-2 overflow-x-auto no-scrollbar shrink-0"></div>
    <div class="p-3 border-t border-line flex gap-2 shrink-0">
      <input id="malikInput" aria-label="Votre question à Malik" placeholder="Écrivez votre question..." class="flex-1 border border-line rounded-full px-4 py-2 text-sm outline-none">
      <button onclick="sendChat()" aria-label="Envoyer" class="w-10 h-10 rounded-full bg-forest text-white flex items-center justify-center shrink-0"><i data-lucide="send" class="w-4 h-4"></i></button>
    </div>
  </div>`;
  while(div.firstElementChild){ document.body.appendChild(div.firstElementChild); }
  if(typeof lucide !== 'undefined') lucide.createIcons();
}

let chatStarted = false;
function toggleChat(){
  renderChatWidget();
  const panel = document.getElementById('malikBox');
  const opening = panel.classList.contains('hidden');
  panel.classList.toggle('hidden');
  panel.style.display = opening ? 'flex' : 'none';
  if(opening && !chatStarted){
    chatStarted = true;
    addBotMessage("Bonjour, je suis Malik, l'assistant AkwaOne. Posez-moi votre question : commande, paiement, livraison, retour, compte ou vente, je vous guide.");
    renderChatChips();
  }
  if(typeof lucide !== 'undefined') lucide.createIcons();
}
function addBotMessage(html){
  const box = document.getElementById('malikMsgs');
  const el = document.createElement('div');
  el.className = 'bg-sand text-ink rounded-2xl rounded-bl-sm px-3 py-2 text-sm max-w-[82%] leading-relaxed';
  el.innerHTML = html;
  box.appendChild(el);
  box.scrollTop = box.scrollHeight;
}
function addUserMessage(text){
  const box = document.getElementById('malikMsgs');
  const el = document.createElement('div');
  el.className = 'bg-ink text-white rounded-2xl rounded-br-sm px-3 py-2 text-sm max-w-[82%] ml-auto leading-relaxed';
  el.textContent = text;
  box.appendChild(el);
  box.scrollTop = box.scrollHeight;
}
function renderChatChips(){
  const chips = ['Comment commander ?','Devenir vendeur','Livraison & retours','Visite guidée'];
  document.getElementById('malikChips').innerHTML = chips.map(c=>`<button class="border border-line rounded-full px-3 py-1.5 text-xs font-semibold bg-white hover:bg-sand whitespace-nowrap shrink-0" onclick="askChip(this.textContent)">${c}</button>`).join('');
}
function askChip(text){ handleUserInput(text); }
function sendChat(){
  const input = document.getElementById('malikInput');
  const text = input.value.trim();
  if(!text) return;
  input.value = '';
  handleUserInput(text);
}
function handleUserInput(text){
  addUserMessage(text);
  const m = text.toLowerCase();
  if(containsProhibited(m)){
    setTimeout(()=>{ addBotMessage("Merci de rester respectueux, ce message ne peut pas être traité. Consultez notre <a href='charte-communaute.html' class='underline text-forest'>charte de la communauté</a>."); }, 300);
    return;
  }
  if(/visite guid/.test(m)){
    setTimeout(()=>{ addBotMessage("La visite guidée est disponible sur la page d'accueil. <a href='index.html' class='underline text-forest'>Retourner à l'accueil</a>"); }, 400);
    return;
  }
  // Réponse toute faite d'abord (gratuite) ; l'IA n'est appelée que si aucune ne correspond.
  const intent = matchBotIntent(m);
  if(intent){
    const answer = getBotAnswer(m);
    malikHistory.push({ role:'user', content:text }, { role:'assistant', content:answer.replace(/<[^>]+>/g, '') });
    setTimeout(()=>{ addBotMessage(answer); }, 400);
    return;
  }
  askMalik(text, m);
}
// Une réponse toute faite seulement pour une question courte et générale ; un vrai problème décrit part à l'IA.
const MALIK_PROBLEM_RE = /probl|souci|pas re[çc]u|jamais re[çc]u|pas arriv|bloqu|erreur|bug|marche pas|fonctionne pas|impossible|n'arrive pas|arnaque|fraud|vol[ée]|urgent|toujours pas|pourquoi|not received|doesn'?t work|not working|error|stuck|scam|why/;
function matchBotIntent(m){
  const words = m.split(/\s+/).filter(Boolean).length;
  if(words > 8 || MALIK_PROBLEM_RE.test(m)) return null;
  return BOT_INTENTS.find(i=>i.re.test(m)) || null;
}

// ----- Malik IA (Claude, via api/malik) -----
// Historique de la conversation (texte brut) envoyé au serveur ; les réponses toutes faites restent en secours.
const malikHistory = [];
let malikBusy = false;
// Rendu sûr : texte échappé, puis liens Markdown limités aux pages du site, au courriel et à l'ancre interne, et **gras**.
function renderMalikText(text){
  let h = escapeHtmlGlobal(text);
  h = h.replace(/\[([^\]]{1,80})\]\(([a-z0-9-]+\.html(?:#[a-z0-9-]+)?)\)/gi, '<a href="$2" class="underline text-forest">$1</a>');
  h = h.replace(/\b([a-z0-9._-]+@akwaone\.ca)\b/gi, '<a href="mailto:$1" class="underline text-forest">$1</a>');
  h = h.replace(/\*\*([^*]{1,120})\*\*/g, '<strong>$1</strong>');
  return h.replace(/\n/g, '<br>');
}
function showMalikTyping(on){
  const box = document.getElementById('malikMsgs');
  let el = document.getElementById('malikTyping');
  if(on && !el){
    el = document.createElement('div');
    el.id = 'malikTyping';
    el.className = 'bg-sand text-ink rounded-2xl rounded-bl-sm px-3 py-2 text-sm max-w-[82%] opacity-70';
    el.textContent = 'Malik écrit…';
    box.appendChild(el);
    box.scrollTop = box.scrollHeight;
  } else if(!on && el){ el.remove(); }
}
async function askMalik(text, lower){
  if(malikBusy) return;
  malikBusy = true;
  malikHistory.push({ role:'user', content:text });
  showMalikTyping(true);
  try{
    const res = await fetch('api/malik', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ messages: malikHistory.slice(-12) })
    });
    const data = await res.json().catch(()=>({}));
    if(!res.ok || !data.reply) throw new Error(data.error || 'indisponible');
    malikHistory.push({ role:'assistant', content:data.reply });
    showMalikTyping(false);
    addBotMessage(renderMalikText(data.reply));
  }catch(err){
    // IA indisponible (clé absente, limite atteinte, réseau) : réponse toute faite.
    malikHistory.pop();
    showMalikTyping(false);
    addBotMessage(getBotAnswer(lower));
  }finally{
    malikBusy = false;
  }
}
const BOT_INTENTS = [
  {key:'hello', re:/bonjour|salut|^hello|^hi\b|^hey\b|coucou/},
  {key:'sell', re:/vend(re|eur)|abonnement|commission|\bsell|seller|vendor|subscription|\bplan/},
  {key:'delivery', re:/livrai|exp[ée]di|d[ée]lai|shipping|deliver|\bship/},
  {key:'returns', re:/retour|rembours|annul|return|refund|cancel/},
  {key:'payment', re:/paiement|stripe|carte|payer|escrow|litige|payment|\bpay\b|card|dispute/},
  {key:'categories', re:/cat[ée]gor|produit|service|product/},
  {key:'shop', re:/boutique|\bshop\b|vos produits|your products/},
  {key:'order', re:/panier|commander|acheter|\border|\bbuy|\bcart|purchase/},
  {key:'account', re:/compte|connex|inscri|account|log ?in|sign ?(in|up)|register/},
  {key:'reviews', re:/avis|note|[ée]toile|review|rating|star/},
  {key:'privacy', re:/cookie|confidentialit|donn[ée]e|rgpd|lprpde|vie priv[ée]e|privacy|gdpr|\bdata\b/},
  {key:'contact', re:/contact|support|aide|humain|t[ée]l[ée]phone|\bhelp|human|phone/},
  {key:'thanks', re:/merci|thank/}
];
const BOT_ANSWERS = {
  fr:{
    hello:"Bonjour ! Comment puis-je vous aider : commander, devenir vendeur, livraison ou paiement ?",
    sell:"Pour vendre sur AkwaOne, choisissez une formule : Basique (gratuit, 15% de commission), Pro (129$/an, 10%) ou Premium (299$/an, 6%). Détails sur la page <a href='devenir-vendeur.html' class='underline text-forest'>Devenir vendeur</a>.",
    delivery:"Les délais varient selon le vendeur : 24 à 72h pour la cuisine maison, 3 à 5 jours pour les produits. Voir notre page <a href='livraison.html' class='underline text-forest'>Livraison</a>.",
    returns:"Un service peut être annulé gratuitement jusqu'à 24h avant. Pour les produits, voir notre page <a href='retours-remboursement.html' class='underline text-forest'>Retours & remboursements</a>.",
    payment:"Vos paiements sont retenus de façon sécurisée jusqu'à confirmation de réception avec votre code de livraison. En cas de litige, notre équipe tranche après examen des preuves des deux parties.",
    categories:"Six catégories sont disponibles : Épicerie africaine, Mode & tissus, Beauté & cheveux afro, Artisanat & décoration, Cuisine maison & traiteur, et Services communautaires.",
    shop:"La <a href='boutique.html' class='underline text-forest'>Boutique AkwaOne</a> regroupe uniquement nos propres produits, expédiés par nous. La <a href='marketplace.html' class='underline text-forest'>Marketplace</a> regroupe ceux des vendeurs indépendants de la diaspora.",
    order:"Parcourez la <a href='boutique.html' class='underline text-forest'>Boutique AkwaOne</a> (nos produits) ou la <a href='marketplace.html' class='underline text-forest'>Marketplace</a> (vendeurs indépendants), ajoutez un produit au panier, puis finalisez votre achat.",
    account:"Cliquez sur « Se connecter » en haut de la page pour gérer votre profil et vos commandes.",
    reviews:"Seuls les acheteurs ayant réellement payé peuvent laisser un avis, pour garantir des avis fiables.",
    privacy:"Vos données sont protégées conformément à la LPRPDE, au RGPD et au CCPA. Détails sur notre page <a href='confidentialite.html' class='underline text-forest'>Confidentialité</a>.",
    contact:"Vous pouvez contacter notre équipe via la page <a href='contact.html' class='underline text-forest'>Contact</a>, ou par courriel à aide@akwaone.ca.",
    thanks:"Avec plaisir ! N'hésitez pas si vous avez d'autres questions.",
    fallback:"Je ne suis pas certain de comprendre. Essayez : commander, devenir vendeur, livraison, retours, paiement ou catégories. Pour une réponse humaine : <a href='contact.html' class='underline text-forest'>contactez notre équipe</a>."
  },
  en:{
    hello:"Hello! How can I help: ordering, becoming a seller, delivery or payment?",
    sell:"To sell on AkwaOne, pick a plan: Basic (free, 15% commission), Pro ($129/year, 10%) or Premium ($299/year, 6%). Details on the <a href='devenir-vendeur.html' class='underline text-forest'>Become a seller</a> page.",
    delivery:"Delivery times depend on the seller: 24 to 72h for home cooking, 3 to 5 days for products. See our <a href='livraison.html' class='underline text-forest'>Delivery</a> page.",
    returns:"A service can be cancelled for free up to 24h before. For products, see our <a href='retours-remboursement.html' class='underline text-forest'>Returns & refunds</a> page.",
    payment:"Your payment is held securely until you confirm receipt with your delivery code. In case of a dispute, our team decides after reviewing evidence from both sides.",
    categories:"Six categories are available: African grocery, Fashion & fabrics, Afro beauty & hair, Crafts & decor, Home cooking & catering, and Community services.",
    shop:"The <a href='boutique.html' class='underline text-forest'>AkwaOne Shop</a> only contains our own products, shipped by us. The <a href='marketplace.html' class='underline text-forest'>Marketplace</a> gathers products from independent diaspora sellers.",
    order:"Browse the <a href='boutique.html' class='underline text-forest'>AkwaOne Shop</a> (our products) or the <a href='marketplace.html' class='underline text-forest'>Marketplace</a> (independent sellers), add a product to your cart, then check out.",
    account:"Click « Sign in » at the top of the page to manage your profile and orders.",
    reviews:"Only buyers who actually paid can leave a review, so reviews stay trustworthy.",
    privacy:"Your data is protected under PIPEDA, GDPR and CCPA. Details on our <a href='confidentialite.html' class='underline text-forest'>Privacy</a> page.",
    contact:"You can reach our team through the <a href='contact.html' class='underline text-forest'>Contact</a> page, or by email at aide@akwaone.ca.",
    thanks:"You're welcome! Let me know if you have other questions.",
    fallback:"I'm not sure I understand. Try: ordering, becoming a seller, delivery, returns, payment or categories. For a human answer: <a href='contact.html' class='underline text-forest'>contact our team</a>."
  }
};
function getBotAnswer(m){
  const english = getLangPersisted()==='en' || /\b(how|what|where|when|can|do|does|is|the|my|i|you|hello|hi|thanks?)\b/.test(m) && !/\b(je|tu|vous|le|la|les|mon|ma|est|comment)\b/.test(m);
  const answers = BOT_ANSWERS[english ? 'en' : 'fr'];
  const intent = BOT_INTENTS.find(i=>i.re.test(m));
  return answers[intent ? intent.key : 'fallback'];
}

const ROLE_RANK = {buyer:0, seller:1, admin:2};
// Rôle attribué par Supabase (mis en cache par assets/auth.js) : la vue choisie ne peut jamais le dépasser.
function getServerRole(){
  try{ return localStorage.getItem('akwaone_server_role') || 'buyer'; }catch(e){ return 'buyer'; }
}
// En démo, les trois vues restent accessibles pour la présentation ; sur le site réel, Supabase décide.
function isOfficialShop(){
  try{ return !IS_DEMO && localStorage.getItem('akwaone_official_shop')==='1'; }catch(e){ return false; }
}
function isRoleAllowed(role, serverRole = getServerRole()){
  if(IS_DEMO) return role in ROLE_RANK;
  // Le compte de la Boutique AkwaOne n'a qu'une vue : vendeur.
  if(isOfficialShop()) return role === 'seller';
  return role in ROLE_RANK && ROLE_RANK[role] <= (ROLE_RANK[serverRole] ?? 0);
}
function getRolePersisted(){
  if(isOfficialShop()) return 'seller';
  let r = 'buyer';
  try{ r = localStorage.getItem('akwaone_role') || 'buyer'; }catch(e){}
  return isRoleAllowed(r) ? r : 'buyer';
}
function restrictRoleSelect(){
  const sel = document.getElementById('roleSelect');
  if(!sel) return;
  [...sel.options].forEach(o=>{ if(!isRoleAllowed(o.value)) o.remove(); });
  sel.value = getRolePersisted();
}
function persistRole(r){
  try{ localStorage.setItem('akwaone_role', r); }catch(e){}
}

window.currency = getCurrency();

// Afficher / masquer le mot de passe : un bouton œil est ajouté à chaque champ mot de passe du site.
function enhancePasswordFields(root){
  (root || document).querySelectorAll('input[type="password"]:not([data-pw-toggle])').forEach(input=>{
    input.setAttribute('data-pw-toggle','');
    const wrap = document.createElement('div');
    wrap.className = 'relative';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);
    input.style.paddingRight = '2.75rem';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.style.right = '0.5rem';
    btn.className = 'absolute top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full opacity-60 hover:opacity-100';
    btn.style.marginTop = getComputedStyle(input).marginTop === '0px' ? '0' : `calc(${getComputedStyle(input).marginTop} / 2)`;
    btn.setAttribute('aria-label','Afficher le mot de passe');
    const eye = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
    const eyeOff = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.9 17.9A10.4 10.4 0 0 1 12 19c-6.4 0-10-7-10-7a18.5 18.5 0 0 1 5.1-5.9"/><path d="M9.9 4.2A9.6 9.6 0 0 1 12 4c6.4 0 10 7 10 7a18.6 18.6 0 0 1-2.2 3.2"/><path d="M14.1 14.1a3 3 0 1 1-4.2-4.2"/><path d="M2 2l20 20"/></svg>';
    btn.innerHTML = eye;
    btn.addEventListener('click', ()=>{
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.innerHTML = show ? eyeOff : eye;
      btn.setAttribute('aria-label', show ? 'Masquer le mot de passe' : 'Afficher le mot de passe');
    });
    wrap.appendChild(btn);
  });
}
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ()=>enhancePasswordFields());
else enhancePasswordFields();


// ----- Thèmes Premium -----
// Thème du site choisi par un vendeur Premium pour lui-même : couleur principale et mode clair ou sombre.
const THEME_ACCENTS = ['#146B4F','#1D4ED8','#7C3AED','#DB2777','#DC2626','#EA580C','#CA8A04','#0F766E','#131A17'];
function getSiteTheme(){
  try{ const t = JSON.parse(localStorage.getItem('akwaone_site_theme') || 'null'); return t && typeof t === 'object' ? t : null; }catch(e){ return null; }
}
function saveSiteTheme(theme){
  try{
    if(theme && (theme.site_accent || theme.site_mode==='dark')) localStorage.setItem('akwaone_site_theme', JSON.stringify({ site_accent: theme.site_accent || null, site_mode: theme.site_mode || 'light', shop_accent: theme.shop_accent || null }));
    else localStorage.removeItem('akwaone_site_theme');
  }catch(e){}
}
function hexToRgb(hex){ const n = parseInt(hex.slice(1), 16); return [(n>>16)&255, (n>>8)&255, n&255]; }
function siteThemeCss(t){
  if(!t) return '';
  let css = '';
  if(/^#[0-9a-f]{6}$/i.test(t.site_accent || '')){
    const [r,g,b] = hexToRgb(t.site_accent);
    const dark = `rgb(${Math.round(r*.7)} ${Math.round(g*.7)} ${Math.round(b*.7)})`;
    css += `.bg-forest{background-color:rgb(${r} ${g} ${b}) !important}.text-forest{color:rgb(${r} ${g} ${b}) !important}.border-forest,.focus\\:border-forest:focus{border-color:rgb(${r} ${g} ${b}) !important}
.hover\\:bg-forest:hover{background-color:rgb(${r} ${g} ${b}) !important}.hover\\:border-forest:hover{border-color:rgb(${r} ${g} ${b}) !important}
.bg-forest\\/10{background-color:rgba(${r},${g},${b},.1) !important}.bg-forest\\/15{background-color:rgba(${r},${g},${b},.15) !important}
.bg-forestDark{background-color:${dark} !important}header .bg-forestDark,header+div .bg-forestDark{background-color:${dark} !important}`;
  }
  if(t.site_mode === 'dark'){
    css += `body{background:#0F1412 !important;color:#E8ECEA !important}
.bg-white{background-color:#171E1B !important}.bg-sand{background-color:#1F2824 !important}.text-ink{color:#E8ECEA !important}
.border-line{border-color:#2B3631 !important}.hover\\:bg-sand:hover{background-color:#26302B !important}
input,select,textarea,.field{background-color:#1A221F !important;color:#E8ECEA !important;border-color:#2B3631 !important}
.dropdown-panel{background:#171E1B !important;color:#E8ECEA}footer{background:#0F1412 !important}
.settings-tab{color:#E8ECEA !important}.settings-tab.active,.settings-tab:hover,.theme-mode.on{background:#26302B !important;border-color:#E8ECEA !important}
.swatch{box-shadow:inset 0 0 0 2px #171E1B !important}.swatch.on{border-color:#E8ECEA !important}`;
  }
  return css;
}
// Aperçu immédiat (Paramètres → Thème) sans recharger la page.
function previewSiteTheme(t){
  let el = document.getElementById('akwaThemePreview');
  if(!el){ el = document.createElement('style'); el.id = 'akwaThemePreview'; document.head.appendChild(el); }
  const base = document.getElementById('akwaBaseStyle');
  if(base) base.textContent = base.textContent.replace(siteThemeCss(getSiteTheme()), '');
  el.textContent = siteThemeCss(t);
}
// Cartes d'annonces : classe et style à ajouter quand le vendeur Premium a choisi une couleur.
function shopThemeClass(p){ return p && p.accent ? ' shop-themed' : ''; }
function shopThemeStyle(p){ return p && p.accent ? ` style="--shop-accent:${p.accent}"` : ''; }

// ----- Photo de profil -----
function avatarHtml(user, sizeClass){
  const url = user && safeImageUrl(user.avatar);
  return url
    ? `<img src="${escapeHtmlGlobal(url)}" alt="" class="${sizeClass} rounded-full object-cover shrink-0">`
    : `<span class="${sizeClass} rounded-full bg-forest text-white font-bold flex items-center justify-center shrink-0">${escapeHtmlGlobal(userInitials(user) || '?')}</span>`;
}
// Démo : photo gardée dans le navigateur. Site réel : déposée dans Supabase Storage (bucket avatars) puis enregistrée sur le profil.
async function uploadAvatar(file){
  const problem = checkListingImage(file);
  if(problem) throw new Error(problem);
  if(IS_DEMO){
    const { canvas } = await shrinkImage(file, 256, 0.8);
    return canvas.toDataURL('image/jpeg', 0.8);
  }
  const { data: { user } } = await sb.auth.getUser();
  if(!user) throw new Error('Connexion requise.');
  const { blob } = await shrinkImage(file, 512, 0.85);
  const path = `${user.id}/${Date.now()}.jpg`;
  const { error } = await sb.storage.from('avatars').upload(path, blob, { contentType:'image/jpeg', cacheControl:'31536000', upsert:false });
  if(error) throw new Error("La photo n'a pas pu être envoyée. Vérifiez que la migration 0012 a été exécutée dans Supabase.");
  const url = sb.storage.from('avatars').getPublicUrl(path).data.publicUrl;
  const { error: upErr } = await sb.from('profiles').update({ avatar_url: url }).eq('id', user.id);
  if(upErr) throw new Error("La photo n'a pas pu être enregistrée sur votre profil.");
  return url;
}

// ----- Google AdSense -----
// Identifiant éditeur AdSense (ca-pub-…) : à renseigner une fois le compte AdSense créé, avec le fichier /ads.txt.
// Tant qu'il est vide, aucun script publicitaire n'est chargé.
const ADSENSE_CLIENT = 'ca-pub-8942815586687518';
// Pas de publicité sur les pages de compte, de paiement et de messagerie, ni sur la démo.
const NO_ADS_PAGES = ['connexion.html','reinitialiser-mot-de-passe.html','profil.html','mes-commandes.html','messagerie.html','tableau-de-bord.html'];
function loadAdSense(){
  if(!ADSENSE_CLIENT || IS_DEMO || window.__akwaAdsLoaded) return;
  const page = location.pathname.split('/').pop() || 'index.html';
  if(NO_ADS_PAGES.includes(page)) return;
  let consent = null;
  try{ consent = localStorage.getItem('akwaone_cookie_consent'); }catch(e){}
  if(!consent) return; // on attend le choix dans le bandeau cookies
  window.__akwaAdsLoaded = true;
  window.adsbygoogle = window.adsbygoogle || [];
  // Cookies publicitaires refusés : annonces non personnalisées uniquement.
  window.adsbygoogle.requestNonPersonalizedAds = consent === 'accepted' ? 0 : 1;
  // Le script est déjà dans le <head> des pages publiques (validation AdSense) : on lève simplement la pause.
  window.adsbygoogle.pauseAdRequests = 0;
  renderAdZones();
  if(document.querySelector('script[src*="adsbygoogle.js"]')) return;
  const s = document.createElement('script');
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(ADSENSE_CLIENT);
  document.head.appendChild(s);
}
// Emplacements publicitaires de l'accueil (cahier 3.13). Créez des blocs d'annonces « Display » dans AdSense
// (Annonces → Par bloc d'annonces) et collez ici leur identifiant data-ad-slot ; un emplacement vide reste masqué.
const ADSENSE_SLOTS = {
  'home-top': '',     // ← identifiant du bloc sous le carrousel (ex. '1234567890')
  'home-middle': ''   // ← identifiant du bloc avant les vedettes
};
function renderAdZones(){
  document.querySelectorAll('[data-ad-zone]').forEach(zone=>{
    const slot = ADSENSE_SLOTS[zone.dataset.adZone];
    if(!slot || zone.dataset.filled) return;
    zone.dataset.filled = '1';
    zone.classList.remove('hidden');
    const ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.display = 'block';
    ins.setAttribute('data-ad-client', ADSENSE_CLIENT);
    ins.setAttribute('data-ad-slot', slot);
    ins.setAttribute('data-ad-format', 'auto');
    ins.setAttribute('data-full-width-responsive', 'true');
    zone.appendChild(ins);
    try{ (window.adsbygoogle = window.adsbygoogle || []).push({}); }catch(e){}
  });
}
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadAdSense);
else loadAdSense();

// Fenêtre de saisie du site (raison d'un signalement, d'une suspension…). Renvoie le texte saisi, ou null si annulé.
function promptDialog({ title, message, placeholder = '', confirmLabel = 'Envoyer', danger = false, icon = 'flag', minLength = 3, maxLength = 500 }){
  return new Promise(resolve=>{
    const prev = document.activeElement;
    const wrap = document.createElement('div');
    wrap.className = 'fixed inset-0 flex items-center justify-center p-4';
    wrap.style.zIndex = '90';
    wrap.setAttribute('role','dialog');
    wrap.setAttribute('aria-modal','true');
    wrap.innerHTML = `
      <div data-close class="absolute inset-0" style="background:rgba(0,0,0,.5)"></div>
      <div class="relative bg-white text-ink rounded-2xl shadow-2xl w-full p-6" style="max-width:440px">
        <div class="w-12 h-12 rounded-full flex items-center justify-center ${danger ? 'bg-red-50 text-red-600' : 'bg-sand'}"><i data-lucide="${icon}" class="w-6 h-6"></i></div>
        <h2 class="font-display font-bold text-xl mt-4">${escapeHtmlGlobal(title)}</h2>
        ${message ? `<p class="text-sm opacity-70 mt-2 leading-relaxed">${escapeHtmlGlobal(message)}</p>` : ''}
        <textarea data-input maxlength="${maxLength}" placeholder="${escapeHtmlGlobal(placeholder)}" class="w-full mt-4 border border-line rounded-xl p-3 text-sm outline-none" style="height:96px"></textarea>
        <div data-err class="text-xs text-red-600 mt-1 hidden">Merci de préciser (${minLength} caractères minimum).</div>
        <div class="flex gap-2 mt-5">
          <button data-close class="flex-1 border border-line rounded-full py-2.5 text-sm font-semibold hover:bg-sand">Annuler</button>
          <button data-ok class="flex-1 rounded-full py-2.5 text-sm font-bold text-white ${danger ? 'bg-red-600 hover:brightness-110' : 'bg-forest hover:brightness-110'}">${escapeHtmlGlobal(confirmLabel)}</button>
        </div>
      </div>`;
    const input = wrap.querySelector('[data-input]');
    const close = (val)=>{ document.removeEventListener('keydown', onKey); wrap.remove(); if(prev && prev.focus) prev.focus(); resolve(val); };
    const onKey = (e)=>{ if(e.key==='Escape') close(null); };
    wrap.querySelectorAll('[data-close]').forEach(el=>el.addEventListener('click', ()=>close(null)));
    wrap.querySelector('[data-ok]').addEventListener('click', ()=>{
      const v = input.value.trim();
      if(v.length < minLength){ wrap.querySelector('[data-err]').classList.remove('hidden'); input.focus(); return; }
      close(v);
    });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(wrap);
    if(typeof lucide !== 'undefined') lucide.createIcons({ root: wrap });
    input.focus();
  });
}

// Modération (api/moderation.js) : signalements, litiges et actions de l'espace administrateur.
async function moderationApi(action, data = {}){
  const headers = { 'Content-Type':'application/json', ...(typeof authHeaders==='function' ? await authHeaders() : {}) };
  const res = await fetch('api/moderation', { method:'POST', headers, body: JSON.stringify({ action, ...data }) });
  const out = await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(out.error || 'Action impossible pour le moment.');
  return out;
}

// Bouton « Signaler » (annonce, message reçu) : le contenu part dans la file de modération de l'administrateur.
async function reportContent(targetType, targetId){
  const toast = (m, t)=>{ if(typeof showToast==='function') showToast(m, t); };
  if(IS_DEMO){ toast('Version démo : le signalement est disponible sur le site réel.','info'); return; }
  if(typeof isLoggedIn==='function' && !isLoggedIn()){ window.location.href = 'connexion.html'; return; }
  const what = targetType==='listing' ? 'cette annonce' : targetType==='message' ? 'ce message' : targetType==='conversation' ? 'cette discussion' : 'cet avis';
  const reason = await promptDialog({
    title: `Signaler ${what}`,
    message: "Expliquez en quelques mots ce qui ne respecte pas la charte de la communauté. Notre équipe examinera le contenu.",
    placeholder: 'Arnaque, contenu offensant, produit interdit…', confirmLabel: 'Signaler', danger: true
  });
  if(!reason) return;
  try{
    await moderationApi('report', { targetType, targetId: String(targetId), reason });
    toast('Merci, le signalement a été transmis à notre équipe.','success');
  }catch(err){ toast(escapeHtmlGlobal(err.message),'error'); }
}

// Suivi des erreurs en production (Sentry, cahier 6.2). Collez ici le DSN du projet Sentry (Settings → Client Keys) :
// tant qu'il est vide, rien n'est chargé. Aucune donnée personnelle n'est envoyée (pas d'IP, pas de courriel).
const SENTRY_DSN = 'https://ae13d3ac4f9e99517d5d4466b6fa7601@o4512476959735808.ingest.us.sentry.io/4512477670014976';
(function loadSentry(){
  if(!SENTRY_DSN || IS_DEMO || window.Sentry) return;
  const s = document.createElement('script');
  s.src = 'https://browser.sentry-cdn.com/8.42.0/bundle.min.js';
  s.crossOrigin = 'anonymous';
  s.onload = ()=>{
    try{
      window.Sentry.init({ dsn: SENTRY_DSN, environment: 'production', sendDefaultPii: false, sampleRate: 1.0,
        beforeSend(event){ if(event.user){ delete event.user.email; delete event.user.ip_address; } return event; } });
    }catch(e){}
  };
  document.head.appendChild(s);
})();

// Favoris et annonces vues récemment : gardés dans ce navigateur (confort personnel, aucune donnée envoyée).
function readIdList(key){ try{ const v = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(v) ? v : []; }catch(e){ return []; } }
function writeIdList(key, list){ try{ localStorage.setItem(key, JSON.stringify(list)); }catch(e){} }
function getFavorites(){ return readIdList('akwaone_favorites'); }
function isFavorite(id){ return getFavorites().some(x=>String(x)===String(id)); }
function toggleFavorite(id){
  const list = getFavorites();
  const on = !list.some(x=>String(x)===String(id));
  writeIdList('akwaone_favorites', on ? [id, ...list].slice(0, 200) : list.filter(x=>String(x)!==String(id)));
  document.dispatchEvent(new CustomEvent('akwaone:favorites'));
  return on;
}
function rememberViewed(id){
  writeIdList('akwaone_recent', [id, ...readIdList('akwaone_recent').filter(x=>String(x)!==String(id))].slice(0, 8));
}
function getRecentlyViewed(){ return readIdList('akwaone_recent'); }
// Frais de livraison du panier : une expédition par vendeur, au montant le plus élevé de ses articles.
function cartShippingFor(items){
  const bySeller = {};
  items.forEach(({ listing })=>{ if(listing && listing.type!=='service') bySeller[listing.seller] = Math.max(bySeller[listing.seller] || 0, Number(listing.shipping) || 0); });
  return Math.round(Object.values(bySeller).reduce((a,b)=>a+b, 0) * 100) / 100;
}

// Lien de suivi du colis selon le transporteur.
const TRACKING_CARRIERS = ['Postes Canada','Purolator','UPS','FedEx','DHL','Canpar','Intelcom','Autre'];
function trackingUrl(carrier, n){
  const e = encodeURIComponent(n || '');
  return ({
    'Postes Canada': `https://www.canadapost-postescanada.ca/track-reperage/fr#/search?searchFor=${e}`,
    'Purolator': `https://www.purolator.com/fr/expedition/suivi?pin=${e}`,
    'UPS': `https://www.ups.com/track?loc=fr_CA&tracknum=${e}`,
    'FedEx': `https://www.fedex.com/fedextrack/?trknbr=${e}`,
    'DHL': `https://www.dhl.com/ca-fr/home/suivi.html?tracking-id=${e}`,
    'Canpar': `https://www.canpar.com/fr/tracking/delivery_options.htm?barcode=${e}`,
    'Intelcom': `https://intelcomexpress.com/fr/suivi-de-colis/?tracking-id=${e}`
  })[carrier] || '';
}

// Suggestions pendant la frappe dans la recherche : noms d'annonces, vendeurs et catégories.
function refreshSearchSuggestions(){
  const input = document.getElementById('heroSearch');
  if(!input || typeof getAllListings!=='function') return;
  let list = document.getElementById('searchSuggestions');
  if(!list){ list = document.createElement('datalist'); list.id = 'searchSuggestions'; document.body.appendChild(list); }
  input.setAttribute('list', 'searchSuggestions');
  input.setAttribute('autocomplete', 'off');
  const words = new Set();
  getAllListings().forEach(p=>{ if(p.name) words.add(p.name); if(p.seller) words.add(p.seller); });
  (typeof CATEGORIES!=='undefined' ? CATEGORIES : []).forEach(c=>words.add(c.label));
  list.innerHTML = [...words].slice(0, 300).map(w=>`<option value="${escapeHtmlGlobal(w)}"></option>`).join('');
}
document.addEventListener('DOMContentLoaded', refreshSearchSuggestions);
document.addEventListener('akwaone:listings', refreshSearchSuggestions);
