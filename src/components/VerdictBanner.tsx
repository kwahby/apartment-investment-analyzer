import type { Results } from '../types';

export function VerdictBanner({ verdict }: { verdict: Results['verdict'] }) {
  const cls = verdict.label.toLowerCase(); // buy | caution | avoid
  return (
    <section className={`verdict verdict-${cls}`}>
      <div className="verdict-main">
        <span className="verdict-label">{verdict.label}</span>
        <span className="verdict-score">{verdict.score}/100</span>
      </div>
      <ul className="verdict-reasons">
        {verdict.reasons.map((r, i) => (
          <li key={i}>{r}</li>
        ))}
      </ul>
    </section>
  );
}
