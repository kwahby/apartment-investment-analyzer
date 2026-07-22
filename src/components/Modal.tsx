import { useEffect, useRef, type ReactNode } from 'react';

interface ModalProps {
  title: string;
  onClose: () => void;
  wide?: boolean;
  children: ReactNode;
}

/** Accessible modal: ESC to close, focus trap, restores focus, locks body scroll. */
export function Modal({ title, onClose, wide, children }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const prevFocus = useRef<HTMLElement | null>(null);

  // Keep the latest onClose without making the mount effect re-run every render
  // (a new inline onClose each render would otherwise fire the cleanup and steal
  // focus out of any focused input on every keystroke).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    prevFocus.current = document.activeElement as HTMLElement;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key === 'Tab' && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input:not([disabled]), select, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Focus the panel on open — preventScroll so a tall modal doesn't start
    // scrolled down (the browser would otherwise scroll the focused element into view).
    requestAnimationFrame(() => panelRef.current?.focus({ preventScroll: true }));

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus.current?.focus?.();
    };
  }, []);

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div
        className={`modal ${wide ? 'modal-wide' : ''}`}
        ref={panelRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose} aria-label={`Close ${title}`}>
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
