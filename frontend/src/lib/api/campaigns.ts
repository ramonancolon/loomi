import type {
    CampaignRequest,
    CampaignResponse,
    RerollAsset,
    RerollAssetRequest,
    RerollAssetResponse,
    RerollCopyPreviewResponse,
} from '@/types/campaign'

class CampaignApiError extends Error {
    constructor(message: string, readonly status: number) {
        super(message)
        this.name = 'CampaignApiError'
    }
}

async function parseErrorResponse(response: Response): Promise<string> {
    try {
        const data = (await response.json()) as { error?: string }
        return data.error ?? `Request failed with status ${response.status}`
    } catch {
        return `Request failed with status ${response.status}`
    }
}

export async function createCampaign(campaign: CampaignRequest): Promise<CampaignResponse> {
    const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaign),
    })

    if (!response.ok) {
        throw new CampaignApiError(await parseErrorResponse(response), response.status)
    }

    return response.json() as Promise<CampaignResponse>
}

export async function approveCampaign(workflowId: string): Promise<void> {
    const response = await fetch(`/api/campaigns/${workflowId}/approve`, {
        method: 'POST',
    })

    if (!response.ok) {
        throw new CampaignApiError(await parseErrorResponse(response), response.status)
    }
}

export async function rerollCampaignAsset(
    workflowId: string,
    request: RerollAssetRequest,
): Promise<RerollAssetResponse> {
    const response = await fetch(`/api/campaigns/${workflowId}/reroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
    })

    if (!response.ok) {
        throw new CampaignApiError(await parseErrorResponse(response), response.status)
    }

    return response.json() as Promise<RerollAssetResponse>
}

export async function rerollCopyPreview(workflowId: string): Promise<RerollCopyPreviewResponse> {
    const response = await fetch(`/api/campaigns/${workflowId}/reroll-preview`, {
        method: 'POST',
    })

    if (!response.ok) {
        throw new CampaignApiError(await parseErrorResponse(response), response.status)
    }

    return response.json() as Promise<RerollCopyPreviewResponse>
}

export interface DispatchCampaignRequest {
    segmentName: string
    subject: string
    bodyHtml: string
}

export async function dispatchCampaign(workflowId: string, request: DispatchCampaignRequest): Promise<void> {
    const response = await fetch(`/api/campaigns/${workflowId}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
    })

    if (!response.ok) {
        throw new CampaignApiError(await parseErrorResponse(response), response.status)
    }
}

export { CampaignApiError }
