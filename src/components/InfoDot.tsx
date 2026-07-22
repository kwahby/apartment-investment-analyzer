import { useId } from 'react';

/**
 * A small ⓘ marker that reveals a popup box on hover or keyboard focus and
 * hides it as soon as the pointer/focus leaves. Pure CSS visibility via the
 * .infodot :hover / :focus-within selectors.
 */
export function InfoDot({ text, label }: { text: string; label?: string }) {
  const id = useId();
  return (
    <span className="infodot" tabIndex={0} role="button" aria-describedby={id} aria-label={label ?? 'More info'}>
      <span className="infodot-icon" aria-hidden="true">ⓘ</span>
      <span className="infodot-popup" role="tooltip" id={id}>
        {text}
      </span>
    </span>
  );
}
