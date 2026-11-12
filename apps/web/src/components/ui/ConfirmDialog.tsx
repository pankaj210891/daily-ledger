import { useEffect, useRef } from "react";

export function ConfirmDialog({ title, description, confirmLabel = "Confirm", busy = false, error, onConfirm, onCancel }: {
  title: string;
  description: string;
  confirmLabel?: string;
  busy?: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const busyRef = useRef(busy), cancelRef = useRef(onCancel);
  busyRef.current = busy; cancelRef.current = onCancel;
  useEffect(() => {
    const dialog = dialogRef.current;
    const previous = document.activeElement as HTMLElement | null;
    dialog?.querySelector<HTMLElement>("button")?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busyRef.current) { event.preventDefault(); cancelRef.current(); return; }
      if (event.key !== "Tab" || !dialog) return;
      const items = [...dialog.querySelectorAll<HTMLElement>("button:not(:disabled)")];
      if (!items.length) return;
      if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0].focus(); }
    };
    dialog?.addEventListener("keydown", onKeyDown);
    return () => { dialog?.removeEventListener("keydown", onKeyDown); if (previous?.isConnected) previous.focus(); };
  }, []);

  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onCancel(); }}>
    <section ref={dialogRef} className="quick-modal confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-description">
      <div className="modal-heading"><div><span className="eyebrow">PLEASE CONFIRM</span><h2 id="confirm-dialog-title">{title}</h2></div></div>
      <p id="confirm-dialog-description">{description}</p>
      {error&&<div className="form-error" role="alert">{error}</div>}
      <div className="form-actions"><button type="button" className="button button-secondary" disabled={busy} onClick={onCancel}>Cancel</button><button type="button" className="button button-primary" disabled={busy} onClick={onConfirm}>{busy?"Saving…":confirmLabel}</button></div>
    </section>
  </div>;
}
