import { useEffect, useRef, type KeyboardEvent, type ReactNode, type RefObject } from "react";

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type DialogVariant = "modal" | "page" | "popup" | "wide";

interface DialogProps {
  readonly title: string;
  readonly onClose: () => void;
  readonly variant?: DialogVariant;
  readonly children: ReactNode;
}

export function Dialog({ title, onClose, variant = "modal", children }: DialogProps) {
  const panelRef = useDialogPanel();
  return (
    <div className={overlayClass(variant)} onMouseDown={onClose}>
      <DialogSurface title={title} onClose={onClose} panelRef={panelRef} variant={variant}>
        {children}
      </DialogSurface>
    </div>
  );
}

const overlayClass = (variant: DialogVariant): string =>
  variant === "page" ? "fx-search-overlay" : variant === "popup" ? "fx-search-popup-overlay" :
    variant === "wide" ? "fx-modal-overlay" : "fx-overlay";

const surfaceClass = (variant: DialogVariant): string =>
  variant === "page" ? "fx-search-page" : variant === "popup" ? "fx-search-popup" :
    variant === "wide" ? "fx-wide-modal" : "fx-dialog";

interface SurfaceProps {
  readonly title: string;
  readonly onClose: () => void;
  readonly panelRef: RefObject<HTMLDivElement | null>;
  readonly variant: DialogVariant;
  readonly children: ReactNode;
}

function DialogSurface({ title, onClose, panelRef, variant, children }: SurfaceProps) {
  return <div className={surfaceClass(variant)} role="dialog" aria-modal="true" aria-label={title}
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
