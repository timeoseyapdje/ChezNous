const CATALOG = [
  {id:1, cat:'epicerie', type:'produit', name:'Panier épicerie ouest-africaine', seller:'Épicerie Le Baobab', city:'Montréal', price:38, rating:4.8, reviews:164, plan:'pro', image:'https://i.pravatar.cc/100?img=15', cover:'https://images.unsplash.com/photo-1506617420156-8e4536971650?q=80&w=800&auto=format&fit=crop', tags:['Attiéké','Gari','Piment scotch bonnet'], desc:'Produits secs et frais importés : attiéké, gari, igname et piment pour vos plats traditionnels.'},
  {id:2, cat:'epicerie', type:'produit', name:'Coffret épices & riz thiéboudienne', seller:'Marché Teranga', city:'Toronto', price:29, rating:4.7, reviews:98, plan:'basique', image:'https://i.pravatar.cc/100?img=52', cover:'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?q=80&w=800&auto=format&fit=crop', tags:['Halal','Riz brisé','Épices maison'], desc:'Tout le nécessaire pour un thiéboudienne réussi, épices moulues sur place.'},
  {id:3, cat:'mode', type:'produit', name:'Pagnes wax premium (6 yards)', seller:'Ankara Boutique', city:'Ottawa', price:65, rating:4.9, reviews:87, plan:'premium', image:'https://i.pravatar.cc/100?img=23', cover:'https://images.unsplash.com/photo-1734868032501-448d1457dc38?q=80&w=800&auto=format&fit=crop', tags:['Wax hollandais','Couleurs vives'], desc:'Wax véritable importé, idéal pour la confection de tenues traditionnelles ou modernes.'},
  {id:4, cat:'mode', type:'produit', name:'Boubou brodé sur mesure', seller:'Boubou Élégance', city:'Montréal', price:120, rating:5.0, reviews:52, plan:'basique', image:'https://i.pravatar.cc/100?img=44', cover:'https://images.unsplash.com/photo-1687052093309-7a14efa58ecb?q=80&w=800&auto=format&fit=crop', tags:['Sur mesure','Broderie main'], desc:'Confection artisanale de boubous et tenues traditionnelles, prise de mesure à domicile.'},
  {id:5, cat:'beaute', type:'service', name:'Tresses & locks à domicile', seller:'Natural Roots Hair Studio', city:'Toronto', price:80, rating:4.9, reviews:176, plan:'premium', image:'https://i.pravatar.cc/100?img=47', cover:'https://images.unsplash.com/photo-1594254773847-9fce26e950bc?q=80&w=800&auto=format&fit=crop', tags:['Box braids','Locks','Cheveux naturels'], desc:'Spécialiste des cheveux afro : tresses, locks et soins naturels, déplacement à domicile.'},
  {id:6, cat:'beaute', type:'produit', name:'Beurre de karité brut & huiles naturelles', seller:'Karité & Co', city:'Calgary', price:22, rating:4.8, reviews:143, plan:'pro', image:'https://i.pravatar.cc/100?img=36', cover:'https://images.unsplash.com/photo-1702650730093-43cfa3237228?q=80&w=800&auto=format&fit=crop', tags:['100% naturel','Sans additif'], desc:'Beurre de karité brut et huiles capillaires pressées à froid, importés directement.'},
  {id:7, cat:'artisanat', type:'produit', name:'Masques et sculptures en bois', seller:'Atelier Bogolan', city:'Vancouver', price:95, rating:4.7, reviews:41, plan:'basique', image:'https://i.pravatar.cc/100?img=29', cover:'https://images.unsplash.com/photo-1621419203897-20b66b98d495?q=80&w=800&auto=format&fit=crop', tags:['Bois massif','Fait main'], desc:'Pièces artisanales sculptées à la main, inspirées de motifs traditionnels ouest-africains.'},
  {id:8, cat:'artisanat', type:'produit', name:'Bijoux perlés faits main', seller:"Perles d'Afrique", city:'Edmonton', price:34, rating:4.9, reviews:68, plan:'basique', image:'https://i.pravatar.cc/100?img=41', cover:'https://images.unsplash.com/photo-1601387603639-387c75bdcb0d?q=80&w=800&auto=format&fit=crop', tags:['Perles africaines','Pièce unique'], desc:"Colliers et bracelets perlés, création artisanale inspirée des traditions de l'Afrique de l'Ouest."},
  {id:9, cat:'cuisine', type:'service', name:'Plats maison ouest-africains', seller:'Cuisine de Fatou', city:'Toronto', price:22, rating:5.0, reviews:201, plan:'premium', image:'https://i.pravatar.cc/100?img=25', cover:'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=800&auto=format&fit=crop', tags:['Mafé','Yassa','Halal'], desc:'Mafé, yassa et riz gras cuisinés à la commande, ramassage le week-end.'},
  {id:10, cat:'cuisine', type:'service', name:'Pondu, fufu & poulet mayo', seller:'Chez Mama Élise', city:'Montréal', price:24, rating:4.9, reviews:187, plan:'pro', image:'https://i.pravatar.cc/100?img=9', cover:'https://images.unsplash.com/photo-1543353071-873f17a7a088?q=80&w=800&auto=format&fit=crop', tags:['Congolais','Sans arachide'], desc:"Saveurs de Kinshasa cuisinées maison, commande 24h à l'avance, ramassage à Villeray."},
  {id:11, cat:'services', type:'service', name:"Transfert d'argent vers l'Afrique", seller:'TransferPlus Diaspora', city:'Ottawa', price:5, rating:4.6, reviews:112, plan:'basique', image:'https://i.pravatar.cc/100?img=33', cover:'https://images.unsplash.com/photo-1587906697341-bfbde76785c7?q=80&w=800&auto=format&fit=crop', tags:['Frais réduits','Réseau fiable'], desc:"Envoi d'argent rapide et sécurisé vers l'Afrique de l'Ouest et centrale, frais fixes."},
  {id:12, cat:'services', type:'service', name:'DJ & animation événements', seller:'Ambiance Afrobeat Events', city:'Winnipeg', price:150, rating:4.8, reviews:39, plan:'basique', image:'https://i.pravatar.cc/100?img=51', cover:'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=800&auto=format&fit=crop', tags:['Mariages','Afrobeat & Coupé-décalé'], desc:'Animation DJ pour mariages, baptêmes et événements communautaires, sonorisation incluse.'}
];
function getCategoryVendorCount(catId){
  return new Set(CATALOG.filter(p=>p.cat===catId).map(p=>p.seller)).size;
}
function getTopListings(n){
  return [...CATALOG].sort((a,b)=> (b.rating*Math.log(b.reviews+1)) - (a.rating*Math.log(a.reviews+1))).slice(0,n);
}
function getSponsoredListings(){
  return CATALOG.filter(p=>p.plan==='premium');
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
  try{ return localStorage.getItem('cheznous_currency') || 'CAD'; }catch(e){ return 'CAD'; }
}
function setCurrency(c){
  try{ localStorage.setItem('cheznous_currency', c); }catch(e){}
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
  try{ return localStorage.getItem('cheznous_lang') || 'fr'; }catch(e){ return 'fr'; }
}
function persistLang(l){
  try{ localStorage.setItem('cheznous_lang', l); }catch(e){}
}
function renderLangOptions(){
  const sel = document.getElementById('langSelect');
  if(!sel) return;
  sel.innerHTML = Object.entries(LANGS).map(([code,label])=>`<option value="${code}" class="text-ink">${label}</option>`).join('');
  sel.value = getLangPersisted();
}

function getCart(){
  try{ return JSON.parse(localStorage.getItem('cheznous_cart') || '[]'); }catch(e){ return []; }
}
function setCart(cart){
  try{ localStorage.setItem('cheznous_cart', JSON.stringify(cart)); }catch(e){}
}
function cartCount(cart){
  return cart.reduce((s,c)=>s+c.qty, 0);
}

function getOrders(){
  try{
    const raw = localStorage.getItem('cheznous_orders');
    if(raw) return JSON.parse(raw);
  }catch(e){}
  const seed = [
    {id:101, seller:'Ankara Boutique', service:'Pagnes wax premium x2', date:'12 sept.', status:'confirmée', price:130, type:'mode', escrowStatus:'retenu', releaseCode:generateReleaseCode()},
    {id:102, seller:'Épicerie Le Baobab', service:'Panier épicerie', date:'13 sept. • ramassage 17:30', status:'en attente', price:38, type:'epicerie', escrowStatus:'retenu', releaseCode:generateReleaseCode()},
    {id:103, seller:'Natural Roots Hair Studio', service:'Tresses box braids', date:'02 sept. • 10:30', status:'terminée', price:80, type:'beaute', review:false, escrowStatus:'libéré', releaseCode:generateReleaseCode()}
  ];
  setOrders(seed);
  return seed;
}
function setOrders(orders){
  try{ localStorage.setItem('cheznous_orders', JSON.stringify(orders)); }catch(e){}
}
function generateReleaseCode(){
  return Math.random().toString(36).slice(2,8).toUpperCase();
}
function getDisputes(){
  try{ return JSON.parse(localStorage.getItem('cheznous_disputes') || '[]'); }catch(e){ return []; }
}
function setDisputes(list){
  try{ localStorage.setItem('cheznous_disputes', JSON.stringify(list)); }catch(e){}
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

function containsProhibited(text){
  const terms = ['merde','putain','connard','conasse','salope','pute','encul','batard','négre','nègre','sale noir','sale arabe'];
  const t = text.toLowerCase();
  return terms.some(w => t.includes(w));
}

const CITIES = ['Toronto','Montréal','Vancouver','Calgary','Ottawa','Québec','Winnipeg','Edmonton'];

function getDeliverCity(){
  try{ return localStorage.getItem('cheznous_city') || 'Toronto'; }catch(e){ return 'Toronto'; }
}
function setDeliverCity(city){
  try{ localStorage.setItem('cheznous_city', city); }catch(e){}
  const label = document.getElementById('deliverCityLabel');
  if(label) label.textContent = city;
  const menu = document.getElementById('deliverMenu');
  if(menu) menu.classList.add('hidden');
}
function toggleDeliverMenu(){
  const menu = document.getElementById('deliverMenu');
  if(!menu) return;
  if(menu.classList.contains('hidden')){
    menu.innerHTML = CITIES.map(c=>`<button onclick="setDeliverCity('${c}')" class="w-full text-left px-3 py-2 rounded-lg hover:bg-sand text-ink text-sm">${c}</button>`).join('');
  }
  menu.classList.toggle('hidden');
}

const NOTIFICATIONS = [
  { id:'n1', icon:'check-circle', text:'Commande confirmée chez Ankara Boutique', time:'Il y a 2h' },
  { id:'n2', icon:'message-circle', text:'Nouveau message de Épicerie Le Baobab', time:'Il y a 5h' },
  { id:'n3', icon:'star', text:'Rappel : laissez un avis pour votre dernière commande', time:'Hier' }
];
function getReadNotifs(){
  try{ return JSON.parse(localStorage.getItem('cheznous_read_notifs') || '[]'); }catch(e){ return []; }
}
function setReadNotifs(ids){
  try{ localStorage.setItem('cheznous_read_notifs', JSON.stringify(ids)); }catch(e){}
}
function unreadNotifCount(){
  const read = getReadNotifs();
  return NOTIFICATIONS.filter(n=>!read.includes(n.id)).length;
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
    menu.innerHTML = NOTIFICATIONS.length ? NOTIFICATIONS.map(n=>`
      <div class="flex gap-3 px-3 py-2.5 rounded-lg hover:bg-sand ${read.includes(n.id)?'opacity-50':''}">
        <i data-lucide="${n.icon}" class="w-4 h-4 text-forest shrink-0 mt-0.5"></i>
        <div>
          <div class="text-sm text-ink">${n.text}</div>
          <div class="text-[11px] opacity-50 text-ink">${n.time}</div>
        </div>
      </div>
    `).join('') : `<div class="px-3 py-4 text-sm text-ink opacity-60 text-center">Aucune notification</div>`;
    if(typeof lucide !== 'undefined') lucide.createIcons();
    setReadNotifs(NOTIFICATIONS.map(n=>n.id));
    refreshNotifBadge();
  }
  menu.classList.toggle('hidden');
}

document.addEventListener('keydown', function(e){
  if(e.key==='Enter' && e.target && e.target.id==='chatInput') sendChat();
});
document.addEventListener('click', function(e){
  const deliverMenu = document.getElementById('deliverMenu');
  const deliverBtn = document.getElementById('deliverBtn');
  if(deliverMenu && !deliverMenu.classList.contains('hidden') && !deliverMenu.contains(e.target) && !deliverBtn.contains(e.target)){
    deliverMenu.classList.add('hidden');
  }
  const notifMenu = document.getElementById('notifMenu');
  const notifBtn = document.getElementById('notifBtn');
  if(notifMenu && !notifMenu.classList.contains('hidden') && !notifMenu.contains(e.target) && !notifBtn.contains(e.target)){
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
          <button onclick="closeCart()" class="w-8 h-8 rounded-full bg-sand flex items-center justify-center"><i data-lucide="x" class="w-4 h-4"></i></button>
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
function renderCartGeneric(){
  const cart = getCart();
  const box = document.getElementById('cartItems');
  if(!box) return;
  if(cart.length===0){
    box.innerHTML = `<div class="text-center py-10 opacity-50 text-sm">Votre panier est vide.</div>`;
  } else {
    box.innerHTML = cart.map(c=>{
      const p = CATALOG.find(x=>x.id===c.id);
      if(!p) return '';
      return `
      <div class="flex gap-3 items-center">
        <img src="${p.cover}" class="w-16 h-16 rounded-lg object-cover shrink-0">
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-sm truncate">${p.name}</div>
          <div class="text-xs opacity-60">${fmt(p.price)} x ${c.qty}</div>
        </div>
      </div>`;
    }).join('');
  }
  const subtotal = cart.reduce((s,c)=>{ const p = CATALOG.find(x=>x.id===c.id); return s + (p?p.price*c.qty:0); }, 0);
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
        <div class="w-9 h-9 rounded-lg bg-white text-ink flex items-center justify-center font-display font-black">C</div>
        <div class="leading-none">
          <div class="font-display font-bold text-lg">chez nous</div>
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
        <select id="heroCategory" class="hidden sm:block bg-sand text-ink text-xs px-2 border-r border-line outline-none max-w-[160px]">
          <option value="">Toutes catégories</option>
          ${CATEGORIES.map(c=>`<option value="${c.id}">${c.label}</option>`).join('')}
        </select>
        <input id="heroSearch" onkeydown="if(event.key==='Enter')goToMarketplaceGlobal()" placeholder="Rechercher un produit, un plat, un service..." class="flex-1 px-3 py-2 text-sm text-ink outline-none min-w-0">
        <button onclick="goToMarketplaceGlobal()" class="bg-forest hover:brightness-110 text-white px-4 flex items-center justify-center shrink-0">
          <i data-lucide="search" class="w-4 h-4"></i>
        </button>
      </div>
      <div class="flex flex-wrap items-center justify-end gap-x-3 gap-y-1.5 text-xs shrink-0 ml-auto">
        <select id="currencySelect" onchange="setCurrency(this.value)" class="bg-transparent text-xs font-medium outline-none cursor-pointer max-w-[120px]"></select>
        <select id="langSelect" onchange="setLang(this.value)" class="bg-transparent text-xs font-medium outline-none cursor-pointer"></select>
        <button id="accountBtn" class="text-left leading-tight hover:opacity-80"></button>
        <div class="relative">
          <button id="notifBtn" onclick="toggleNotifMenu()" class="relative hover:opacity-80">
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
        ${navLink('marketplace.html','Marketplace','marketplace')}
        ${navLink('mes-commandes.html','Mes commandes','commandes')}
        ${navLink('messagerie.html','Messagerie','messagerie')}
        <div id="navDashboardLink"></div>
        ${navLink('contact.html','Contact','contact')}
        <div class="hidden md:flex items-center gap-2 ml-auto shrink-0">
          <span class="text-[10px] font-semibold opacity-60">RÔLE</span>
          <select id="roleSelect" onchange="changeRoleGlobal(this.value)" class="bg-transparent text-xs font-medium outline-none cursor-pointer">
            <option value="buyer" class="text-ink">Acheteur</option>
            <option value="seller" class="text-ink">Vendeur</option>
            <option value="admin" class="text-ink">Administrateur</option>
          </select>
        </div>
        ${navLink('devenir-vendeur.html','Vendre sur Chez Nous','vendre')}
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

function updateAccountButtonGlobal(){
  const btn = document.getElementById('accountBtn');
  if(!btn) return;
  let loggedIn = false;
  try{ loggedIn = localStorage.getItem('cheznous_logged_in')==='1'; }catch(e){}
  if(loggedIn){
    btn.onclick = ()=>{ window.location.href='mes-commandes.html'; };
    btn.innerHTML = `<div class="text-[10px]">Bonjour, Noémie</div><div class="font-semibold">Comptes & Commandes</div>`;
  } else {
    btn.onclick = ()=>{ window.location.href='connexion.html'; };
    btn.innerHTML = `<div class="font-semibold">Se connecter</div>`;
  }
}

function changeRoleGlobal(role){
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
  const roleSel = document.getElementById('roleSelect');
  if(roleSel) roleSel.value = getRolePersisted();
  const dashSlot = document.getElementById('navDashboardLink');
  if(dashSlot && getRolePersisted()!=='buyer'){
    dashSlot.innerHTML = `<a href="tableau-de-bord.html" class="shrink-0 hover:opacity-80 font-medium whitespace-nowrap ${active==='dashboard'?'underline underline-offset-4':''}">Tableau de bord</a>`;
  }
  if(typeof lucide !== 'undefined') lucide.createIcons();
}

const CHAT_AVATAR_URL = 'assets/malik-airpods.jpg';
const CHAT_AVATAR_GUIDE_URL = 'assets/malik-classic.jpg';

function renderChatWidget(){
  if(document.getElementById('chatLauncher')) return;
  const div = document.createElement('div');
  div.innerHTML = `
  <button id="chatLauncher" onclick="toggleChat()" class="fixed z-[65] rounded-full shadow-xl border-none p-0 overflow-hidden" style="bottom:96px;right:20px;width:60px;height:60px;background:#146B4F" title="Discuter avec Malik">
    <img src="${CHAT_AVATAR_URL}" class="w-full h-full object-cover" style="object-position:50% 12%">
  </button>
  <div id="chatPanel" class="fixed z-[70] bg-white rounded-2xl shadow-2xl flex-col overflow-hidden hidden" style="bottom:164px;right:20px;width:360px;max-width:92vw;height:500px;max-height:70vh">
    <div class="bg-forest text-white p-4 flex items-center gap-3 shrink-0">
      <img src="${CHAT_AVATAR_URL}" class="w-10 h-10 rounded-full object-cover border-2 border-white" style="object-position:50% 12%">
      <div class="flex-1">
        <div class="font-display font-bold text-sm">Malik</div>
        <div class="text-[11px] opacity-70">Assistant Chez Nous</div>
      </div>
      <button onclick="toggleChat()" class="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center"><i data-lucide="x" class="w-4 h-4"></i></button>
    </div>
    <div id="chatMessages" class="flex-1 overflow-y-auto p-4 space-y-2"></div>
    <div id="chatChips" class="flex gap-2 px-4 pb-2 overflow-x-auto no-scrollbar shrink-0"></div>
    <div class="p-3 border-t border-line flex gap-2 shrink-0">
      <input id="chatInput" placeholder="Écrivez votre question..." class="flex-1 border border-line rounded-full px-4 py-2 text-sm outline-none">
      <button onclick="sendChat()" class="w-10 h-10 rounded-full bg-forest text-white flex items-center justify-center shrink-0"><i data-lucide="send" class="w-4 h-4"></i></button>
    </div>
  </div>`;
  while(div.firstElementChild){ document.body.appendChild(div.firstElementChild); }
  if(typeof lucide !== 'undefined') lucide.createIcons();
}

let chatStarted = false;
function toggleChat(){
  renderChatWidget();
  const panel = document.getElementById('chatPanel');
  const opening = panel.classList.contains('hidden');
  panel.classList.toggle('hidden');
  panel.style.display = opening ? 'flex' : 'none';
  if(opening && !chatStarted){
    chatStarted = true;
    addBotMessage("Bonjour, je suis Malik, l'assistant Chez Nous. Je peux vous guider ou répondre à vos questions sur les commandes, la vente ou la livraison.");
    renderChatChips();
  }
  if(typeof lucide !== 'undefined') lucide.createIcons();
}
function addBotMessage(html){
  const box = document.getElementById('chatMessages');
  const el = document.createElement('div');
  el.className = 'bg-sand text-ink rounded-2xl rounded-bl-sm px-3 py-2 text-sm max-w-[82%] leading-relaxed';
  el.innerHTML = html;
  box.appendChild(el);
  box.scrollTop = box.scrollHeight;
}
function addUserMessage(text){
  const box = document.getElementById('chatMessages');
  const el = document.createElement('div');
  el.className = 'bg-ink text-white rounded-2xl rounded-br-sm px-3 py-2 text-sm max-w-[82%] ml-auto leading-relaxed';
  el.textContent = text;
  box.appendChild(el);
  box.scrollTop = box.scrollHeight;
}
function renderChatChips(){
  const chips = ['Comment commander ?','Devenir vendeur','Livraison & retours','Visite guidée'];
  document.getElementById('chatChips').innerHTML = chips.map(c=>`<button class="border border-line rounded-full px-3 py-1.5 text-xs font-semibold bg-white hover:bg-sand whitespace-nowrap shrink-0" onclick="askChip(this.textContent)">${c}</button>`).join('');
}
function askChip(text){ handleUserInput(text); }
function sendChat(){
  const input = document.getElementById('chatInput');
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
  setTimeout(()=>{ addBotMessage(getBotAnswer(m)); }, 400);
}
function getBotAnswer(m){
  if(/bonjour|salut|^hello|coucou/.test(m)) return "Bonjour ! Comment puis-je vous aider : commander, devenir vendeur, livraison ou paiement ?";
  if(/vend(re|eur)|abonnement|commission/.test(m)) return "Pour vendre sur Chez Nous, choisissez une formule : Basique (gratuit, 15% de commission), Pro (129$/an, 10%) ou Premium (299$/an, 6%). Détails sur la page <a href='devenir-vendeur.html' class='underline text-forest'>Devenir vendeur</a>.";
  if(/livrai|exp[ée]di|d[ée]lai|shipping/.test(m)) return "Les délais varient selon le vendeur : 24 à 72h pour la cuisine maison, 3 à 5 jours pour les produits. Voir notre page <a href='livraison.html' class='underline text-forest'>Livraison</a>.";
  if(/retour|rembours|annul/.test(m)) return "Un service peut être annulé gratuitement jusqu'à 24h avant. Pour les produits, voir notre page <a href='retours-remboursement.html' class='underline text-forest'>Retours & remboursements</a>.";
  if(/paiement|stripe|carte|payer|escrow|litige/.test(m)) return "Vos paiements sont retenus de façon sécurisée jusqu'à confirmation de réception avec votre code de livraison. En cas de litige, notre équipe tranche après examen des preuves des deux parties.";
  if(/cat[ée]gorie|produit|service/.test(m)) return "Six catégories sont disponibles : Épicerie africaine, Mode & tissus, Beauté & cheveux afro, Artisanat & décoration, Cuisine maison & traiteur, et Services communautaires.";
  if(/panier|commander|acheter/.test(m)) return "Parcourez la <a href='marketplace.html' class='underline text-forest'>boutique</a>, ajoutez un produit au panier, puis finalisez votre achat.";
  if(/compte|connex|inscri/.test(m)) return "Cliquez sur « Se connecter » en haut de la page pour gérer votre profil et vos commandes.";
  if(/avis|note|[ée]toile/.test(m)) return "Seuls les acheteurs ayant réellement payé peuvent laisser un avis, pour garantir des avis fiables.";
  if(/cookie|confidentialit|donn[ée]e|rgpd|lprpde|vie priv[ée]e/.test(m)) return "Vos données sont protégées conformément à la LPRPDE, au RGPD et au CCPA. Détails sur notre page <a href='confidentialite.html' class='underline text-forest'>Confidentialité</a>.";
  if(/contact|support|aide|humain|t[ée]l[ée]phone/.test(m)) return "Vous pouvez contacter notre équipe via la page <a href='contact.html' class='underline text-forest'>Contact</a>, ou par courriel à aide@cheznous.ca.";
  if(/merci/.test(m)) return "Avec plaisir ! N'hésitez pas si vous avez d'autres questions.";
  return "Je ne suis pas certain de comprendre. Essayez : commander, devenir vendeur, livraison, retours, paiement ou catégories. Pour une réponse humaine : <a href='contact.html' class='underline text-forest'>contactez notre équipe</a>.";
}

function getRolePersisted(){
  try{ return localStorage.getItem('cheznous_role') || 'buyer'; }catch(e){ return 'buyer'; }
}
function persistRole(r){
  try{ localStorage.setItem('cheznous_role', r); }catch(e){}
}

window.currency = getCurrency();
