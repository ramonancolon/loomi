import { useEffect, useRef } from 'react'
import type { CampaignStatus, CampaignStatusResponse } from '@/types/campaign'
import type { AgentState } from '@/types/campaign'

type ProgressEvent =
    | { type: 'connected'; timestamp: string }
    | { type: 'error'; message: string }
    | ({ type: 'progress' } & CampaignStatusResponse)

function mapBackendStatusToAgentStatus(
    backendStatus: CampaignStatus,
    currentStatus: AgentState['status'],
): AgentState['status'] {
    switch (backendStatus) {
        case 'pending':
        case 'reasoning':
            return 'reasoning'
        case 'recommendation_ready':
            return 'recommendation_ready'
        case 'copy_gen':
        case 'image_gen':
        case 'ui_layout_gen':
        case 'approved':
            return 'executing'
        case 'dispatching':
            return 'executing'
        case 'dispatched':
            return 'complete'
        case 'complete':
            return 'complete'
        case 'error':
            return 'error'
        default:
            return currentStatus
    }
}

function buildRecommendationFromStatus(
    status: CampaignStatusResponse,
): AgentState['recommendation'] | undefined {
    if (!status.copy && !status.imageUrl && !status.uiComponent) {
        return undefined
    }
    return {
        copy: status.copy ?? '',
        imageUrl: status.imageUrl ?? '',
        uiComponent: status.uiComponent ?? '',
    }
}

interface UseCampaignProgressOptions {
    workflowId: string | null
    onUpdate: (update: Partial<AgentState>) => void
    onError: (message: string) => void
}

export function useCampaignProgress({
    workflowId,
    onUpdate,
    onError,
}: UseCampaignProgressOptions): void {
    const onUpdateRef = useRef(onUpdate)
    const onErrorRef = useRef(onError)
    const agentStatusRef = useRef<AgentState['status']>('idle')
    const copyPreviewBlurbRef = useRef<string | null>(null)
    const recommendedVibeRef = useRef<string | null>(null)
    const evidenceRef = useRef<string[]>([])
    const usedDemoFallbackRef = useRef(false)
    const mcpToolsInvokedRef = useRef(false)
    const mcpConnectedRef = useRef(false)

    useEffect(() => {
        onUpdateRef.current = onUpdate
    }, [onUpdate])

    useEffect(() => {
        onErrorRef.current = onError
    }, [onError])

    useEffect(() => {
        if (!workflowId) return

        agentStatusRef.current = 'reasoning'
        copyPreviewBlurbRef.current = null
        recommendedVibeRef.current = null
        evidenceRef.current = []
        usedDemoFallbackRef.current = false
        mcpToolsInvokedRef.current = false
        mcpConnectedRef.current = false

        const eventSource = new EventSource(`/api/campaigns/${workflowId}/progress`)

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data) as ProgressEvent

                if (data.type === 'connected') return

                if (data.type === 'error') {
                    onErrorRef.current(data.message || 'An error occurred')
                    onUpdateRef.current({ status: 'error' })
                    eventSource.close()
                    return
                }

                const nextStatus = mapBackendStatusToAgentStatus(data.status, agentStatusRef.current)
                agentStatusRef.current = nextStatus

                if (data.copyPreviewBlurb) {
                    copyPreviewBlurbRef.current = data.copyPreviewBlurb
                }
                if (data.vibe) {
                    recommendedVibeRef.current = data.vibe
                }
                if (data.evidence?.length) {
                    evidenceRef.current = data.evidence
                }
                if (data.usedDemoFallback !== undefined) {
                    usedDemoFallbackRef.current = data.usedDemoFallback
                }
                if (data.mcpToolsInvoked !== undefined) {
                    mcpToolsInvokedRef.current = data.mcpToolsInvoked
                }
                if (data.mcpConnected !== undefined) {
                    mcpConnectedRef.current = data.mcpConnected
                }

                onUpdateRef.current({
                    status: nextStatus,
                    reasoningStream: data.reasoningStream ?? [],
                    copyPreviewBlurb: copyPreviewBlurbRef.current,
                    recommendedVibe: recommendedVibeRef.current,
                    evidence: evidenceRef.current,
                    usedDemoFallback: usedDemoFallbackRef.current,
                    mcpToolsInvoked: mcpToolsInvokedRef.current,
                    mcpConnected: mcpConnectedRef.current,
                    recommendation: buildRecommendationFromStatus(data),
                })

                if (data.status === 'error') {
                    onErrorRef.current(data.errorMessage || 'Campaign generation failed')
                    eventSource.close()
                    return
                }

                if (data.status === 'complete') {
                    eventSource.close()
                }
            } catch (err) {
                console.error('Error processing SSE message:', err)
            }
        }

        eventSource.onerror = () => {
            console.error('SSE connection error')
            eventSource.close()
        }

        return () => {
            eventSource.close()
        }
    }, [workflowId])
}
