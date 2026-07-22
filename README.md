# Apartment Investment Analyzer

> **Not financial or tax advice.** This is a personal decision-support tool. All figures are estimates — verify with a qualified professional before making any decision.

A fast, private, browser-based tool for deciding whether a German rental apartment is a good **investment**. Enter a listing's numbers and get an instant Buy / Caution / Avoid verdict, full cash-flow and financing analysis, a multi-year after-tax projection, and more — all computed live in your browser with no back-end, no accounts, and nothing stored off your device.

Built for beginners (plain-language explanations everywhere) but detailed enough for serious number-crunching: German annuity loans, Zinsbindung + Anschlussfinanzierung, AfA depreciation, Spekulationssteuer, Sonderabschreibung §7b.

---

## Features

### Analysis
- **Instant verdict** — Buy / Caution / Avoid score weighted by yield, cash flow, price vs. local market, and location.
- **Key metrics** — gross & net yield (Brutto-/Nettomietrendite), price multiple (Kaufpreisfaktor), cash-on-cash, price/rent per m².
- **Balcony support** — enter the balcony area (m²) and weighting % (Wohnflächenverordnung default: 25%) for a fairer €/m² benchmark.
- **Market benchmark** — compare the listing's €/m² and rent/m² against local averages via a postal-code / city lookup (bundled reference data).

### Cash flow
- **Monthly breakdown** — rent in, Hausgeld (recoverable vs. non-recoverable split), maintenance reserve, management, vacancy allowance, loan interest, Tilgung (principal) — each itemised separately.
- **Yearly cash-flow chart** — bars turn green the year the deal turns positive, with a marker on that year and one for loan payoff.
- **Income vs. outflow chart** — stacked diverging bars show rent (green) against operating costs, interest and principal for each year, with a net-cash-flow line overlay.
- **Cash-flow timeline** — plain-language explanation of when and why the deal flips positive.

### Financing
- **German annuity model** — simulated month-by-month; interest + Tilgung % = fixed payment for both repayment options.
- **Tilgung % controls payment** for both strategy options: *same rate throughout* (no refinancing risk) or *follow-up loan* (Anschlussfinanzierung at an assumed future rate).
- **Target payoff solver** — auto-sizes the payment to hit a user-defined payoff year.
- **Sondertilgung** — annual lump-sum extra repayments with a with/without comparison chart.
- **Year-by-year payment schedule** — full amortization table.

### Long-term projection
- **Multi-year model** — appreciation, rent growth, cost inflation, IRR, money multiple, and a sale at the end of the holding period.
- **Full after-tax view** — deductible interest, AfA depreciation, optional Sonderabschreibung §7b (§7b EStG), income tax on rental profit, and Spekulationssteuer with the 10-year rule.
- **Property vs. ETF** — commits the same cash to both paths and shows which leaves you wealthier.

### Tools & UX
- **Scenarios** — Cautious / Base / Optimistic stress tests side by side.
- **Max offer price (goal-seek)** — solve for the highest price that still hits a target yield, IRR, or break-even — your negotiation ceiling.
- **Save & compare deals** — snapshot listings and line them up, best value flagged per metric.
- **What-if sensitivity lab** — slider playground; outputs update live with deltas.
- **Affordability check** — weigh the monthly commitment against your income.
- **Rent vs. buy** — compare staying a tenant to buying over your chosen horizon.
- **PDF export** — designed one-page infographic summary.
- **Beginner glossary** — plain-language explanations of every term (Tilgung, Zinsbindung, Hausgeld, AfA, …).
- **Landing page** — a polished marketing entry point with a screenshot carousel; the app is the default route from the landing.
- **100% client-side & private** — no backend, no accounts; all data lives only in your browser's `localStorage`.

---

## Tech stack

| Tool | Purpose |
|---|---|
| [Vite 8](https://vite.dev/) + [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) | App framework |
| [Recharts](https://recharts.org/) | Charts (area, bar, composed, reference lines) |
| [jsPDF](https://github.com/parallax/jsPDF) + [html2canvas](https://html2canvas.hertzen.com/) | PDF export (lazy-loaded) |
| [Vitest](https://vitest.dev/) | Unit tests (83 tests) |
| [Oxlint](https://oxc.rs/) | Linting |

---

## Getting started

Requires [Node.js](https://nodejs.org/) 18+.

```bash
# Install dependencies
npm install

# Start the dev server (hot reload) at http://localhost:5173
npm run dev

# Type-check + production build → dist/
npm run build

# Preview the production build locally
npm run preview

# Run the test suite
npm test

# Lint
npm run lint
```

---

## Project structure

```
src/
  App.tsx                   App shell: landing/app view toggle, tabs, modals
  main.tsx                  Entry point
  types.ts                  Core domain types (Apartment, LoanParams, Results, Projection, …)
  index.css                 Design tokens + global styles
  App.css                   App-specific styles

  state/
    useStore.ts             localStorage-backed state (inputs, saved deals, projection params)

  data/
    defaults.ts             Default input values
    pricesByPlz.json        Bundled €/m² & rent reference data keyed by postal code
    priceLookup.ts          Postal-code / city lookup with regional fallback

  lib/
    finance.ts              Closing costs, annuity amortization, yields, cash flow, verdict
    projection.ts           Multi-year projection, after-tax, IRR, ETF comparison
    scenarios.ts            Cautious / Base / Optimistic presets
    goalSeek.ts             Max-offer-price bisection solver
    rentVsBuy.ts            Rent vs. buy comparison
    affordability.ts        Affordability & tax impact
    tippingPoints.ts        Cash-flow positive timeline helpers
    exportPdf.ts            HTML-to-PDF infographic export
    format.ts               EUR / % / number formatters
    validate.ts             Input validation warnings
    *.test.ts               Unit tests for all lib modules

  components/
    Landing.tsx / .css      Marketing landing page with screenshot carousel
    InputForm.tsx           Left-column input form (apartment, financing, benchmark)
    ResultsPanel.tsx        Key metrics dashboard
    CashFlowBreakdown.tsx   Monthly cash-flow table (with interest/Tilgung split)
    CashFlowChart.tsx       Yearly cash-flow bar chart with break-even marker
    CashFlowTimeline.tsx    Plain-language break-even explanation
    IncomeVsOutflowChart.tsx Stacked income-vs-outflow chart
    AmortizationChart.tsx   Loan payoff area chart
    ProjectionPanel.tsx     Multi-year projection + ETF comparison
    ScenariosPanel.tsx      Cautious / Base / Optimistic table
    GoalSeekPanel.tsx       Max offer price solver
    ComparePanel.tsx        Save & compare deals
    SensitivityLab.tsx      What-if slider lab
    FinancingExplainer.tsx  Plain-language payment explainer
    PaymentSchedule.tsx     Year-by-year amortization table
    AffordabilityPanel.tsx  Affordability & tax impact
    RentVsBuyPanel.tsx      Rent vs. buy comparison
    BenchmarkPanel.tsx      Market benchmark card
    VerdictBanner.tsx       Buy / Caution / Avoid banner
    SimpleSummary.tsx       Plain-language deal summary
    AssumptionsSummary.tsx  Full assumptions transparency card
    SettingsPanel.tsx       Editable cost/tax defaults
    Glossary.tsx            Beginner glossary
    NumberField.tsx         Shared numeric input component
    InfoDot.tsx             Contextual help tooltip
    Modal.tsx               Modal wrapper

public/
  screenshots/              Auto-generated app screenshots for the landing carousel
                            (not committed — run the app to regenerate)
  manifest.webmanifest      PWA manifest
  sw.js                     Service worker (offline support)

docs/
  user-guide.html           Self-contained shareable user guide (matches app design)
```

Core financial logic lives in `src/lib/` and is covered by unit tests in the same folder.

---

## Generating landing page screenshots

The landing page carousel uses screenshots from `public/screenshots/`. These are **not committed** to the repo (see `.gitignore`). To regenerate them:

1. Start the dev server: `npm run dev`
2. Open the app in a browser that has Playwright available, navigate to each tab (`Summary`, `Key Metrics`, `Cash flow`, `Financing`, `Projection`, `Scenarios`) and screenshot the `.tab-panel` element into `public/screenshots/01-summary.png` … `06-scenarios.png`.

Or simply run the app — the carousel degrades gracefully if the images are missing (broken image slots show; no JS error).

---

## Market reference data

Area averages come from `src/data/pricesByPlz.json` — approximate figures for major German cities keyed by postal code, with a city-level fallback. They are a starting point, not a live feed: verify against a current local source, and extend the JSON to add more coverage (the lookup picks up new entries automatically). Every average is also overridable directly in the form.

---

## Privacy

There is no server and no analytics. Everything you enter — apartments, financing, saved deals — lives only in your own browser via `localStorage`. Nothing is uploaded or shared. Clearing browser data (or using the in-app reset) removes everything.

---

## Deployment

The app builds to a static `dist/` folder and can be hosted on any static host:

| Host | Notes |
|---|---|
| **Netlify / Vercel / Cloudflare Pages** | Drop the `dist/` folder or connect the repo — zero config needed. |
| **GitHub Pages** | Set `base: '/your-repo-name/'` in `vite.config.ts` before `npm run build`. |
| **Azure Static Web Apps** | Use the Vite preset; output dir is `dist`. |

---

## Disclaimer

**Not financial, investment, or tax advice.** Apartment Investment Analyzer is a personal decision-support tool. All figures are estimates based on your inputs and carry no guarantee of accuracy or completeness. Always verify with a qualified financial and tax advisor before making any purchase decision.
- The app is fully responsive and works on phones (add-to-home-screen friendly).

---

## License

Personal project — no license granted for redistribution. Use at your own risk.
