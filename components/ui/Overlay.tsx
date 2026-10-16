"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Shared overlay behaviour: body scroll lock, Escape handling, focus trapping
 * and focus restoration. Both the modal and the drawer sit on top of it so the
 * keyboard contract is identical everywhere.
 */
function useOverlay(open: boolean, onClose: () => void) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    restoreRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;
      const first = container.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? container).focus();
    }, 20);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const container = containerRef.current;
      if (!container) return;
      const nodes = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      restoreRef.current?.focus?.();
    };
  }, [open, onClose]);

  return containerRef;
}

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  /** Set false for destructive confirmations that require an explicit choice. */
  dismissible?: boolean;
};

const MODAL_WIDTH = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl" };

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  dismissible = true,
}: ModalProps) {
  const close = useCallback(() => {
    if (dismissible) onClose();
  }, [dismissible, onClose]);
  const ref = useOverlay(open, close);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-4">
      <div
        className="fixed inset-0 bg-navy-950/55 animate-fadeIn"
        onClick={close}
        aria-hidden="true"
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        tabIndex={-1}
        className={`relative z-10 w-full ${MODAL_WIDTH[size]} rounded-t-card border border-line bg-surface shadow-pop animate-slideUp sm:rounded-card sm:animate-fadeUp`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-navy-900">{title}</h2>
            {description && <p className="mt-1 text-sm text-muted">{description}</p>}
          </div>
          <button
            type="button"
            onClick={close}
            className="btn btn-ghost shrink-0 !min-h-9 !px-2 text-navy-400"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>
        {children && <div className="px-5 py-4">{children}</div>}
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-canvas px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onCancel,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  busy = false,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  busy?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      size="sm"
      dismissible={!busy}
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${tone === "danger" ? "btn-danger" : "btn-primary"}`}
            onClick={onConfirm}
            disabled={busy}
            aria-busy={busy || undefined}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </>
      }
    />
  );
}

export type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  side?: "left" | "right" | "bottom";
  labelledBy?: string;
};

export function Drawer({ open, onClose, title, description, children, footer, side = "right" }: DrawerProps) {
  const ref = useOverlay(open, onClose);
  if (!open) return null;

  const position =
    side === "bottom"
      ? "inset-x-0 bottom-0 max-h-[85vh] rounded-t-card border-t animate-slideUp"
      : side === "left"
        ? "left-0 top-0 h-full w-[min(360px,88vw)] border-r animate-fadeIn"
        : "right-0 top-0 h-full w-[min(400px,90vw)] border-l animate-slideInRight";

  const bodyScroll = side === "bottom" ? "max-h-[calc(85vh-9rem)]" : "h-[calc(100%-9rem)]";

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-navy-950/55 animate-fadeIn" onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={`absolute flex flex-col border-line bg-surface shadow-pop ${position}`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-navy-900">{title}</h2>
            {description && <p className="mt-1 text-sm text-muted">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost shrink-0 !min-h-9 !px-2 text-navy-400"
            aria-label="Close panel"
          >
            <X size={18} />
          </button>
        </div>
        <div className={`overflow-y-auto px-5 py-4 ${bodyScroll}`}>{children}</div>
        {footer && <div className="border-t border-line bg-canvas px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}
