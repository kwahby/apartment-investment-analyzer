import { useState } from 'react';

interface Tip {
  term: string;
  text: string;
}

const TIPS: Tip[] = [
  {
    term: 'Kaltmiete vs. Warmmiete',
    text: 'Kaltmiete is the "cold" rent for the flat only. Warmmiete adds heating/utilities. Always run your numbers on the Kaltmiete — the extras are passed through to the tenant and are not your income.',
  },
  {
    term: 'Hausgeld & "umlagefähig"',
    text: 'Hausgeld is the monthly fee to the building community (Hausverwaltung). Part of it (umlagefähig) can be charged to the tenant; the rest (e.g. management, reserve fund) is your cost as owner. Only the non-recoverable part hurts your cash flow.',
  },
  {
    term: 'Kaufnebenkosten (closing costs)',
    text: 'On top of the price you pay ~9–12%: Grunderwerbsteuer (3.5–6.5% depending on the Bundesland), notary, land registry and usually estate-agent commission. Banks rarely finance these, so you generally need them in cash on top of your down payment.',
  },
  {
    term: 'Zinsbindung & the follow-up loan (Anschlussfinanzierung)',
    text: 'A German mortgage has two clocks that don\'t match. (1) The interest rate is only locked for the fixed period (Zinsbindung) — say 10 years. (2) The loan itself takes much longer to repay — e.g. ~28 years at 2% Tilgung. So when the 10-year rate lock ends you usually still owe a big chunk (the Restschuld). You don\'t repay it all at once: you sign a new loan for the leftover — the Anschlussfinanzierung (follow-up loan) — at whatever rate applies then, and keep paying. The catch: that future rate is unknown, so if rates have risen your payment jumps. "Repay within X years" avoids this entirely — the loan is gone before the rate lock ends, so there\'s no Restschuld and no rate risk (but a higher monthly payment now). Use the "Assumed follow-up rate" field to stress-test a higher future rate.',
  },
  {
    term: 'Eigenkapital rule of thumb',
    text: 'A common guideline: cover at least the closing costs plus 10–20% of the price from your own money. Less equity means a bigger loan, higher monthly payments and worse cash flow.',
  },
  {
    term: 'Bruttomietrendite (gross yield)',
    text: 'Annual cold rent ÷ purchase price. A quick "is it worth a look" gauge. In expensive cities, 3–4% is common; 4%+ is attractive; under 3% is thin. It ignores costs, so it always looks better than reality.',
  },
  {
    term: 'Kaufpreisfaktor (price multiple)',
    text: 'How many years of cold rent equal the price (price ÷ annual rent). Lower is cheaper. Big German cities are often 28–35×. Below ~25× is considered good value; above ~30× you rely on price growth, not rent, to make money.',
  },
  {
    term: 'Cash-on-cash return',
    text: 'Your yearly cash flow after the loan ÷ the actual cash you put in (down payment + closing costs). It shows the real return on the money you tied up. Negative means you top up each month out of pocket.',
  },
  {
    term: 'Maintenance reserve (Instandhaltung)',
    text: 'Set aside money for repairs (roof, heating, your own renovations). Budgeting ~1% of the price per year is a prudent starting point, especially for older buildings.',
  },
  {
    term: 'Vacancy & rent loss (Mietausfall)',
    text: 'No flat is rented 100% of the time, and tenants occasionally don\'t pay. Reserving a few percent of rent keeps your plan realistic.',
  },
  {
    term: 'Depreciation (AfA)',
    text: 'A yearly paper deduction for the wear on the building (not the land). Usually 2%/year (buildings from 1925), or 3%/year for new builds from 2023. It lowers your taxable rental profit without costing you cash, so it boosts after-tax returns.',
  },
  {
    term: 'Sonderabschreibung (§7b)',
    text: 'An EXTRA depreciation on top of normal AfA: +5% of the building value per year for the first 4 years (up to 20% extra), which front-loads bigger tax refunds early. It ONLY applies to newly built rental housing that meets strict rules — current build window (Oct 2023–Sep 2029), Effizienzhaus 40 with QNG seal, cost caps (≤ €5,200/m², extra AfA only on the first €4,000/m²), and 10+ years of rental use. It does not interact with your mortgage interest — interest stays fully deductible either way. Used/existing flats do not qualify.',
  },
  {
    term: 'Nettomietrendite (net yield)',
    text: 'Like gross yield, but after your owner-side running costs (non-recoverable Hausgeld, maintenance reserve, management, vacancy) — before the loan. It is a more honest "what the property earns" figure than the gross yield, though still ignores financing.',
  },
  {
    term: 'Tilgung (repayment rate)',
    text: 'The share of the price you repay per year at the start, on top of interest. A German annuity keeps the monthly payment constant: as the balance shrinks, less goes to interest and more to Tilgung, so repayment speeds up over time. 2% Tilgung at ~4% takes ~28 years; raising it shortens that a lot but costs more per month now.',
  },
  {
    term: 'Sondertilgung (annual lump sum)',
    text: 'An extra one-off repayment you make each year on top of the normal payment (most German loans allow up to ~5% of the loan per year for free). It goes straight against the balance, so it cuts total interest and shortens the payoff. The Financing tab charts this (green dots) and the payment schedule shows the balance with vs. without it.',
  },
  {
    term: 'Target payoff ("repay within X years")',
    text: 'Instead of accepting whatever payoff your Tilgung implies, you set a goal — e.g. "own it in 15 years" — and the app sizes the monthly payment needed to hit it. Useful for planning around retirement or the end of the fixed-rate period.',
  },
  {
    term: 'When cash flow turns positive',
    text: 'Many rentals cost you money each month while you are paying the loan (you "top up"), then flip to putting money in your pocket once the loan is gone or rents rise enough. The app shows when that flip happens and the total you top up until then — a key patience check.',
  },
  {
    term: 'After-tax view (German income tax)',
    text: 'Turn this on (Projection tab) to model tax. Rental profit is taxed at your marginal rate; rental losses reduce your other taxable income. Deductions include loan interest (not principal) and depreciation (AfA). You set your marginal rate and the building share of the price (only the building depreciates, not the land).',
  },
  {
    term: 'IRR (annualized return)',
    text: 'The internal rate of return rolls everything — your cash in, the yearly rental cash flows, loan paydown and the final sale — into one yearly % return on your money. It is the fairest single number to compare against other investments (e.g. an ETF at ~6–8%).',
  },
  {
    term: 'Money multiple',
    text: 'Total cash you get back (all rental cash flows + net sale proceeds) ÷ the cash you put in. 2× means you doubled your money over the whole holding period. Simple, but ignores timing (that is what IRR captures).',
  },
  {
    term: 'Spekulationssteuer (10-year rule)',
    text: 'Sell a rental within 10 years of buying and the profit on the sale is taxable at your income-tax rate. Hold for 10+ years and that gain is tax-free. Note: any depreciation (AfA) you claimed is added back into the taxable gain if you sell inside the 10 years.',
  },
  {
    term: 'Property vs. ETF (opportunity cost)',
    text: 'The real question is not "does the flat make money?" but "does it beat just investing the same cash?". This comparison (Projection tab) commits the SAME money to both paths — your down payment plus every monthly top-up — and shows end-of-hold wealth from the flat (sale proceeds + reinvested surpluses) vs. the same cash compounded in an ETF. It answers whether the effort of a property is worth it at all.',
  },
  {
    term: 'Market benchmark (€/m² & location score)',
    text: 'The app compares this listing\'s price and rent per m² against a local area average, so you can see if it is priced above or below market. Look it up by postal code or city to auto-fill the averages (approximate reference data — verify locally), or type your own. The location score (0–10) is your subjective take on the spot and feeds the overall verdict.',
  },
  {
    term: 'Scenarios (Cautious / Base / Optimistic)',
    text: 'Your result rests on assumptions no one can be sure of. The Scenarios tab stress-tests them: Cautious nudges rent down and rates/vacancy up; Optimistic does the reverse. If the deal only works in the Optimistic case, that is a warning sign.',
  },
  {
    term: 'Max offer price (goal-seek)',
    text: 'In the Summary tab you can pick a target — break-even monthly cash flow, or a gross/net yield or IRR — and the app solves for the HIGHEST price you could pay and still hit it (keeping rent, rates and your down payment fixed). It is a ready-made negotiation ceiling: it tells you whether your price already qualifies, or how far you\'d need to talk the seller down.',
  },
  {
    term: 'Save & compare deals',
    text: 'The Compare tab lets you snapshot the current inputs as a named deal and line several listings up side by side — verdict, yield, cash flow, IRR, profit and more — with the best value in each row flagged. Everything is stored only on your device. Use "Load" to pull a saved deal back into the inputs.',
  },
  {
    term: 'What-if sensitivity lab',
    text: 'The "What-if" button (top bar) opens a playground of sliders — price, rent, interest rate, vacancy, appreciation, rent growth. Drag them and the verdict, cash flow, yield, IRR and vs-ETF update live, with arrows showing the change against your current numbers. Nothing is saved unless you hit "Apply to inputs". Great for finding how far a number can move before the verdict flips.',
  },
  {
    term: 'Tipping points (where the verdict flips)',
    text: 'Inside the What-if lab, this shows how far each big lever can move before the verdict downgrades — e.g. "interest rate up to 5.8% → Caution". It answers "what would have to go wrong for this to stop being a good deal?" and pinpoints your margin of safety.',
  },
  {
    term: 'Renovation / CapEx',
    text: 'For fixer-uppers: enter an upfront renovation budget (paid in cash, so it raises your total invested and lifts the sale cost basis) and the value it adds (which raises equity, appreciation and the eventual sale price). If the works also raise the achievable rent, enter that higher rent in "Monthly cold rent".',
  },
  {
    term: 'Rent vs. buy (living in it yourself)',
    text: 'A separate question from renting the flat out: is it better to BUY a home to live in, or RENT an equivalent one and invest your cash? Both households spend the same on housing; the cheaper option invests the difference at your ETF return, and the renter also invests the down payment. The Rent vs Buy tab shows end wealth for each path and the year buying pulls ahead. Renting usually looks better early (you skip the big upfront costs) and buying catches up over time.',
  },
  {
    term: 'Affordability & tax',
    text: 'The "Affordability" button (top bar) uses your net salary, monthly expenses and savings to check whether you can carry this investment: it compares the monthly top-up the flat needs against your free cash, and your savings against the upfront cost. It also estimates your yearly tax impact — early years usually give money back (depreciation + interest create a paper loss), later years cost tax — at your marginal rate plus church tax. Tax class and children are captured for context; the real driver is your marginal rate.',
  },
  {
    term: 'Watch-outs a beginner misses',
    text: 'Erbbaurecht (leasehold land — you don\'t own the ground), high or rising Hausgeld, low reserve fund, Sanierungsstau (deferred repairs), Milieuschutz/rent caps, energy class of the building, and whether it\'s currently rented (you may not be able to move in or raise rent).',
  },
];

export function Glossary({ defaultOpen = false, embedded = false }: { defaultOpen?: boolean; embedded?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={embedded ? 'settings-embedded' : 'card'}>
      {!embedded && (
        <button className="collapse-toggle" onClick={() => setOpen((o) => !o)}>
          <h2>Glossary: what the numbers mean</h2>
          <span>{open ? '▲' : '▼'}</span>
        </button>
      )}
      {(embedded || open) && (
        <div className="glossary-body">
          {TIPS.map((t) => (
            <div className="glossary-item" key={t.term}>
              <div className="glossary-term">{t.term}</div>
              <div className="glossary-text">{t.text}</div>
            </div>
          ))}
          <p className="muted small glossary-disclaimer">
            This tool gives rough estimates to help you compare listings — it is
            not tax or financial advice. Numbers here ignore income tax and
            depreciation (AfA). For a real purchase, confirm figures with the
            Teilungserklärung, the last owners' meeting minutes, the reserve fund
            balance, and ideally a tax advisor and your bank.
          </p>
        </div>
      )}
    </section>
  );
}
