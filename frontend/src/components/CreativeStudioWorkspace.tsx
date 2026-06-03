'use client'

import { useCallback, useState } from 'react'
import { ErrorBoundary } from './ErrorBoundary'
import { StructuredCopyPreview } from './StructuredCopyPreview'
import DOMPurify from 'dompurify'
import { useCampaignStore } from '@/store/useCampaignStore'
import { useCampaignProgress } from '@/hooks/useCampaignProgress'
import { approveCampaign, createCampaign, CampaignApiError, rerollCampaignAsset, rerollCopyPreview } from '@/lib/api/campaigns'
import { buildCampaignAssetFilenames, downloadImageAsset, downloadTextAsset } from '@/lib/downloadAssets'
import { buildClientCopyPreview } from '@/lib/structuredCopy'
import { prepareUiPreviewHtml } from '@/lib/uiPreview'
import { DEFAULT_CAMPAIGN_FORM, PLATFORMS, VIBES } from '@/constants/campaign'
import { McpConnectionBanner } from './McpConnectionBanner'
import type { CampaignRequest, RerollAsset } from '@/types/campaign'

interface AssetActionBarProps {
    onDownload: () => void
    onReroll: () => void
    downloadDisabled?: boolean
    rerollDisabled?: boolean
    rerolling?: boolean
}

function AssetActionBar({
    onDownload,
    onReroll,
    downloadDisabled = false,
    rerollDisabled = false,
    rerolling = false,
}: AssetActionBarProps) {
    return (
        <div className="mt-2 flex justify-end gap-2">
            <button
                type="button"
                onClick={onDownload}
                disabled={downloadDisabled}
                className="rounded-md border border-border-theme px-2 py-1 text-xs text-text-muted transition hover:bg-bg-theme disabled:cursor-not-allowed disabled:opacity-40"
            >
                Download
            </button>
            <button
                type="button"
                onClick={onReroll}
                disabled={rerollDisabled || rerolling}
                className="rounded-md border border-border-theme px-2 py-1 text-xs text-text-muted transition hover:bg-bg-theme disabled:cursor-not-allowed disabled:opacity-40"
            >
                {rerolling ? 'Rerolling…' : 'Reroll'}
            </button>
        </div>
    )
}

export function CreativeStudioWorkspace() {
    const { agentState, workflowId, setAgentState, setWorkflowId, reset } = useCampaignStore()
    const [formData, setFormData] = useState<CampaignRequest>({ ...DEFAULT_CAMPAIGN_FORM })
    const [error, setError] = useState<string | null>(null)
    const [rerollingAsset, setRerollingAsset] = useState<RerollAsset | null>(null)
    const [rerollingPreview, setRerollingPreview] = useState(false)

    const handleProgressUpdate = useCallback(
        (update: Parameters<typeof setAgentState>[0]) => {
            setAgentState(update)
        },
        [setAgentState],
    )

    const handleProgressError = useCallback((message: string) => {
        setError(message)
    }, [])

    useCampaignProgress({
        workflowId,
        onUpdate: handleProgressUpdate,
        onError: handleProgressError,
    })

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData((prev) => ({ ...prev, [name]: value }))
    }

    const handleGenerate = async () => {
        if (!formData.brandName || !formData.campaignGoal || !formData.targetAudience) {
            setError('Please fill in all required fields')
            return
        }

        setError(null)
        reset()
        setAgentState({ status: 'reasoning', reasoningStream: ['Initializing Autonomous Campaign Agent...'] })

        try {
            const data = await createCampaign(formData)
            setWorkflowId(data.id)
        } catch (err) {
            const message = err instanceof CampaignApiError ? err.message : 'An error occurred'
            setError(message)
            setAgentState({ status: 'error' })
        }
    }

    const handleApprove = async () => {
        if (!workflowId) return

        const previousStatus = agentState.status
        const previousReasoningStream = [...agentState.reasoningStream]

        setAgentState({
            status: 'executing',
            reasoningStream: [...agentState.reasoningStream, 'Human approval received. Executing strategy...'],
        })

        try {
            await approveCampaign(workflowId)
        } catch (err) {
            const message = err instanceof CampaignApiError ? err.message : 'Approval failed'
            setError(message)
            setAgentState({
                status: previousStatus,
                reasoningStream: previousReasoningStream,
            })
        }
    }

    const handleRerollPreview = async () => {
        if (!workflowId || agentState.status !== 'recommendation_ready' || rerollingPreview) return

        setError(null)
        setRerollingPreview(true)

        try {
            const result = await rerollCopyPreview(workflowId)
            setAgentState({
                copyPreviewBlurb: result.copyPreviewBlurb,
            })
        } catch (err) {
            const message = err instanceof CampaignApiError ? err.message : 'Failed to reroll copy preview'
            setError(message)
        } finally {
            setRerollingPreview(false)
        }
    }

    const assetFilenames = buildCampaignAssetFilenames(formData.brandName || 'campaign')
    const recommendation = agentState.recommendation
    const canRerollAssets = Boolean(workflowId && (agentState.status === 'executing' || agentState.status === 'complete'))
    const isRecommendationReady = agentState.status === 'recommendation_ready'
    const strategyCopyPreview =
        agentState.copyPreviewBlurb
        ?? buildClientCopyPreview(
            formData,
            agentState.recommendedVibe ?? (formData.vibe !== 'auto' ? formData.vibe : 'minimalist'),
        )

    const handleDownloadCopy = () => {
        if (!recommendation?.copy) return
        downloadTextAsset(assetFilenames.copy, recommendation.copy)
    }

    const handleDownloadImage = async () => {
        if (!recommendation?.imageUrl) return
        try {
            await downloadImageAsset(assetFilenames.image, recommendation.imageUrl)
        } catch {
            setError('Failed to download campaign visual')
        }
    }

    const handleDownloadUi = () => {
        if (!recommendation?.uiComponent) return
        downloadTextAsset(assetFilenames.ui, recommendation.uiComponent, 'text/html;charset=utf-8')
    }

    const handleRerollAsset = async (asset: RerollAsset) => {
        if (!workflowId || !canRerollAssets) return

        setError(null)
        setRerollingAsset(asset)

        try {
            const result = await rerollCampaignAsset(workflowId, {
                asset,
                copy: recommendation?.copy,
                imageUrl: recommendation?.imageUrl,
            })

            setAgentState({
                recommendation: {
                    copy: asset === 'copy' ? result.value : (recommendation?.copy ?? ''),
                    imageUrl: asset === 'image' ? result.value : (recommendation?.imageUrl ?? ''),
                    uiComponent: asset === 'ui' ? result.value : (recommendation?.uiComponent ?? ''),
                },
            })
        } catch (err) {
            const message = err instanceof CampaignApiError ? err.message : 'Failed to reroll asset'
            setError(message)
        } finally {
            setRerollingAsset(null)
        }
    }

    const isWorking = agentState.status !== 'idle' && agentState.status !== 'complete'

    const strategyEvidence = agentState.evidence ?? []

    return (
        <div className="flex h-full flex-col gap-4">
            <McpConnectionBanner />
            <div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row">
                <div className="glass-panel flex w-full flex-col gap-6 p-6 lg:w-1/3">
                    <div>
                        <label htmlFor="brandName" className="field-label">Brand Name</label>
                        <input
                            id="brandName"
                            type="text"
                            name="brandName"
                            value={formData.brandName}
                            onChange={handleInputChange}
                            placeholder="e.g., Nexus Athletics"
                            className="input-field"
                            disabled={isWorking}
                        />
                    </div>

                    <div>
                        <label htmlFor="campaignGoal" className="field-label">Campaign Goal</label>
                        <textarea
                            id="campaignGoal"
                            name="campaignGoal"
                            value={formData.campaignGoal}
                            onChange={handleInputChange}
                            placeholder="e.g., Win back customers who haven't purchased in 6 months..."
                            className="input-field h-24 resize-none"
                            disabled={isWorking}
                        />
                    </div>

                    <div>
                        <label htmlFor="targetAudience" className="field-label">Target Audience Segment</label>
                        <input
                            id="targetAudience"
                            type="text"
                            name="targetAudience"
                            value={formData.targetAudience}
                            onChange={handleInputChange}
                            placeholder="e.g., Lapsed VIPs"
                            className="input-field"
                            disabled={isWorking}
                        />
                    </div>

                    <div>
                        <label htmlFor="vibe" className="field-label">Creative Vibe</label>
                        <select
                            id="vibe"
                            name="vibe"
                            value={formData.vibe}
                            onChange={handleInputChange}
                            className="input-field"
                            disabled={isWorking}
                        >
                            {VIBES.map((vibe) => (
                                <option key={vibe.id} value={vibe.id}>{vibe.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="platform" className="field-label">Platform</label>
                        <select
                            id="platform"
                            name="platform"
                            value={formData.platform}
                            onChange={handleInputChange}
                            className="input-field"
                            disabled={isWorking}
                        >
                            {PLATFORMS.map((platform) => (
                                <option key={platform.id} value={platform.id}>{platform.name}</option>
                            ))}
                        </select>
                    </div>

                    {error && (
                        <div className="rounded-lg border border-rose-200 bg-rose-100 p-3 text-sm text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                            {error}
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={isWorking || !formData.brandName || !formData.campaignGoal || !formData.targetAudience}
                        className={`glass-btn w-full py-3 ${
                            isWorking
                                ? 'cursor-not-allowed bg-primary-theme/50 text-white'
                                : 'glass-btn-primary'
                        }`}
                    >
                        {isWorking ? 'Agent Active...' : 'Launch Autonomous Agent'}
                    </button>
                </div>

                <div className="glass-panel-muted flex w-full flex-col gap-6 overflow-hidden p-6 lg:w-2/3">
                    {agentState.status === 'idle' && (
                        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center text-text-muted">
                            <svg className="h-16 w-16 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                            </svg>
                            <p className="text-xl font-medium">Waiting for campaign brief</p>
                        </div>
                    )}

                    {agentState.status === 'error' && (
                        <div className="flex h-full flex-col space-y-6 overflow-hidden">
                            <div className="callout-error animate-fade-in">
                                <div className="flex items-start gap-4">
                                    <div className="rounded-full bg-rose-200 p-3 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300">
                                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="mb-2 text-lg font-bold text-rose-900 dark:text-rose-200">Campaign Generation Failed</h3>
                                        <p className="mb-4 text-rose-800 dark:text-rose-300">
                                            {error || 'An unexpected error occurred during campaign generation.'}
                                        </p>
                                        {error && (
                                            <button
                                                type="button"
                                                onClick={handleGenerate}
                                                className="glass-btn bg-rose-600 text-white hover:bg-rose-700"
                                            >
                                                Retry Campaign Generation
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {(agentState.status !== 'idle' && agentState.status !== 'error') && (
                        <div
                            className={`flex h-full flex-col space-y-6 ${
                                isRecommendationReady ? 'overflow-y-auto' : 'overflow-hidden'
                            }`}
                        >
                            <div
                                className={`terminal-panel shrink-0 ${
                                    isRecommendationReady ? 'max-h-32' : ''
                                }`}
                                aria-live="polite"
                                aria-atomic="false"
                            >
                                <p className="mb-2 text-slate-500"># Agent Reasoning Stream</p>
                                {agentState.reasoningStream.map((log, idx) => (
                                    <div key={idx} className="mb-1 animate-fade-in opacity-90">
                                        <span className="mr-2 text-slate-500">{'>'}</span>
                                        {log}
                                    </div>
                                ))}
                                {agentState.status === 'reasoning' && (
                                    <div className="animate-pulse text-emerald-500">_</div>
                                )}
                            </div>

                            {isRecommendationReady && (
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
                                            {agentState.usedDemoFallback && (
                                                <p className="mb-2 text-sm text-amber-700 dark:text-amber-400">
                                                    This run used demo fallback data. Sign in via the banner above, set GEMINI_API_KEY, then launch again.
                                                </p>
                                            )}
                                            {!agentState.usedDemoFallback && agentState.mcpConnected && !agentState.mcpToolsInvoked && (
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
                                                    onClick={handleApprove}
                                                    disabled={rerollingPreview}
                                                    className="glass-btn glass-btn-primary px-6 py-2"
                                                >
                                                    Approve & Execute Strategy
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => { void handleRerollPreview() }}
                                                    disabled={rerollingPreview}
                                                    className="glass-btn glass-btn-danger px-6 py-2"
                                                >
                                                    {rerollingPreview ? 'Rerolling…' : 'Reroll'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {agentState.recommendation && (agentState.status === 'executing' || agentState.status === 'complete') && (
                                <div className="flex-1 space-y-6 overflow-y-auto">
                                    <ErrorBoundary>
                                        <div className="card">
                                            <h3 className="mb-4 text-lg font-bold text-text-main">Generated Marketing Copy</h3>
                                            {agentState.recommendation.copy ? (
                                                <StructuredCopyPreview copy={agentState.recommendation.copy} />
                                            ) : (
                                                <div className="flex h-24 animate-pulse items-center justify-center rounded-lg bg-bg-theme text-text-muted">
                                                    Generating copy...
                                                </div>
                                            )}
                                            <AssetActionBar
                                                onDownload={handleDownloadCopy}
                                                onReroll={() => { void handleRerollAsset('copy') }}
                                                downloadDisabled={!agentState.recommendation.copy}
                                                rerollDisabled={!canRerollAssets || !agentState.recommendation.copy}
                                                rerolling={rerollingAsset === 'copy'}
                                            />
                                        </div>

                                        <div className="card">
                                            <h3 className="mb-4 text-lg font-bold text-text-main">Campaign Visual</h3>
                                            {agentState.recommendation.imageUrl ? (
                                                <img
                                                    src={agentState.recommendation.imageUrl}
                                                    alt="Campaign Visual"
                                                    className="w-full rounded-lg shadow-sm"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = 'https://placehold.co/800x400/e2e8f0/475569?text=Visual+Generation+Failed'
                                                    }}
                                                />
                                            ) : (
                                                <div className="flex h-48 animate-pulse items-center justify-center rounded-lg bg-bg-theme text-text-muted">
                                                    Generating Visual...
                                                </div>
                                            )}
                                            <AssetActionBar
                                                onDownload={() => { void handleDownloadImage() }}
                                                onReroll={() => { void handleRerollAsset('image') }}
                                                downloadDisabled={!agentState.recommendation.imageUrl}
                                                rerollDisabled={!canRerollAssets || !agentState.recommendation.imageUrl || !agentState.recommendation.copy}
                                                rerolling={rerollingAsset === 'image'}
                                            />
                                        </div>

                                        <div className="card">
                                            <h3 className="mb-4 text-lg font-bold text-text-main">UI Layout Preview</h3>
                                            {agentState.recommendation.uiComponent ? (
                                                <div className="space-y-3">
                                                    <div
                                                        className="ui-layout-preview overflow-hidden rounded-lg border border-border-theme shadow-inner"
                                                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(prepareUiPreviewHtml(agentState.recommendation.uiComponent)) }}
                                                    />
                                                    <details className="rounded-lg border border-border-theme bg-bg-theme">
                                                        <summary className="cursor-pointer px-4 py-2 text-sm font-medium text-text-muted">
                                                            View HTML source
                                                        </summary>
                                                        <pre className="max-h-64 overflow-auto border-t border-border-theme p-4 text-xs text-text-main">
                                                            <code>{agentState.recommendation.uiComponent}</code>
                                                        </pre>
                                                    </details>
                                                </div>
                                            ) : (
                                                <div className="flex h-32 animate-pulse items-center justify-center rounded-lg bg-bg-theme text-text-muted">
                                                    Generating UI Layout...
                                                </div>
                                            )}
                                            <AssetActionBar
                                                onDownload={handleDownloadUi}
                                                onReroll={() => { void handleRerollAsset('ui') }}
                                                downloadDisabled={!agentState.recommendation.uiComponent}
                                                rerollDisabled={
                                                    !canRerollAssets
                                                    || !agentState.recommendation.uiComponent
                                                    || !agentState.recommendation.copy
                                                    || !agentState.recommendation.imageUrl
                                                }
                                                rerolling={rerollingAsset === 'ui'}
                                            />
                                        </div>
                                    </ErrorBoundary>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
