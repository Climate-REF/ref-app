import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { ErrorFallback } from "./errorFallback";

/** What a fallback gets to show the error and to try again. */
export interface FallbackProps {
  error?: Error;
  /** Render the children again, fetching any failed query anew */
  reset: () => void;
}

interface Props {
  children: ReactNode;
  /** Shown instead of the children after an error; a function gets `reset` to try again */
  fallback?: ReactNode | ((props: FallbackProps) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** The error is cleared when any of these change, such as the path when navigating away */
  resetKeys?: ReadonlyArray<unknown>;
}

interface InnerProps extends Props {
  onReset: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

const keysChanged = (
  previous: ReadonlyArray<unknown> = [],
  next: ReadonlyArray<unknown> = [],
) =>
  previous.length !== next.length ||
  previous.some((key, index) => !Object.is(key, next[index]));

class ErrorBoundaryInner extends Component<InnerProps, State> {
  constructor(props: InnerProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to console in development
    if (import.meta.env.DEV) {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: InnerProps) {
    if (
      this.state.hasError &&
      keysChanged(prevProps.resetKeys, this.props.resetKeys)
    ) {
      this.reset();
    }
  }

  reset = () => {
    // Without this, a query that failed would throw its cached error again
    this.props.onReset();
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }
    const { fallback } = this.props;
    if (typeof fallback === "function") {
      return fallback({ error: this.state.error, reset: this.reset });
    }
    return (
      fallback ?? (
        <ErrorFallback error={this.state.error} resetError={this.reset} />
      )
    );
  }
}

/**
 * Shows a fallback instead of its children when they throw
 *
 * Trying again from the fallback renders the children anew and fetches the queries that failed,
 * so recovering does not need a page reload.
 */
export function ErrorBoundary(props: Props) {
  const { reset } = useQueryErrorResetBoundary();
  return <ErrorBoundaryInner {...props} onReset={reset} />;
}
