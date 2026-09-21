import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-10 border-t border-line bg-white">
      <div className="mx-auto grid max-w-[1280px] gap-8 px-4 py-10 text-sm md:grid-cols-4 md:px-6">
        <div>
          <div className="flex items-center gap-2 font-display text-lg font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-forest text-white">C</span>
            chez nous
          </div>
          <p className="mt-3 leading-relaxed opacity-60">
            Marketplace multi-vendeurs de la diaspora africaine, active partout au Canada.
          </p>
        </div>
        <div>
          <div className="font-semibold">Explorer</div>
          <ul className="mt-3 space-y-2 opacity-70">
            <li><Link href="/marketplace" className="hover:underline">Marketplace</Link></li>
            <li><Link href="/devenir-vendeur" className="hover:underline">Devenir vendeur</Link></li>
            <li><Link href="/contact" className="hover:underline">Contact</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold">Légal</div>
          <ul className="mt-3 space-y-2 opacity-70">
            <li><Link href="/legal/mentions-legales" className="hover:underline">Mentions légales</Link></li>
            <li><Link href="/legal/confidentialite" className="hover:underline">Politique de confidentialité</Link></li>
            <li><Link href="/legal/charte-communaute" className="hover:underline">Charte de la communauté</Link></li>
          </ul>
        </div>
        <div className="rounded-2xl bg-sand p-4">
          <div className="font-semibold">Paiements sécurisés</div>
          <p className="mt-2 text-xs opacity-60">Abonnements & commissions via Stripe Connect.</p>
        </div>
      </div>
      <div className="mx-auto max-w-[1280px] border-t border-line px-4 py-6 text-xs opacity-50 md:px-6">
        © {new Date().getFullYear()} Chez Nous Commerce Inc.
      </div>
    </footer>
  );
}
