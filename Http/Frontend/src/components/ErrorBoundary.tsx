import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import type { ReactNode } from 'react';

function ErrorFallback() {
  return (
    <div className="messages-empty">
      <div className="messages-empty-icon">⚠️</div>
      <div>A rendering error occurred. Please reload the page.</div>
      <button
        className="btn btn-primary"
        style={{ marginTop: '12px' }}
        onClick={() => window.location.reload()}
      >
        Reload
      </button>
    </div>
  );
}

export function ErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ReactErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, info) => console.error(error, info)}
    >
      {children}
    </ReactErrorBoundary>
  );
}
