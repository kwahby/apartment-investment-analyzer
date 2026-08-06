import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * A small ⓘ marker that reveals a popup box on hover or keyboard focus and
 * hides it as soon as the pointer/focus leaves. Pure CSS visibility via the
 * .infodot :hover / :focus-within selectors.
 */
export function InfoDot({ text, label }: { text: string; label?: string }) {
  const id = useId();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });

  const updatePosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const halfPopupWidth = Math.min(130, Math.max(90, window.innerWidth / 2 - 12));
    setPosition({
      left: Math.min(window.innerWidth - halfPopupWidth, Math.max(halfPopupWidth, rect.left + rect.width / 2)),
      top: rect.top - 8,
    });
  };

  const show = () => {
    updatePosition();
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const reposition = () => updatePosition();
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [open]);

  return (
    <>
      <span
        className="infodot"
        ref={triggerRef}
        tabIndex={0}
        role="button"
        aria-describedby={id}
        aria-label={label ?? 'More info'}
        onMouseEnter={show}
        onMouseLeave={() => setOpen(false)}
        onFocus={show}
        onBlur={() => setOpen(false)}
      >
        <span className="infodot-icon" aria-hidden="true">ⓘ</span>
      </span>
      {open && createPortal(
        <span
          className="infodot-popup infodot-popup-portal"
          role="tooltip"
          id={id}
          style={{ left: position.left, top: position.top }}
        >
          {text}
        </span>,
        document.body,
      )}
    </>
  );
}
