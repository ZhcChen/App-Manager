import { useEffect, useState } from "react";
import { AlertIcon, SuccessIcon } from "./icons";
import type { TransientFeedback } from "./feedback";

const TOAST_ENTER_DELAY_MS = 16;
const TOAST_AUTO_HIDE_MS = 2600;
const TOAST_EXIT_MS = 220;

type TransientToastProps = {
  item: TransientFeedback | null;
  onClear: (feedbackId: number) => void;
};

export function TransientToast(props: TransientToastProps) {
  const { item, onClear } = props;
  const [renderedItem, setRenderedItem] = useState<TransientFeedback | null>(
    item
  );
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!item) {
      setVisible(false);
      setRenderedItem(null);
      return undefined;
    }

    setRenderedItem(item);
    setVisible(false);

    const enterTimer = window.setTimeout(() => {
      setVisible(true);
    }, TOAST_ENTER_DELAY_MS);

    const hideTimer = window.setTimeout(() => {
      setVisible(false);
    }, TOAST_AUTO_HIDE_MS);

    const clearTimer = window.setTimeout(() => {
      onClear(item.id);
    }, TOAST_AUTO_HIDE_MS + TOAST_EXIT_MS);

    return () => {
      window.clearTimeout(enterTimer);
      window.clearTimeout(hideTimer);
      window.clearTimeout(clearTimer);
    };
  }, [item, onClear]);

  if (!renderedItem) {
    return null;
  }

  const role = renderedItem.tone === "error" ? "alert" : "status";
  const LiveIcon = renderedItem.tone === "error" ? AlertIcon : SuccessIcon;

  return (
    <div className={`toast-region ${visible ? "is-visible" : "is-hidden"}`}>
      <section
        className={`toast-card toast-card--${renderedItem.tone}`}
        role={role}
        aria-live={renderedItem.tone === "error" ? "assertive" : "polite"}
      >
        <span className="toast-card__icon" aria-hidden="true">
          <LiveIcon />
        </span>
        <div className="toast-card__content">
          <p className="toast-card__title">{renderedItem.title}</p>
          <p className="toast-card__copy">{renderedItem.message}</p>
        </div>
      </section>
    </div>
  );
}
