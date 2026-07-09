import { useEffect, useRef } from "react";
import { dangerButtonClass, secondaryButtonClass } from "../lib/styles";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Native <dialog> gives us modal focus handling and Escape-to-close for free. */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-dialog-title"
      onClose={onCancel}
      className="m-auto w-full max-w-md rounded-lg p-6 shadow-xl backdrop:bg-slate-900/50"
    >
      <h2 id="confirm-dialog-title" className="text-lg font-semibold text-slate-900">
        {title}
      </h2>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onCancel} className={secondaryButtonClass} disabled={busy}>
          Cancel
        </button>
        <button type="button" onClick={onConfirm} className={dangerButtonClass} disabled={busy}>
          {busy ? "Deleting…" : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
