import type { ProcessApiError, ProcessItem } from "../types";
import {
  canTerminateProcess,
  getTerminateActionLabel
} from "../guards";

type ProcessListProps = {
  items: ProcessItem[];
  error: ProcessApiError | null;
  isLoading: boolean;
  terminatingPid: number | null;
  onTerminate: (item: ProcessItem) => void;
};

const statusLabel: Record<ProcessItem["status"], string> = {
  running: "Running",
  protected: "Protected"
};

export function ProcessList(props: ProcessListProps) {
  const { items, error, isLoading, terminatingPid, onTerminate } = props;

  if (isLoading) {
    return (
      <div className="empty-state" role="status">
        <h3>Loading processes</h3>
        <p>Preparing the current process list for this desktop session.</p>
      </div>
    );
  }

  if (!items.length && error) {
    return (
      <div className="empty-state empty-state--error" role="alert">
        <h3>Failed to load processes</h3>
        <p>{error.message}</p>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="empty-state" role="status">
        <h3>No matching process</h3>
        <p>Try another search term or refresh the process list.</p>
      </div>
    );
  }

  return (
    <div className="process-list" role="table" aria-label="Running processes">
      <div className="process-list__head" role="row">
        <span>Name</span>
        <span>PID</span>
        <span>Status</span>
        <span>Action</span>
      </div>

      {items.map((item) => (
        <article className="process-row" key={item.pid} role="row">
          <div className="process-row__identity">
            <div className="process-row__icon" aria-hidden="true">
              {item.name.slice(0, 1)}
            </div>
            <div>
              <h3>{item.name}</h3>
              <p>{item.path}</p>
            </div>
          </div>

          <span className="process-row__pid">{item.pid}</span>

          <span className={`status-badge status-badge--${item.status}`}>
            {statusLabel[item.status]}
          </span>

          <button
            className="terminate-button"
            type="button"
            disabled={
              !canTerminateProcess(item) || terminatingPid === item.pid
            }
            onClick={() => onTerminate(item)}
          >
            {getTerminateActionLabel(item, terminatingPid)}
          </button>
        </article>
      ))}
    </div>
  );
}
