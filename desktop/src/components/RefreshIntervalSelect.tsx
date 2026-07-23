import { useEffect, useId, useRef, useState } from "react";
import type { AutoRefreshIntervalMs } from "@/features/processes/refresh-policy";

type RefreshIntervalSelectProps = {
  options: readonly AutoRefreshIntervalMs[];
  value: AutoRefreshIntervalMs;
  formatLabel: (intervalMs: AutoRefreshIntervalMs) => string;
  onChange: (intervalMs: AutoRefreshIntervalMs) => void;
};

export function RefreshIntervalSelect(props: RefreshIntervalSelectProps) {
  const { options, value, formatLabel, onChange } = props;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listboxId = useId();

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={`refresh-interval-select ${open ? "is-open" : ""}`}
    >
      <button
        type="button"
        className="refresh-interval-select__trigger"
        aria-label="自动刷新间隔"
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{formatLabel(value)}</span>
        <span className="refresh-interval-select__chevron" aria-hidden="true" />
      </button>

      {open ? (
        <div className="refresh-interval-select__menu" role="presentation">
          <div
            id={listboxId}
            className="refresh-interval-select__listbox"
            role="listbox"
            aria-label="自动刷新间隔选项"
          >
            {options.map((intervalMs) => {
              const active = intervalMs === value;

              return (
                <button
                  key={intervalMs}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`refresh-interval-select__option ${
                    active ? "is-active" : ""
                  }`}
                  onClick={() => {
                    onChange(intervalMs);
                    setOpen(false);
                  }}
                >
                  {formatLabel(intervalMs)}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
