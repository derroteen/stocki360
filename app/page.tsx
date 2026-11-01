import ThemeToggle from "@/components/ThemeToggle";
import Typewriter from "@/components/landing/Typewriter";
import LiveOverviewCard from "@/components/landing/LiveOverviewCard";
import ProductWalkthrough from "@/components/landing/ProductWalkthrough";
import { BRAND_COMPANY_NAME, BRAND_CONTACT_EMAIL } from "@/lib/brand";
import LiveCommandCenter from "@/components/landing/LiveCommandCenter";
import AuthAwareActions from "@/components/landing/AuthAwareActions";
import { GUIDE_STEPS } from "@/lib/guide-steps";

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

  return (
    <div className="min-h-screen bg-surface text-ink-900">
      <header className="sticky top-0 z-40 border-b border-line bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <span className="font-serif text-xl font-bold tracking-tight text-accent-link">Stocki360</span>
          <div className="flex items-center gap-2">
            <a
              href="#how-it-works"
              className="hidden min-h-[44px] items-center rounded-lg px-3 text-sm font-medium text-ink-700 transition-colors hover:bg-subtle hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-card lg:inline-flex"
            >
              How it works
            </a>
            <ThemeToggle />
            <AuthAwareActions variant="header" />
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

                <AuthAwareActions variant="hero" />
              </Typewriter>
            </div>

            <LiveOverviewCard />
          </div>
        </section>

        <ProductWalkthrough />
        <LiveCommandCenter />

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

        <section id="how-it-works" className="scroll-mt-20 border-b border-line bg-surface py-14 sm:py-16">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <div className="mb-8 max-w-3xl space-y-2">
              <h2 className="font-serif text-3xl font-bold text-ink-900">Get started in minutes</h2>
              <p className="text-sm leading-6 text-ink-600 sm:text-base">
                Follow these eight steps to set up your business and start managing stock.
              </p>
            </div>

            <ol className="relative space-y-4">
              <span aria-hidden="true" className="absolute bottom-5 left-[17px] top-5 w-px bg-line" />
              {GUIDE_STEPS.map((step, index) => (
                <li
                  key={step.id}
                  className="landing-guide-step relative grid min-w-0 grid-cols-[2.25rem_minmax(0,1fr)] items-stretch gap-3 sm:gap-4"
                >
                  <span className="z-10 inline-flex h-9 w-9 items-center justify-center self-start rounded-full border border-line-strong bg-card text-sm font-bold text-ink-700">
                    {index + 1}
                  </span>
                  <article className="min-w-0 rounded-xl border border-line bg-card p-4 shadow-2xs sm:p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="break-words text-base font-semibold text-ink-900 sm:text-lg">
                        {step.title}
                      </h3>
                      {step.optional && (
                        <span className="rounded-full border border-line px-2 py-0.5 text-xs font-medium text-ink-500">
                          Optional
                        </span>
                      )}
                    </div>
                    <p className="mt-1 break-words text-sm leading-6 text-ink-600">
                      {step.whyItMatters}
                    </p>
                  </article>
                </li>
              ))}
            </ol>

            <aside className="mt-6 rounded-xl border border-line bg-card p-4 sm:p-5">
              <h3 className="font-semibold text-ink-900">Why this order?</h3>
              <p className="mt-1 text-sm leading-6 text-ink-600">
                Products can use categories and suppliers, but neither is required. You can’t sell an item until it has stock, so add stock before recording your first sale.
              </p>
            </aside>

            <div className="mt-8 rounded-xl border border-line bg-card p-5 shadow-2xs sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6">
              <div className="min-w-0">
                <h3 className="font-serif text-xl font-bold text-ink-900">Ready to get started?</h3>
                <p className="mt-1 text-sm text-ink-600">Set up your business and keep your stock moving.</p>
              </div>
              <div className="mt-4 sm:mt-0">
                <AuthAwareActions variant="hero" />
              </div>
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
          <AuthAwareActions variant="footer" />
        </div>
        <div className="mx-auto mt-6 w-full max-w-6xl border-t border-line px-4 pt-4 sm:px-6" />
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-2 px-4 text-center text-xs text-ink-500 sm:flex-row sm:justify-between sm:px-6 sm:text-left">
          <p>
            Powered by {BRAND_COMPANY_NAME}{" "}
            <a
              href={`mailto:${BRAND_CONTACT_EMAIL}`}
              className="underline decoration-transparent underline-offset-2 transition-colors hover:text-accent-600 hover:decoration-current focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
            >
              {BRAND_CONTACT_EMAIL}
            </a>
          </p>
          <p>
            © {new Date().getFullYear()} {BRAND_COMPANY_NAME}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
