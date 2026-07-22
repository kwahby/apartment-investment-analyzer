import { useEffect, useState } from 'react';
import type { Apartment, CostSettings, LoanParams, ProjectionParams, Profile, SavedDeal } from '../types';
import {
  DEFAULT_APARTMENT,
  DEFAULT_COST_SETTINGS,
  DEFAULT_LOAN,
  DEFAULT_PROJECTION,
  DEFAULT_PROFILE,
} from '../data/defaults';

const STORAGE_KEY = 'apartment-analyzer:v2';

interface PersistedState {
  apartment: Apartment;
  loan: LoanParams;
  costs: CostSettings;
  projection: ProjectionParams;
  profile: Profile;
  deals: SavedDeal[];
}

function loadState(): PersistedState {
  const fallback: PersistedState = {
    apartment: DEFAULT_APARTMENT,
    loan: DEFAULT_LOAN,
    costs: DEFAULT_COST_SETTINGS,
    projection: DEFAULT_PROJECTION,
    profile: DEFAULT_PROFILE,
    deals: [],
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return {
      apartment: { ...fallback.apartment, ...parsed.apartment },
      loan: { ...fallback.loan, ...parsed.loan },
      costs: { ...fallback.costs, ...parsed.costs },
      projection: { ...fallback.projection, ...parsed.projection },
      profile: { ...fallback.profile, ...parsed.profile },
      deals: Array.isArray(parsed.deals) ? parsed.deals : [],
    };
  } catch {
    return fallback;
  }
}

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `d-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

export function useStore() {
  const initial = loadState();
  const [apartment, setApartment] = useState<Apartment>(initial.apartment);
  const [loan, setLoan] = useState<LoanParams>(initial.loan);
  const [costs, setCosts] = useState<CostSettings>(initial.costs);
  const [projection, setProjection] = useState<ProjectionParams>(initial.projection);
  const [profile, setProfile] = useState<Profile>(initial.profile);
  const [deals, setDeals] = useState<SavedDeal[]>(initial.deals);

  useEffect(() => {
    const state: PersistedState = { apartment, loan, costs, projection, profile, deals };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore quota / privacy-mode errors
    }
  }, [apartment, loan, costs, projection, profile, deals]);

  function resetAll() {
    setApartment(DEFAULT_APARTMENT);
    setLoan(DEFAULT_LOAN);
    setCosts(DEFAULT_COST_SETTINGS);
    setProjection(DEFAULT_PROJECTION);
  }

  /** Snapshot the current inputs as a new saved deal. */
  function saveDeal(name: string) {
    const deal: SavedDeal = {
      id: newId(),
      name: name.trim() || apartment.title?.trim() || 'Untitled deal',
      savedAt: Date.now(),
      apartment,
      loan,
      costs,
      projection,
    };
    setDeals((ds) => [...ds, deal]);
  }

  /** Overwrite an existing deal's snapshot with the current inputs. */
  function updateDeal(id: string) {
    setDeals((ds) =>
      ds.map((d) =>
        d.id === id ? { ...d, savedAt: Date.now(), apartment, loan, costs, projection } : d,
      ),
    );
  }

  function renameDeal(id: string, name: string) {
    setDeals((ds) => ds.map((d) => (d.id === id ? { ...d, name: name.trim() || d.name } : d)));
  }

  function deleteDeal(id: string) {
    setDeals((ds) => ds.filter((d) => d.id !== id));
  }

  /** Load a saved deal into the current inputs. */
  function loadDeal(id: string) {
    const d = deals.find((x) => x.id === id);
    if (!d) return;
    setApartment(d.apartment);
    setLoan(d.loan);
    setCosts(d.costs);
    setProjection(d.projection);
  }

  /** Import deals from a backup file. Fresh ids avoid collisions. */
  function importDeals(incoming: SavedDeal[], replace: boolean) {
    const withIds = incoming.map((d) => ({ ...d, id: newId() }));
    setDeals((ds) => (replace ? withIds : [...ds, ...withIds]));
  }

  return {
    apartment,
    setApartment,
    loan,
    setLoan,
    costs,
    setCosts,
    projection,
    setProjection,
    profile,
    setProfile,
    deals,
    saveDeal,
    updateDeal,
    renameDeal,
    deleteDeal,
    loadDeal,
    importDeals,
    resetAll,
  };
}
