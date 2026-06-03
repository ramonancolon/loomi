import type {
    CampaignRequest,
    CampaignResponse,
    CampaignResult,
    CampaignStatusResponse,
    WorkflowStatus,
} from '../types/campaign'

export function createPendingCampaignResponse(
    workflowId: string,
    campaign: CampaignRequest,
): CampaignResponse {
    return {
        id: workflowId,
        runId: workflowId,
        status: 'pending',
        brandName: campaign.brandName,
        campaignGoal: campaign.campaignGoal,
        targetAudience: campaign.targetAudience,
        vibe: campaign.vibe,
        platform: campaign.platform,
        progress: 0,
        copy: null,
        imageUrl: null,
        uiComponent: null,
        copyPreviewBlurb: null,
        reasoningStream: [],
        evidence: [],
        usedDemoFallback: false,
        mcpToolsInvoked: false,
        mcpConnected: false,
        errorMessage: null,
    }
}

export function buildStatusResponse(
    id: string,
    status: WorkflowStatus,
    progress: number,
    partialResults: CampaignResult,
): CampaignStatusResponse {
    return {
        id,
        status,
        brandName: partialResults.brandName || '',
        campaignGoal: partialResults.campaignGoal || '',
        targetAudience: partialResults.targetAudience || '',
        vibe: partialResults.vibe || '',
        platform: partialResults.platform || '',
        progress,
        copy: partialResults.copy,
        imageUrl: partialResults.imageUrl,
        uiComponent: partialResults.uiComponent,
        copyPreviewBlurb: partialResults.copyPreviewBlurb,
        reasoningStream: partialResults.reasoningStream ?? [],
        evidence: partialResults.evidence ?? [],
        usedDemoFallback: partialResults.usedDemoFallback ?? false,
        mcpToolsInvoked: partialResults.mcpToolsInvoked ?? false,
        mcpConnected: partialResults.mcpConnected ?? false,
        errorMessage: partialResults.errorMessage ?? null,
    }
}

export function createPendingStatusFallback(id: string, errorMessage: string): CampaignStatusResponse {
    return {
        id,
        status: 'pending',
        brandName: '',
        campaignGoal: '',
        targetAudience: '',
        vibe: '',
        platform: '',
        progress: 0,
        copy: null,
        imageUrl: null,
        uiComponent: null,
        copyPreviewBlurb: null,
        reasoningStream: [],
        evidence: [],
        usedDemoFallback: false,
        mcpToolsInvoked: false,
        mcpConnected: false,
        errorMessage,
    }
}
