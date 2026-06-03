import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ErrorBoundary } from '../components/ErrorBoundary'

describe('ErrorBoundary', () => {
    it('renders children when no error occurs', () => {
        render(
            <ErrorBoundary>
                <div data-testid="test-child">Hello World</div>
            </ErrorBoundary>
        )
        expect(screen.getByTestId('test-child')).toBeInTheDocument()
        expect(screen.getByText('Hello World')).toBeInTheDocument()
    })

    it('catches errors in child components', () => {
        const ThrowingComponent = () => {
            throw new Error('Test error')
        }

        render(
            <ErrorBoundary>
                <ThrowingComponent />
            </ErrorBoundary>
        )

        expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('displays custom fallback when provided', () => {
        const customFallback = (
            <div data-testid="custom-fallback">Custom Error Message</div>
        )

        const ThrowingComponent = () => {
            throw new Error('Test error')
        }

        render(
            <ErrorBoundary fallback={customFallback}>
                <ThrowingComponent />
            </ErrorBoundary>
        )

        expect(screen.getByTestId('custom-fallback')).toBeInTheDocument()
        expect(screen.getByText('Custom Error Message')).toBeInTheDocument()
    })

    it('calls onError callback when error occurs', () => {
        const onError = vi.fn()

        const ThrowingComponent = () => {
            throw new Error('Test error')
        }

        render(
            <ErrorBoundary onError={onError}>
                <ThrowingComponent />
            </ErrorBoundary>
        )

        expect(onError).toHaveBeenCalled()
        const [error, errorInfo] = onError.mock.calls[0]
        expect(error.message).toBe('Test error')
        expect(errorInfo).toBeDefined()
    })

    it('allows reset after error', () => {
        const ThrowingComponent = () => {
            throw new Error('Test error')
        }

        const { rerender, getByText, queryByText } = render(
            <ErrorBoundary>
                <ThrowingComponent />
            </ErrorBoundary>
        )

        expect(getByText('Something went wrong')).toBeInTheDocument()

        // Simulate reset
        rerender(
            <ErrorBoundary>
                <div data-testid="reset-child">Content After Reset</div>
            </ErrorBoundary>
        )

        expect(queryByText('Something went wrong')).not.toBeInTheDocument()
        expect(screen.getByTestId('reset-child')).toBeInTheDocument()
    })

    it('displays error message in fallback', () => {
        const ThrowingComponent = () => {
            throw new Error('Network request failed')
        }

        render(
            <ErrorBoundary>
                <ThrowingComponent />
            </ErrorBoundary>
        )

        expect(screen.getByText('Network request failed')).toBeInTheDocument()
    })

    it('displays error details in expandable section', () => {
        const ThrowingComponent = () => {
            throw new Error('Test error with stack trace')
        }

        render(
            <ErrorBoundary>
                <ThrowingComponent />
            </ErrorBoundary>
        )

        // Check that error details section exists
        expect(screen.getByText('Error Details')).toBeInTheDocument()
    })

    it('handles malformed UI component code gracefully', () => {
        // Simulate malformed JSX that would cause a runtime error
        const MalformedComponent = () => {
            // This would throw if we tried to use invalid JSX
            throw new Error('Invalid JSX syntax')
        }

        render(
            <ErrorBoundary>
                <MalformedComponent />
            </ErrorBoundary>
        )

        expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })
})
