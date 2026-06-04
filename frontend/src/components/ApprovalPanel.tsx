'use client'

import { StructuredCopyPreview } from './StructuredCopyPreview'

export interface ApprovalPanelProps {
    onApprove: () => void
    onRerollPreview: () => void
    rerollingPreview: boolean
    strategyCopyPreview: string
    strategyEvidence: string[]
    usedDemoFallback?: boolean
    mcpConnected?: boolean
    mcpToolsInvoked?: boolean
}

export function ApprovalPanel({
    onApprove,
    onRerollPreview,
    rerollingPreview,
    strategyCopyPreview,
    strategyEvidence,
    usedDemoFallback,
    mcpConnected,
    mcpToolsInvoked,
}: ApprovalPanelProps) {
    return (
        <div className="callout-info animate-fade-in shrink-0">
            <div className="flex items-start gap-4">
                <div className="shrink-0 rounded-full bg-primary-theme/15 p-3 text-primary-theme">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className="mb-2 text-lg font-bold text-text-main">Agent Strategy Recommendation Ready</h3>
                    <p className="mb-2 text-text-muted">
                        The agent used Bloomreach MCP intelligence to recommend creative direction.
                        <strong className="font-medium text-text-main"> Nothing is sent to customers or published to Engagement until you approve.</strong>
                        {' '}Approving only generates review artifacts (copy, visual, layout) in this studio.
                    </p>
                    {usedDemoFallback && (
                        <p className="mb-2 text-sm text-amber-700 dark:text-amber-400">
                            This run used demo fallback data. Sign in via the banner above, set GEMINI_API_KEY, then launch again.
                        </p>
                    )}
                    {!usedDemoFallback && mcpConnected && !mcpToolsInvoked && (
                        <p className="mb-2 text-sm text-amber-700 dark:text-amber-400">
                            Bloomreach MCP is connected, but this run did not invoke MCP tools. Check the reasoning stream or try launching again.
                        </p>
                    )}
                    {strategyEvidence.length > 0 && (
                        <div className="mb-4 rounded-lg border border-border-theme bg-bg-theme/50 p-3">
                            <p className="mb-2 text-sm font-medium text-text-main">Evidence cited</p>
                            <ul className="list-inside list-disc space-y-1 text-sm text-text-muted">
                                {strategyEvidence.map((item, idx) => (
                                    <li key={idx}>{item}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    <div className="mb-4">
                        <p className="mb-2 text-sm font-medium text-text-main">Proposed copy preview</p>
                        <StructuredCopyPreview
                            copy={strategyCopyPreview}
                            compact
                            embedded
                        />
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={onApprove}
                            disabled={rerollingPreview}
                            className="glass-btn glass-btn-primary px-6 py-2"
                        >
                            Approve & Execute Strategy
                        </button>
                        <button
                            type="button"
                            onClick={onRerollPreview}
                            disabled={rerollingPreview}
                            className="glass-btn glass-btn-danger px-6 py-2"
                        >
                            {rerollingPreview ? 'Rerolling…' : 'Reroll'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
