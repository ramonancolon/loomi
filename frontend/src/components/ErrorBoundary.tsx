import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
    children: ReactNode
    fallback?: ReactNode
    onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
    hasError: boolean
    error: Error | null
}

/**
 * ErrorBoundary component for robust UI rendering
 * Catches JavaScript errors in child components and displays a fallback UI
 * instead of crashing the entire application
 */
export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    }

    public static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
        }
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        console.error('ErrorBoundary caught an error:', error, errorInfo)

        if (this.props.onError) {
            this.props.onError(error, errorInfo)
        }
    }

    public componentDidUpdate(prevProps: Props): void {
        if (this.state.hasError && this.props.children !== prevProps.children) {
            this.setState({
                hasError: false,
                error: null,
            })
        }
    }

    private handleReset = (): void => {
        this.setState({
            hasError: false,
            error: null,
        })
    }

    public render(): ReactNode {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="glass-error flex flex-col items-center justify-center text-center">
                    <div className="mb-4">
                        <svg
                            className="h-16 w-16 text-rose-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                        </svg>
                    </div>
                    <h2 className="mb-2 text-xl font-bold text-text-main">
                        Something went wrong
                    </h2>
                    <p className="mb-4 max-w-md text-text-muted">
                        {this.state.error?.message || 'An unexpected error occurred'}
                    </p>
                    {this.state.error?.stack && (
                        <details className="mb-4 max-h-40 max-w-full overflow-auto rounded-lg bg-slate-950/80 p-3 text-xs text-emerald-400">
                            <summary className="mb-2 cursor-pointer font-semibold">Error Details</summary>
                            <pre className="whitespace-pre-wrap font-mono">
                                {this.state.error.stack}
                            </pre>
                        </details>
                    )}
                    <button
                        type="button"
                        onClick={this.handleReset}
                        className="glass-btn glass-btn-secondary"
                    >
                        Try Again
                    </button>
                </div>
            )
        }

        return this.props.children
    }
}

export default ErrorBoundary
