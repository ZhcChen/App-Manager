import type { ProcessItem } from "../types";

type TerminateDialogProps = {
  item: ProcessItem | null;
  onCancel: () => void;
  onConfirm: () => void;
};

export function TerminateDialog(props: TerminateDialogProps) {
  const { item, onCancel, onConfirm } = props;

  if (!item) {
    return null;
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <section
        aria-modal="true"
        aria-labelledby="terminate-dialog-title"
        className="dialog"
        role="dialog"
      >
        <p className="dialog-eyebrow">Confirm action</p>
        <h2 id="terminate-dialog-title">End process?</h2>
        <p className="dialog-copy">
          <strong>{item.name}</strong> ({item.pid}) will be terminated. Unsaved
          work may be lost.
        </p>
        <div className="dialog-actions">
          <button type="button" className="secondary-button" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="danger-button" onClick={onConfirm}>
            End app
          </button>
        </div>
      </section>
    </div>
  );
}
