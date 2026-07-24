import type { ReactNode } from "react";

export type TerminateDialogItem = {
  title: string;
  description: ReactNode;
  confirmLabel: string;
};

type TerminateDialogProps = {
  item: TerminateDialogItem | null;
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
        <p className="dialog-eyebrow">确认操作</p>
        <h2 id="terminate-dialog-title">{item.title}</h2>
        <p className="dialog-copy">{item.description}</p>
        <div className="dialog-actions">
          <button type="button" className="secondary-button" onClick={onCancel}>
            取消
          </button>
          <button type="button" className="danger-button" onClick={onConfirm}>
            {item.confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
