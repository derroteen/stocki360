import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import Typewriter from "@/components/landing/Typewriter";
import LiveOverviewCard from "@/components/landing/LiveOverviewCard";
import ProductWalkthrough from "@/components/landing/ProductWalkthrough";
import Warehouse3DLoader from "@/components/landing/Warehouse3DLoader";

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
      <header className="sticky top-0 z-40 border-b border-line bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <span className="font-serif text-xl font-bold tracking-tight text-accent-link">Stocki360</span>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/login"
              className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-line-strong px-4 text-sm font-medium text-ink-700 transition-colors hover:bg-subtle"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-line bg-card">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-accent-50 to-transparent" />
          <div aria-hidden="true" className="landing-hero-glow pointer-events-none absolute inset-0" />
          <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 md:py-18 lg:grid-cols-2 lg:items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center rounded-full border border-accent-100 bg-accent-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent-text">
                Inventory Management for SMEs
              </div>
              <Typewriter>
                <p className="landing-paragraph max-w-xl text-base leading-7 text-ink-700 sm:text-lg">
                  A simple inventory management system for modern businesses. Stocki360 helps you track stock in real time, manage products, and reduce costly stock-related mistakes.
                </p>

                <ul className="grid gap-2 text-sm text-ink-700 sm:grid-cols-2">
                  <li className="landing-feature rounded-lg border border-line bg-subtle px-3 py-2">Track stock in real time</li>
                  <li className="landing-feature rounded-lg border border-line bg-subtle px-3 py-2">Manage products</li>
                  <li className="landing-feature rounded-lg border border-line bg-subtle px-3 py-2">Monitor low-stock items</li>
                  <li className="landing-feature rounded-lg border border-line bg-subtle px-3 py-2">Manage sales and purchases</li>
                  <li className="landing-feature rounded-lg border border-line bg-subtle px-3 py-2 sm:col-span-2">Know what is in your inventory and reduce stock-related mistakes</li>
                </ul>

                <div className="landing-actions flex flex-col gap-3 pt-2 sm:flex-row">
                  <Link
                    href="/login"
                    className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-accent-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-700"
                  >
                    Get Started
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-line-strong px-5 py-2.5 text-sm font-semibold text-ink-700 transition-colors hover:bg-subtle"
                  >
                    Sign In
                  </Link>
                </div>
              </Typewriter>
            </div>

            <LiveOverviewCard />
          </div>
        </section>

        <ProductWalkthrough />
        <Warehouse3DLoader />

        <section className="border-b border-line bg-surface py-14 sm:py-16">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <div className="mb-8 max-w-2xl space-y-2">
              <h2 className="font-serif text-3xl font-bold text-ink-900">Everything you need to manage inventory</h2>
              <p className="text-sm leading-6 text-ink-600 sm:text-base">
                Stocki360 is built to help teams keep operations organized and stock data accurate.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <article key={feature.title} className="rounded-xl border border-line bg-card p-5 shadow-2xs">
                  <h3 className="text-lg font-semibold text-ink-900">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-ink-600">{feature.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-line bg-card py-14 sm:py-16">
          <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:items-start">
            <div className="space-y-3">
              <h2 className="font-serif text-3xl font-bold text-ink-900">Who Stocki360 is for</h2>
              <p className="text-sm leading-6 text-ink-600 sm:text-base">
                Whether you sell from one location or manage multiple product lines, Stocki360 keeps your inventory process simple and practical.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {businessTypes.map((type) => (
                <div key={type} className="rounded-xl border border-line bg-panel px-4 py-3 text-sm font-medium text-ink-700">
                  {type}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-line bg-surface py-14 sm:py-16">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <div className="mb-8 space-y-2">
              <h2 className="font-serif text-3xl font-bold text-ink-900">How it works</h2>
              <p className="text-sm leading-6 text-ink-600 sm:text-base">Set up your workflow in four clear steps.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, index) => (
                <div key={step} className="rounded-xl border border-line bg-card p-5 shadow-2xs">
                  <p className="text-xs font-semibold uppercase tracking-wider text-accent-text">Step {index + 1}</p>
                  <p className="mt-2 text-sm font-medium text-ink-800">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-card py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="font-serif text-lg font-bold text-accent-link">Stocki360</p>
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
              className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-line-strong px-4 text-sm font-semibold text-ink-700 transition-colors hover:bg-subtle"
            >
              Sign In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
