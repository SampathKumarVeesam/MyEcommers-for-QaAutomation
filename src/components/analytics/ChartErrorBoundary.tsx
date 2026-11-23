import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ChartErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ChartErrorBoundary] Caught chart rendering error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-blue-500/30 text-center space-y-3 my-4">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center">
            <AlertCircle className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-white">
            {this.props.fallbackTitle || 'Visualization Temporarily Unavailable'}
          </h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {this.props.fallbackMessage || this.state.error?.message || 'Chart failed to render due to a layout or data dimension mismatch.'}
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="px-4 py-2 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 text-cyan-300 border border-cyan-400/40 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Visualization</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
