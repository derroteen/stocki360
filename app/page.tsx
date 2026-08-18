import Link from "next/link";

export default function Home() {
  const features = [
    {
      title: "Inventory Tracking",
      description: "Track stock movements in real time so you always know what is available.",
    },
    {
      title: "Product Management",
      description: "Create, organize, and update your product catalog from one place.",
    },
    {
      title: "Sales Management",
      description: "Record sales quickly and keep inventory levels accurate after each transaction.",
    },
    {
      title: "Purchase Management",
      description: "Log incoming stock from suppliers and maintain reliable stock records.",
    },
    {
      title: "Low Stock Monitoring",
      description: "Spot low-stock items early and reorder before items run out.",
    },
    {
      title: "Reports & Insights",
      description:
        "View clear stock overviews to support better decisions, with deeper reporting planned as the product evolves.",
    },
  ];

  const businessTypes = [
    "Hardware shops",
    "Retail shops",
    "Wholesalers",
    "Small and medium businesses",
    "Jua Kali businesses",
  ];

  const steps = [
    "Add your products",
    "Record purchases and sales",
    "Monitor your stock",
    "Reorder before you run out",
  ];

  return (
    <div className="min-h-screen bg-surface text-ink-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <span className="font-serif text-xl font-bold tracking-tight text-accent-600">Stocki360</span>
          <Link
            href="/login"
            className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-medium text-ink-700 transition-colors hover:bg-slate-50"
          >
            Sign In
          </Link>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-slate-200 bg-white">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-accent-50 to-transparent" />
          <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 md:py-18 lg:grid-cols-2 lg:items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center rounded-full border border-accent-100 bg-accent-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent-700">
                Inventory Management for SMEs
              </div>
              <h1 className="font-serif text-4xl font-bold leading-tight tracking-tight text-ink-900 sm:text-5xl">
                Run your stock with clarity, from shelf to sale.
              </h1>
              <p className="max-w-xl text-base leading-7 text-ink-700 sm:text-lg">
                A simple inventory management system for modern businesses. Stocki360 helps you track stock in real time, manage products, and reduce costly stock-related mistakes.
              </p>

              <ul className="grid gap-2 text-sm text-ink-700 sm:grid-cols-2">
                <li className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">Track stock in real time</li>
                <li className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">Manage products</li>
                <li className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">Monitor low-stock items</li>
                <li className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">Manage sales and purchases</li>
                <li className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 sm:col-span-2">Know what is in your inventory and reduce stock-related mistakes</li>
              </ul>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <Link
                  href="/login"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-accent-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-700"
                >
                  Get Started
                </Link>
                <Link
                  href="/login"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-ink-700 transition-colors hover:bg-slate-50"
                >
                  Sign In
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-surface p-4 shadow-sm sm:p-6">
              <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <p className="text-sm font-semibold text-ink-900">Stocki360 Overview</p>
                  <p className="text-xs text-ink-500">Live inventory snapshot</p>
                </div>
                <span className="rounded-full border border-good-600/20 bg-good-100 px-2.5 py-1 text-xs font-medium text-good-700">
                  Synced
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-[11px] uppercase tracking-wider text-ink-500">Products</p>
                  <p className="mt-1 font-serif text-2xl font-bold text-ink-900">128</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-[11px] uppercase tracking-wider text-ink-500">Low Stock</p>
                  <p className="mt-1 font-serif text-2xl font-bold text-warn-700">7</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-[11px] uppercase tracking-wider text-ink-500">Updates</p>
                  <p className="mt-1 font-serif text-2xl font-bold text-accent-700">24</p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-500">Low stock alerts</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-lg bg-warn-100 px-3 py-2 text-sm text-warn-700">
                    <span>Galvanized Nails 2.5 inch</span>
                    <span className="font-semibold">6 left</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-slate-100 px-3 py-2 text-sm text-ink-700">
                    <span>Paint Roller Set</span>
                    <span className="font-semibold">12 left</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-slate-100 px-3 py-2 text-sm text-ink-700">
                    <span>PVC Pipe 20mm</span>
                    <span className="font-semibold">18 left</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-surface py-14 sm:py-16">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <div className="mb-8 max-w-2xl space-y-2">
              <h2 className="font-serif text-3xl font-bold text-ink-900">Everything you need to manage inventory</h2>
              <p className="text-sm leading-6 text-ink-600 sm:text-base">
                Stocki360 is built to help teams keep operations organized and stock data accurate.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <article key={feature.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
                  <h3 className="text-lg font-semibold text-ink-900">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-ink-600">{feature.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white py-14 sm:py-16">
          <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:items-start">
            <div className="space-y-3">
              <h2 className="font-serif text-3xl font-bold text-ink-900">Who Stocki360 is for</h2>
              <p className="text-sm leading-6 text-ink-600 sm:text-base">
                Whether you sell from one location or manage multiple product lines, Stocki360 keeps your inventory process simple and practical.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {businessTypes.map((type) => (
                <div key={type} className="rounded-xl border border-slate-200 bg-surface px-4 py-3 text-sm font-medium text-ink-700">
                  {type}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-surface py-14 sm:py-16">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <div className="mb-8 space-y-2">
              <h2 className="font-serif text-3xl font-bold text-ink-900">How it works</h2>
              <p className="text-sm leading-6 text-ink-600 sm:text-base">Set up your workflow in four clear steps.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, index) => (
                <div key={step} className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
                  <p className="text-xs font-semibold uppercase tracking-wider text-accent-700">Step {index + 1}</p>
                  <p className="mt-2 text-sm font-medium text-ink-800">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-white py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="font-serif text-lg font-bold text-accent-600">Stocki360</p>
            <p className="text-sm text-ink-500">Inventory management for local retailers, wholesalers, and SMEs.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-accent-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-accent-700"
            >
              Get Started
            </Link>
            <Link
              href="/login"
              className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-ink-700 transition-colors hover:bg-slate-50"
            >
              Sign In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
