import { useEffect, useRef, type KeyboardEvent, type ReactNode, type RefObject } from "react";

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface DialogProps {
  readonly title: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
}

export function Dialog({ title, onClose, children }: DialogProps) {
  const panelRef = useDialogPanel();
  return (
    <div className="fx-overlay" onMouseDown={onClose}>
      <DialogSurface title={title} onClose={onClose} panelRef={panelRef}>
        {children}
      </DialogSurface>
    </div>
  );
}

interface SurfaceProps {
  readonly title: string;
  readonly onClose: () => void;
  readonly panelRef: RefObject<HTMLDivElement | null>;
  readonly children: ReactNode;
}

function DialogSurface({ title, onClose, panelRef, children }: SurfaceProps) {
  return <div className="fx-dialog" role="dialog" aria-modal="true" aria-label={title}
    tabIndex={-1} ref={panelRef} onMouseDown={stopInside} onKeyDown={(event) => handleDialogKey(event, onClose)}>
    {children}
  </div>;
}

const stopInside = (event: { stopPropagation: () => void }): void => event.stopPropagation();

const useDialogPanel = (): RefObject<HTMLDivElement | null> => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => restoreFocusOnClose(ref.current), []);
  return ref;
};

const restoreFocusOnClose = (panel: HTMLDivElement | null): (() => void) => {
  const previous = document.activeElement as HTMLElement | null;
  focusFirst(panel);
  return () => previous?.focus();
};

const focusFirst = (panel: HTMLDivElement | null): void => {
  const target = panel?.querySelector<HTMLElement>(FOCUSABLE) ?? panel;
  target?.focus();
};

const handleDialogKey = (event: KeyboardEvent<HTMLDivElement>, onClose: () => void): void => {
  if (event.key === "Escape") onClose();
  if (event.key === "Tab") trapTab(event);
};

const trapTab = (event: KeyboardEvent<HTMLDivElement>): void => {
  const items = [...event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE)];
  const [first] = items;
  const last = items.at(-1);
  if (!first || !last) return;
  if (event.shiftKey && document.activeElement === first) moveFocus(event, last);
  if (!event.shiftKey && document.activeElement === last) moveFocus(event, first);
};

const moveFocus = (event: KeyboardEvent, target: HTMLElement): void => {
  event.preventDefault();
  target.focus();
};
