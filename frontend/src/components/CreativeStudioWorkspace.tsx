'use client'

import { useCallback, useState } from 'react'
import { useCampaignStore } from '@/store/useCampaignStore'
import { useCampaignProgress } from '@/hooks/useCampaignProgress'
import { approveCampaign, createCampaign, CampaignApiError, rerollCampaignAsset, rerollCopyPreview } from '@/lib/api/campaigns'
import { buildCampaignAssetFilenames, downloadImageAsset, downloadTextAsset } from '@/lib/downloadAssets'
import { buildClientCopyPreview } from '@/lib/structuredCopy'
import { DEFAULT_CAMPAIGN_FORM } from '@/constants/campaign'
import { McpConnectionBanner } from './McpConnectionBanner'
import { CampaignBriefForm } from './CampaignBriefForm'
import { AgentReasoningTerminal } from './AgentReasoningTerminal'
import { ApprovalPanel } from './ApprovalPanel'
import { CampaignResultsPanel } from './CampaignResultsPanel'
import type { CampaignRequest, RerollAsset } from '@/types/campaign'

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
                <CampaignBriefForm
                    formData={formData}
                    onChange={handleInputChange}
                    onSubmit={() => { void handleGenerate() }}
                    isWorking={isWorking}
                    error={error}
                />

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
                            className={`flex h-full flex-col space-y-6 ${isRecommendationReady ? 'overflow-y-auto' : 'overflow-hidden'
                                }`}
                        >
                            <AgentReasoningTerminal
                                reasoningStream={agentState.reasoningStream}
                                isReasoning={agentState.status === 'reasoning'}
                                className={isRecommendationReady ? 'max-h-32' : ''}
                            />

                            {isRecommendationReady && (
                                <ApprovalPanel
                                    onApprove={() => { void handleApprove() }}
                                    onRerollPreview={() => { void handleRerollPreview() }}
                                    rerollingPreview={rerollingPreview}
                                    strategyCopyPreview={strategyCopyPreview}
                                    strategyEvidence={strategyEvidence}
                                    usedDemoFallback={agentState.usedDemoFallback}
                                    mcpConnected={agentState.mcpConnected}
                                    mcpToolsInvoked={agentState.mcpToolsInvoked}
                                />
                            )}

                            {agentState.recommendation && (agentState.status === 'executing' || agentState.status === 'complete') && (
                                <CampaignResultsPanel
                                    recommendation={agentState.recommendation}
                                    assetFilenames={assetFilenames}
                                    onDownloadCopy={handleDownloadCopy}
                                    onDownloadImage={() => { void handleDownloadImage() }}
                                    onDownloadUi={handleDownloadUi}
                                    onRerollAsset={(asset) => { void handleRerollAsset(asset) }}
                                    canRerollAssets={canRerollAssets}
                                    rerollingAsset={rerollingAsset}
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
