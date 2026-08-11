import React from "react";

interface Props {
  children: React.ReactNode;
  label?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Captures render errors in a subtree so a single failing message bubble
 * can no longer blank out the whole chat (the "black screen" bug).
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.label ? `:${this.props.label}` : ""}]`, error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="m-2 p-3 rounded-xl border border-red-500/40 bg-red-950/30 text-red-200 text-xs font-mono break-words">
          <div className="font-bold mb-1">
            ⚠️ Erreur de rendu {this.props.label ? `(${this.props.label})` : ""}
          </div>
          <div className="opacity-80">
            {this.state.error?.message || "Erreur inconnue"}
          </div>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="mt-2 px-2 py-1 rounded bg-red-500/20 hover:bg-red-500/40 transition-colors"
          >
            Réessayer
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
