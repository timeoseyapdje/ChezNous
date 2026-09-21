import Link from "next/link";

const CATEGORIES = [
  { id: "epicerie", label: "Épicerie africaine" },
  { id: "mode", label: "Mode & tissus" },
  { id: "beaute", label: "Beauté & cheveux afro" },
  { id: "artisanat", label: "Artisanat & décoration" },
  { id: "cuisine", label: "Cuisine maison & traiteur" },
  { id: "services", label: "Services communautaires" },
];

export function SiteHeader() {
  return (
    <header className="bg-ink text-white">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-3 px-4 py-3 md:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white font-display font-black text-ink">
            C
          </div>
          <div className="leading-none">
            <div className="font-display text-lg font-bold">chez nous</div>
            <div className="text-[9px] tracking-wider opacity-60">DIASPORA AFRICAINE • CANADA</div>
          </div>
        </Link>

        <div className="flex min-w-[220px] flex-1 overflow-hidden rounded-md bg-white">
          <input
            placeholder="Rechercher un produit, un plat, un service..."
            className="min-w-0 flex-1 px-3 py-2 text-sm text-ink outline-none"
          />
          <button className="shrink-0 bg-forest px-4 text-white hover:brightness-110">Rechercher</button>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-4 text-xs">
          <Link href="/connexion" className="hover:opacity-80">
            Se connecter
          </Link>
          <Link href="/panier" className="hover:opacity-80">
            Panier
          </Link>
        </div>
      </div>

      <nav className="border-t border-white/10 bg-forestDark">
        <div className="mx-auto flex h-11 max-w-[1400px] items-center gap-5 overflow-x-auto px-4 text-sm md:px-6">
          <Link href="/marketplace" className="font-medium hover:opacity-80">
            Marketplace
          </Link>
          {CATEGORIES.map((cat) => (
            <Link key={cat.id} href={`/marketplace?categorie=${cat.id}`} className="whitespace-nowrap font-medium hover:opacity-80">
              {cat.label}
            </Link>
          ))}
          <Link href="/devenir-vendeur" className="ml-auto shrink-0 font-semibold hover:opacity-80">
            Vendre sur Chez Nous
          </Link>
        </div>
      </nav>
    </header>
  );
}
