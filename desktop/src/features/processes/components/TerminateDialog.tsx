type TerminateDialogItem = {
  pid: number;
  name: string;
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
        <h2 id="terminate-dialog-title">结束该进程？</h2>
        <p className="dialog-copy">
          将结束 <strong>{item.name}</strong> ({item.pid})。如果该进程仍有未保存
          的工作内容，可能会直接丢失。
        </p>
        <div className="dialog-actions">
          <button type="button" className="secondary-button" onClick={onCancel}>
            取消
          </button>
          <button type="button" className="danger-button" onClick={onConfirm}>
            结束进程
          </button>
        </div>
      </section>
    </div>
  );
}
