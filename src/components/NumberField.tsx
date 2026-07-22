import { useEffect, useRef, useState, type ReactNode } from 'react';
import { InfoDot } from './InfoDot';
import { formatGroup } from '../lib/format';

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  step?: number;
  min?: number;
  max?: number;
  hint?: string;
  /** Group thousands with commas for readability (e.g. 250,000). Off for years. */
  grouping?: boolean;
  /** Optional control rendered at the right end of the label row (e.g. a unit toggle). */
  adornment?: ReactNode;
  /** Optional small content rendered under the input (e.g. a suggestion + "Use" button). */
  footer?: ReactNode;
}

/** Labeled numeric input that emits parsed numbers and shows grouped thousands. */
export function NumberField({
  label,
  value,
  onChange,
  suffix,
  hint,
  grouping = true,
  adornment,
  footer,
}: NumberFieldProps) {
  // While editing we keep a raw text buffer (no separators) so typing/backspace is
  // simple and the field can sit empty ("", "-", ".") without snapping back to 0.
  // When not focused we show a grouped, readable value.
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState<string>(Number.isFinite(value) ? String(value) : '');
  const focusedRef = useRef(false);

  // Sync from the outside only when the user isn't actively editing.
  useEffect(() => {
    if (!focusedRef.current) {
      setText(Number.isFinite(value) ? String(value) : '');
    }
  }, [value]);

  const display = focused
    ? text
    : grouping && Number.isFinite(value)
      ? formatGroup(value)
      : Number.isFinite(value)
        ? String(value)
        : '';

  return (
    <label className="field">
      <span className="field-label">
        {label}
        {hint && <InfoDot text={hint} label={`About: ${label}`} />}
        {adornment && <span className="field-label-adornment">{adornment}</span>}
      </span>
      <span className="field-input">
        <input
          type="text"
          inputMode="decimal"
          value={display}
          onFocus={() => {
            focusedRef.current = true;
            setText(Number.isFinite(value) ? String(value) : '');
            setFocused(true);
          }}
          onBlur={() => {
            focusedRef.current = false;
            setFocused(false);
            const parsed = text === '' || text === '-' || text === '.' ? 0 : Number(text);
            const final = Number.isNaN(parsed) ? 0 : parsed;
            setText(String(final));
            onChange(final);
          }}
          onChange={(e) => {
            // Strip grouping separators and spaces the user might paste in.
            const raw = e.target.value.replace(/[,\s]/g, '');
            setText(raw);
            if (raw === '' || raw === '-' || raw === '.') {
              onChange(0);
              return;
            }
            const parsed = Number(raw);
            if (!Number.isNaN(parsed)) onChange(parsed);
          }}
        />
        {suffix && <span className="field-suffix">{suffix}</span>}
      </span>
      {footer && <span className="field-footer">{footer}</span>}
    </label>
  );
}

