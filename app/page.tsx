import Link from "next/link";

const CATEGORIES = [
  { id: "epicerie", label: "Épicerie africaine", count: 210 },
  { id: "mode", label: "Mode & tissus", count: 150 },
  { id: "beaute", label: "Beauté & cheveux afro", count: 190 },
  { id: "artisanat", label: "Artisanat & décoration", count: 80 },
  { id: "cuisine", label: "Cuisine maison & traiteur", count: 230 },
  { id: "services", label: "Services communautaires", count: 120 },
];

export default function HomePage() {
  return (
    <main className="mx-auto max-w-[1280px] px-4 pt-8 md:px-6">
      <section className="rounded-2xl border border-line bg-white p-6 md:p-10">
        <h1 className="font-display text-[32px] font-black leading-tight md:text-[46px]">
          La marketplace<br />
          <span className="text-forest">de la diaspora africaine,</span><br />
          livrée partout au Canada.
        </h1>
        <p className="mt-4 max-w-[520px] text-[15px] leading-relaxed opacity-70">
          Épicerie africaine, tissus wax, cheveux afro, artisanat, cuisine maison et services
          communautaires : des vendeurs indépendants de la diaspora, vérifiés, partout au pays.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/marketplace" className="rounded-full bg-forest px-6 py-3 font-bold text-white hover:brightness-110">
            Explorer la marketplace
          </Link>
          <Link href="/devenir-vendeur" className="rounded-full bg-sand px-6 py-3 font-bold hover:bg-line">
            Devenir vendeur
          </Link>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-bold">Explorer par catégorie</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              href={`/marketplace?categorie=${cat.id}`}
              className="rounded-2xl border border-line bg-white p-4 transition hover:border-forest"
            >
              <div className="text-sm font-semibold">{cat.label}</div>
              <div className="text-xs opacity-50">{cat.count} vendeurs</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-10 mt-10 rounded-2xl bg-ink p-6 text-white md:p-10">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="max-w-[560px]">
            <span className="rounded-full bg-forest px-3 py-1 text-xs font-bold tracking-widest">
              DEVENIR VENDEUR
            </span>
            <h2 className="mt-4 font-display text-3xl font-bold leading-tight md:text-4xl">
              Vendez vos produits ou vos services<br />
              <span className="opacity-75">à la diaspora africaine du Canada.</span>
            </h2>
          </div>
          <Link
            href="/devenir-vendeur"
            className="shrink-0 rounded-full bg-forest px-6 py-3.5 font-bold text-white hover:brightness-110"
          >
            Voir les formules & s&apos;inscrire
          </Link>
        </div>
      </section>
    </main>
  );
}
