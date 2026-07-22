import { useMemo, useState } from 'react';
import './App.css';
import { useStore } from './state/useStore';
import { computeResults } from './lib/finance';
import { computeProjection } from './lib/projection';
import { computeScenarios } from './lib/scenarios';
import { InputForm } from './components/InputForm';
import { SimpleSummary } from './components/SimpleSummary';
import { FinancingExplainer } from './components/FinancingExplainer';
import { VerdictBanner } from './components/VerdictBanner';
import { ResultsPanel } from './components/ResultsPanel';
import { CashFlowBreakdown } from './components/CashFlowBreakdown';
import { CashFlowTimeline } from './components/CashFlowTimeline';
import { CashFlowChart } from './components/CashFlowChart';
import { IncomeVsOutflowChart } from './components/IncomeVsOutflowChart';
import { BenchmarkPanel } from './components/BenchmarkPanel';
import { AssumptionsSummary } from './components/AssumptionsSummary';
import { AmortizationChart } from './components/AmortizationChart';
import { PaymentSchedule } from './components/PaymentSchedule';
import { ProjectionPanel } from './components/ProjectionPanel';
import { ScenariosPanel } from './components/ScenariosPanel';
import { GoalSeekPanel } from './components/GoalSeekPanel';
import { ComparePanel } from './components/ComparePanel';
import { RentVsBuyPanel } from './components/RentVsBuyPanel';
import { AffordabilityPanel } from './components/AffordabilityPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { SensitivityLab } from './components/SensitivityLab';
import { Modal } from './components/Modal';
import { Glossary } from './components/Glossary';
import { Landing } from './components/Landing';

type TabKey = 'summary' | 'overview' | 'cashflow' | 'financing' | 'projection' | 'scenarios' | 'compare';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'summary', label: 'Summary' },
  { key: 'overview', label: 'Key Metrics' },
  { key: 'cashflow', label: 'Cash flow' },
  { key: 'financing', label: 'Financing' },
  { key: 'projection', label: 'Projection' },
  { key: 'scenarios', label: 'Scenarios' },
  { key: 'compare', label: 'Compare' },
];

function App() {
  const store = useStore();
  const { apartment, loan, costs } = store;
  const [tab, setTab] = useState<TabKey>('summary');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [labOpen, setLabOpen] = useState(false);
  const [rentBuyOpen, setRentBuyOpen] = useState(false);
  const [affordOpen, setAffordOpen] = useState(false);
  // Show the marketing landing page first; remember the choice so a refresh
  // keeps returning visitors in whichever view they left.
  const [view, setView] = useState<'landing' | 'app'>(() => {
    try {
      return localStorage.getItem('aia-view') === 'app' ? 'app' : 'landing';
    } catch {
      return 'landing';
    }
  });

  const setViewPersisted = (next: 'landing' | 'app') => {
    setView(next);
    try {
      localStorage.setItem('aia-view', next);
    } catch {
      // ignore storage errors
    }
    if (next === 'landing') window.scrollTo(0, 0);
  };

  const results = useMemo(
    () => computeResults(apartment, loan, costs),
    [apartment, loan, costs],
  );

  const projection = useMemo(
    () => computeProjection(apartment, costs, results, store.projection),
    [apartment, costs, results, store.projection],
  );

  const scenarios = useMemo(
    () => computeScenarios(apartment, loan, costs, store.projection),
    [apartment, loan, costs, store.projection],
  );

  if (view === 'landing') {
    return <Landing onLaunch={() => setViewPersisted('app')} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <button
          className="app-header-text app-home-btn"
          onClick={() => setViewPersisted('landing')}
          aria-label="Back to the home page"
          title="Back to home"
        >
          <span className="app-home-mark" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 21h18" />
              <path d="M5 21V7l7-4 7 4v14" />
              <path d="M9 21v-6h6v6" />
            </svg>
          </span>
          <span className="app-home-copy">
            <h1>Apartment Investment Analyzer</h1>
            <p>
              <span className="app-home-hint" aria-hidden="true">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                Home
              </span>
              Is this listing a good buy? Enter the numbers, get an instant read.
            </p>
          </span>
        </button>
        <div className="app-header-actions">
          <button
            className="settings-btn"
            onClick={() => setLabOpen(true)}
            aria-label="Open the what-if sensitivity lab"
            title="What-if sensitivity lab"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="4" y1="7" x2="20" y2="7" />
              <circle cx="9" cy="7" r="2.5" />
              <line x1="4" y1="17" x2="20" y2="17" />
              <circle cx="15" cy="17" r="2.5" />
            </svg>
            <span>What-if</span>
          </button>
          <button
            className="settings-btn"
            onClick={() => setRentBuyOpen(true)}
            aria-label="Open rent vs. buy analysis"
            title="Rent vs. buy"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 7h13" />
              <path d="M13 4l3 3-3 3" />
              <path d="M21 17H8" />
              <path d="M11 14l-3 3 3 3" />
            </svg>
            <span>Rent vs Buy</span>
          </button>
          <button
            className="settings-btn"
            onClick={() => setAffordOpen(true)}
            aria-label="Open affordability and tax"
            title="Affordability & tax"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="2" y="6" width="20" height="13" rx="3" />
              <path d="M2 10h20" />
              <circle cx="17" cy="14" r="1.5" />
            </svg>
            <span>Affordability</span>
          </button>
          <button
            className="settings-btn"
            onClick={() => setGuideOpen(true)}
            aria-label="Open glossary"
            title="Glossary"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            <span>Glossary</span>
          </button>
          <button
            className="settings-btn"
            onClick={() => setSettingsOpen(true)}
            aria-label="Open settings & assumptions"
            title="Settings & assumptions"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span>Settings</span>
          </button>
          <button
            className="settings-btn export-btn"
            onClick={async () => {
              try {
                const { exportApartmentPdf } = await import('./lib/exportPdf');
                await exportApartmentPdf(apartment, loan, results, projection);
              } catch (err) {
                console.error('PDF export failed', err);
              }
            }}
            aria-label="Export a one-page PDF summary"
            title="Export PDF summary"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Export PDF</span>
          </button>
        </div>
      </header>

      <div className="disclaimer-banner" role="note">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <p>
          <strong>Not financial or tax advice.</strong> Every figure is an estimate — verify
          with a qualified advisor before making any decision.
        </p>
      </div>

      <div className="layout">
        <div className="col col-input">
          <InputForm
            apartment={apartment}
            setApartment={store.setApartment}
            loan={loan}
            setLoan={store.setLoan}
            costs={costs}
            results={results}
          />
        </div>

        <div className="col col-results">
          <VerdictBanner verdict={results.verdict} />

          <nav className="tabs" role="tablist" aria-label="Analysis sections">
            {TABS.map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                className={`tab ${tab === t.key ? 'is-active' : ''}`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </nav>

          <div className="tab-panel" role="tabpanel">
            {tab === 'summary' && (
              <div className="stack">
                <SimpleSummary
                  apartment={apartment}
                  costs={costs}
                  results={results}
                  projection={store.projection}
                />
                <GoalSeekPanel
                  apartment={apartment}
                  loan={loan}
                  costs={costs}
                  projection={store.projection}
                />
              </div>
            )}

            {tab === 'overview' && (
              <div className="stack">
                <ResultsPanel r={results} />
                <BenchmarkPanel r={results} />
                <AssumptionsSummary
                  apartment={apartment}
                  loan={loan}
                  costs={costs}
                  projection={store.projection}
                  results={results}
                />
              </div>
            )}

            {tab === 'cashflow' && (
              <div className="stack">
                <CashFlowBreakdown r={results} />
                <CashFlowChart projection={projection} r={results} />
                <IncomeVsOutflowChart projection={projection} />
                <CashFlowTimeline r={results} />
              </div>
            )}

            {tab === 'financing' && (
              <div className="stack">
                <FinancingExplainer loan={loan} r={results} />
                <AmortizationChart r={results} />
                <PaymentSchedule r={results} />
              </div>
            )}

            {tab === 'projection' && (
              <ProjectionPanel
                params={store.projection}
                setParams={store.setProjection}
                p={projection}
                apartment={apartment}
                profile={store.profile}
              />
            )}

            {tab === 'scenarios' && <ScenariosPanel scenarios={scenarios} />}

            {tab === 'compare' && (
              <ComparePanel
                current={{ apartment, loan, costs, projection: store.projection }}
                deals={store.deals}
                saveDeal={store.saveDeal}
                updateDeal={store.updateDeal}
                renameDeal={store.renameDeal}
                deleteDeal={store.deleteDeal}
                loadDeal={store.loadDeal}
                importDeals={store.importDeals}
              />
            )}
          </div>
        </div>
      </div>

      <footer className="app-footer">
        <strong>Disclaimer:</strong> Apartment Investment Analyzer is a personal decision-support
        tool — <strong>not financial, investment, or tax advice</strong>. All figures are estimates
        based on your inputs and carry no guarantee of accuracy or completeness. Always verify with a
        qualified financial and tax advisor before making any purchase decision. Your data stays in
        your browser only.
      </footer>

      {labOpen && (
        <Modal title="What-if · sensitivity lab" wide onClose={() => setLabOpen(false)}>
          <SensitivityLab
            apartment={apartment}
            loan={loan}
            costs={costs}
            projection={store.projection}
            onApply={(patch) => {
              store.setApartment(patch.apartment);
              store.setLoan(patch.loan);
              store.setCosts(patch.costs);
              store.setProjection(patch.projection);
              setLabOpen(false);
            }}
          />
        </Modal>
      )}

      {rentBuyOpen && (
        <Modal title="Rent vs. buy" wide onClose={() => setRentBuyOpen(false)}>
          <RentVsBuyPanel apartment={apartment} loan={loan} costs={costs} projection={store.projection} />
        </Modal>
      )}

      {affordOpen && (
        <Modal title="Affordability & tax" wide onClose={() => setAffordOpen(false)}>
          <AffordabilityPanel
            apartment={apartment}
            loan={loan}
            costs={costs}
            projection={store.projection}
            profile={store.profile}
            setProfile={store.setProfile}
          />
        </Modal>
      )}

      {settingsOpen && (
        <Modal title="Settings & assumptions" onClose={() => setSettingsOpen(false)}>
          <SettingsPanel costs={costs} setCosts={store.setCosts} resetAll={store.resetAll} embedded />
        </Modal>
      )}

      {guideOpen && (
        <Modal title="Glossary: what the numbers mean" onClose={() => setGuideOpen(false)}>
          <Glossary embedded />
        </Modal>
      )}
    </div>
  );
}

export default App;
