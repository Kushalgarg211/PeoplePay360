import { Component, type ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { Topbar } from './Topbar';

class PageErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="py-16 text-center max-w-lg mx-auto">
          <p className="text-5xl font-bold text-red-200 mb-3">Error</p>
          <h1 className="text-lg font-semibold text-slate-800 mb-2">Something went wrong on this page</h1>
          <p className="text-sm text-slate-500 mb-4 font-mono bg-slate-100 rounded-md p-3 text-left break-all">
            {this.state.error.message}
          </p>
          <button
            className="btn-primary"
            onClick={() => { this.setState({ error: null }); window.location.href = '/'; }}
          >
            Go Home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Topbar />
      <main className="pt-14 min-h-screen">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-5">
          <PageErrorBoundary>
            <Outlet />
          </PageErrorBoundary>
        </div>
      </main>
    </div>
  );
}
