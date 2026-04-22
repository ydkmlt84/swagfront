export function RefreshToast() {
  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="true">
      <div className="toast-banner">
        <span className="toast-icon" aria-hidden="true">
          {'\u21bb'}
        </span>
        <div className="toast-copy">
          <strong>Refresh queued</strong>
          <span>Reading SWAG configs and Docker state again.</span>
        </div>
      </div>
    </div>
  )
}
