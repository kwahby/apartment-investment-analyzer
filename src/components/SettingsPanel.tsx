import { useState } from 'react';
import type { CostSettings } from '../types';
import { NumberField } from './NumberField';

interface SettingsPanelProps {
  costs: CostSettings;
  setCosts: (c: CostSettings) => void;
  resetAll: () => void;
  defaultOpen?: boolean;
  /** When true, render without the card wrapper and collapse toggle (for a modal). */
  embedded?: boolean;
}

export function SettingsPanel({
  costs,
  setCosts,
  resetAll,
  defaultOpen = false,
  embedded = false,
}: SettingsPanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const upC = (patch: Partial<CostSettings>) => setCosts({ ...costs, ...patch });

  return (
    <section className={embedded ? 'settings-embedded' : 'card'}>
      {!embedded && (
        <button className="collapse-toggle" onClick={() => setOpen((o) => !o)}>
          <h2>Settings &amp; assumptions</h2>
          <span>{open ? '▲' : '▼'}</span>
        </button>
      )}

      {(embedded || open) && (
        <div className="settings-body">
          <h3>Purchase costs (Kaufnebenkosten)</h3>
          <div className="grid-2">
            <NumberField
              label="Grunderwerbsteuer"
              value={costs.transferTaxPct}
              onChange={(v) => upC({ transferTaxPct: v })}
              suffix="%"
              step={0.1}
              hint="Real-estate transfer tax. Varies by Bundesland (3.5–6.5%)."
            />
            <NumberField
              label="Notar"
              value={costs.notaryPct}
              onChange={(v) => upC({ notaryPct: v })}
              suffix="%"
              step={0.1}
            />
            <NumberField
              label="Grundbuch"
              value={costs.landRegistryPct}
              onChange={(v) => upC({ landRegistryPct: v })}
              suffix="%"
              step={0.1}
            />
            <NumberField
              label="Makler (buyer share)"
              value={costs.agentCommissionPct}
              onChange={(v) => upC({ agentCommissionPct: v })}
              suffix="%"
              step={0.1}
            />
          </div>

          <h3>Running cost assumptions</h3>
          <div className="grid-2">
            <NumberField
              label="Maintenance reserve / year"
              value={costs.maintenanceReservePctPerYear}
              onChange={(v) => upC({ maintenanceReservePctPerYear: v })}
              suffix="% of price"
              step={0.1}
            />
            <NumberField
              label="Property management / month"
              value={costs.managementPerMonth}
              onChange={(v) => upC({ managementPerMonth: v })}
              suffix="€"
              step={5}
            />
            <NumberField
              label="Vacancy allowance"
              value={costs.vacancyPct}
              onChange={(v) => upC({ vacancyPct: v })}
              suffix="% of rent"
              step={0.5}
            />
          </div>

          <div className="danger-row">
            <button className="btn-danger" onClick={resetAll}>
              Reset everything to defaults
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
