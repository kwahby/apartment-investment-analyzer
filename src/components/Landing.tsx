import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import './Landing.css';

interface LandingProps {
  /** Called when the user chooses to enter the analyzer. */
  onLaunch: () => void;
}

interface Slide {
  src: string;
  title: string;
  gradient: string;
  icon: ReactElement;
}

const BASE = import.meta.env.BASE_URL;

const SLIDES: Slide[] = [
  {
    src: `${BASE}screenshots/01-summary.png`,
    title: 'Instant Buy / Caution / Avoid verdict',
    gradient: 'lp-g-indigo',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 12 2 2 4-4" /><circle cx="12" cy="12" r="10" /></svg>
    ),
  },
  {
    src: `${BASE}screenshots/02-metrics.png`,
    title: 'Yields, multiples & a live market benchmark',
    gradient: 'lp-g-sky',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-6" /></svg>
    ),
  },
  {
    src: `${BASE}screenshots/03-cashflow.png`,
    title: 'See exactly when it turns cash-flow positive',
    gradient: 'lp-g-green',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
    ),
  },
  {
    src: `${BASE}screenshots/04-financing.png`,
    title: 'The German mortgage, demystified',
    gradient: 'lp-g-violet',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>
    ),
  },
  {
    src: `${BASE}screenshots/05-projection.png`,
    title: 'Years ahead: after-tax return & vs. an ETF',
    gradient: 'lp-g-amber',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg>
    ),
  },
  {
    src: `${BASE}screenshots/06-scenarios.png`,
    title: 'Stress-test cautious vs. optimistic',
    gradient: 'lp-g-teal',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M7 12h10" /><path d="M10 18h4" /></svg>
    ),
  },
];

const AUTO_MS = 4200;

export function Landing({ onLaunch }: LandingProps) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef<number | null>(null);

  const go = useCallback((next: number) => {
    setActive((next + SLIDES.length) % SLIDES.length);
  }, []);

  // Auto-advance the carousel unless paused (hover / focus) or reduced-motion.
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (paused || reduce) return;
    timer.current = window.setTimeout(() => go(active + 1), AUTO_MS);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [active, paused, go]);

  return (
    <div className="lp">
      {/* ---------- sticky nav ---------- */}
      <nav className="lp-nav">
        <div className="lp-nav-inner">
          <span className="lp-brand">
            <span className="lp-logo">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18" /><path d="M5 21V7l7-4 7 4v14" /><path d="M9 21v-6h6v6" /></svg>
            </span>
            Apartment Investment Analyzer
          </span>
          <div className="lp-nav-links">
            <a className="lp-hide-sm" href="#features">Features</a>
            <a className="lp-hide-sm" href="#screens">Screens</a>
            <a className="lp-hide-sm" href="#how">How it works</a>
            <button className="lp-btn lp-btn-primary" onClick={onLaunch}>
              Launch app
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      </nav>

      {/* ---------- hero ---------- */}
      <header className="lp-hero">
        <div className="lp-wrap">
          <span className="lp-blob lp-blob-1" />
          <span className="lp-blob lp-blob-2" />
          <div className="lp-hero-grid">
            <div>
              <span className="lp-eyebrow">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4" /><path d="m16.2 7.8 2.9-2.9" /><path d="M18 12h4" /><circle cx="12" cy="12" r="4" /></svg>
                Smarter property decisions
              </span>
              <h1 className="lp-h1">
                Is this apartment a <span className="lp-grad">good investment?</span>
              </h1>
              <p className="lp-lead">
                Enter a German rental listing's numbers and get an instant, honest read —
                a Buy / Caution / Avoid verdict, full cash-flow and financing analysis,
                and a multi-year after-tax projection. All in plain language, all in your browser.
              </p>
              <div className="lp-hero-actions">
                <button className="lp-btn lp-btn-primary lp-btn-lg" onClick={onLaunch}>
                  Launch the analyzer
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                </button>
                <a className="lp-btn lp-btn-lg" href="#screens">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8" /><path d="M12 17v4" /></svg>
                  See it in action
                </a>
              </div>
              <div className="lp-hero-meta">
                <span><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg> No sign-up</span>
                <span><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg> 100% private</span>
                <span><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg> Works offline</span>
              </div>
            </div>

            {/* hero screenshot mockup */}
            <div className="lp-mock">
              <div className="lp-mock-bar">
                <span className="lp-mock-dot" style={{ background: '#f87171' }} />
                <span className="lp-mock-dot" style={{ background: '#fbbf24' }} />
                <span className="lp-mock-dot" style={{ background: '#34d399' }} />
                <span className="lp-mock-url">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                  investment-analyzer
                </span>
              </div>
              <div className="lp-mock-view">
                <img src={`${BASE}screenshots/01-summary.png`} alt="Analyzer summary with a Buy verdict" loading="eager" />
              </div>
            </div>
          </div>

          <div className="lp-strip">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
            <span><strong>Not financial or tax advice.</strong> Every figure is an estimate — verify with a qualified advisor before making any decision.</span>
          </div>
        </div>
      </header>

      {/* ---------- carousel ---------- */}
      <section id="screens" className="lp-section">
        <div className="lp-wrap lp-center">
          <span className="lp-eyebrow">A quick look</span>
          <h2 className="lp-h2">One screen, the whole picture</h2>
          <p className="lp-sub">Every tab answers one question about the deal — swipe through to see how.</p>

          <div
            className="lp-carousel"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocusCapture={() => setPaused(true)}
            onBlurCapture={() => setPaused(false)}
          >
            <button className="lp-arrow lp-arrow-prev" onClick={() => go(active - 1)} aria-label="Previous screenshot">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            </button>

            <div className="lp-slides">
              {(() => {
                const s = SLIDES[active];
                return (
                  <div className="lp-slide" key={s.src}>
                    <div className="lp-mock">
                      <div className="lp-mock-bar">
                        <span className="lp-mock-dot" style={{ background: '#f87171' }} />
                        <span className="lp-mock-dot" style={{ background: '#fbbf24' }} />
                        <span className="lp-mock-dot" style={{ background: '#34d399' }} />
                        <span className="lp-mock-url">investment-analyzer</span>
                      </div>
                      <div className="lp-mock-view">
                        <img src={s.src} alt={s.title} />
                      </div>
                    </div>
                    <div className="lp-slide-cap">
                      <span className={`lp-cap-ico ${s.gradient}`}>{s.icon}</span>
                      {s.title}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Preload every screenshot so switching slides is instant. */}
            <div className="lp-preload" aria-hidden="true">
              {SLIDES.map((s) => (
                <img key={s.src} src={s.src} alt="" />
              ))}
            </div>

            <button className="lp-arrow lp-arrow-next" onClick={() => go(active + 1)} aria-label="Next screenshot">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
            </button>
          </div>

          <div className="lp-dots" role="tablist" aria-label="Choose screenshot">
            {SLIDES.map((s, i) => (
              <button
                key={s.src}
                className={`lp-dot ${i === active ? 'is-active' : ''}`}
                onClick={() => go(i)}
                aria-label={`Show: ${s.title}`}
                aria-selected={i === active}
                role="tab"
              />
            ))}
          </div>
        </div>
      </section>

      {/* ---------- features ---------- */}
      <section id="features" className="lp-section">
        <div className="lp-wrap">
          <div className="lp-center" style={{ marginBottom: 30 }}>
            <span className="lp-eyebrow">What you get</span>
            <h2 className="lp-h2">Everything you need to judge a deal</h2>
            <p className="lp-sub">Built for beginners with plain-language help, detailed enough for serious number-crunching.</p>
          </div>

          <div className="lp-grid lp-grid-3">
            <Feature grad="lp-g-indigo" title="Instant verdict"
              body="A Buy / Caution / Avoid score from yield, cash flow, price vs. the local market and location.">
              <path d="m9 12 2 2 4-4" /><circle cx="12" cy="12" r="10" />
            </Feature>
            <Feature grad="lp-g-green" title="Cash-flow clarity"
              body="Monthly income vs. costs, the interest/Tilgung split, and the exact year the deal turns positive.">
              <line x1="12" y1="2" x2="12" y2="22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </Feature>
            <Feature grad="lp-g-violet" title="German financing"
              body="Annuity loans, Zinsbindung, follow-up financing and lump-sum repayments — simulated month by month.">
              <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
            </Feature>
            <Feature grad="lp-g-amber" title="Long-term projection"
              body="Appreciation, rent growth, a sale, IRR and money multiple — plus a full after-tax view.">
              <path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" />
            </Feature>
            <Feature grad="lp-g-sky" title="Property vs. ETF"
              body="Commits the same cash to both paths and shows which one leaves you wealthier.">
              <path d="M3 3v18h18" /><path d="M7 16l4-4 3 3 5-6" />
            </Feature>
            <Feature grad="lp-g-teal" title="Market benchmark"
              body="Compares the listing's €/m² and rent against a local average via postal-code lookup.">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" />
            </Feature>
            <Feature grad="lp-g-rose" title="Max-offer solver"
              body="Work backwards from a target return to the highest price you could pay — your negotiation ceiling.">
              <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
            </Feature>
            <Feature grad="lp-g-indigo" title="Save & compare"
              body="Snapshot listings and line them up side by side, best value flagged per metric.">
              <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
            </Feature>
            <Feature grad="lp-g-slate" title="Private & shareable"
              body="Nothing leaves your browser. Export a designed one-page PDF to share with a partner or the bank.">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </Feature>
          </div>
        </div>
      </section>

      {/* ---------- how it works ---------- */}
      <section id="how" className="lp-section">
        <div className="lp-wrap">
          <div className="lp-center" style={{ marginBottom: 30 }}>
            <span className="lp-eyebrow">Three steps</span>
            <h2 className="lp-h2">From listing to verdict in minutes</h2>
          </div>
          <div className="lp-steps">
            <div className="lp-card lp-step">
              <span className="lp-num" />
              <h3>Enter the listing</h3>
              <p>Purchase price, size, rent, Hausgeld and balcony — every field has a plain-language hint.</p>
            </div>
            <div className="lp-card lp-step">
              <span className="lp-num" />
              <h3>Set your financing</h3>
              <p>Down payment, interest rate, fixed period and your Tilgung %. Pick one rate or refinancing.</p>
            </div>
            <div className="lp-card lp-step">
              <span className="lp-num" />
              <h3>Read &amp; explore</h3>
              <p>Get the verdict, then dive into cash flow, financing and the long-term projection.</p>
            </div>
          </div>

          <div className="lp-center">
            <div className="lp-chips">
              <span className="lp-chip lp-chip-good"><span className="lp-cdot" style={{ background: 'var(--good)' }} /> Buy — the numbers stack up</span>
              <span className="lp-chip lp-chip-warn"><span className="lp-cdot" style={{ background: 'var(--warn)' }} /> Caution — dig deeper</span>
              <span className="lp-chip lp-chip-bad"><span className="lp-cdot" style={{ background: 'var(--bad)' }} /> Avoid — the maths doesn't work</span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- final CTA ---------- */}
      <section className="lp-section" style={{ paddingTop: 20 }}>
        <div className="lp-wrap">
          <div className="lp-cta">
            <span className="lp-cta-blob lp-cta-blob-1" />
            <span className="lp-cta-blob lp-cta-blob-2" />
            <h2>Ready to size up your next apartment?</h2>
            <p>No account, no upload, no cost. Your numbers stay on your device — start analyzing in seconds.</p>
            <button className="lp-btn lp-btn-lg" onClick={onLaunch}>
              Launch the analyzer
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
            </button>
          </div>

          <footer className="lp-footer">
            <span>Apartment Investment Analyzer</span>
            <span>A personal decision-support tool — not financial or tax advice.</span>
          </footer>
        </div>
      </section>
    </div>
  );
}

/** Small feature card. Children are the inner paths of a 24×24 stroke icon. */
function Feature({ grad, title, body, children }: { grad: string; title: string; body: string; children: ReactNode }) {
  return (
    <div className="lp-card lp-card-hover">
      <span className={`lp-fico ${grad}`}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {children}
        </svg>
      </span>
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
}
