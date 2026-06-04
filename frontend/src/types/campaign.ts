export interface CampaignRequest {
    brandName: string
    campaignGoal: string
    targetAudience: string
    vibe: string
    platform: string
}

export type CampaignStatus = 'pending' | 'reasoning' | 'recommendation_ready' | 'approved' | 'copy_gen' | 'image_gen' | 'ui_layout_gen' | 'complete' | 'dispatching' | 'dispatched' | 'error'

export interface CampaignResponse {
    id: string
    status: CampaignStatus
    copy?: string | null
    imageUrl?: string | null
    uiComponent?: string | null
    copyPreviewBlurb?: string | null
    reasoningStream?: string[]
    progress?: number
    errorMessage?: string | null
}

export type RerollAsset = 'copy' | 'image' | 'ui'

export interface RerollAssetRequest {
    asset: RerollAsset
    copy?: string
    imageUrl?: string
}

export interface RerollAssetResponse {
    asset: RerollAsset
    value: string
}

export interface RerollCopyPreviewResponse {
    copyPreviewBlurb: string
}

export interface CampaignStatusResponse {
    id: string
    status: CampaignStatus
    vibe?: string | null
    copy?: string | null
    imageUrl?: string | null
    uiComponent?: string | null
    copyPreviewBlurb?: string | null
    reasoningStream?: string[]
    evidence?: string[]
    usedDemoFallback?: boolean
    mcpToolsInvoked?: boolean
    mcpConnected?: boolean
    progress?: number
    errorMessage?: string | null
}


export interface AgentState {
    status: 'idle' | 'reasoning' | 'recommendation_ready' | 'approved' | 'executing' | 'complete' | 'error'
    reasoningStream: string[]
    copyPreviewBlurb?: string | null
    recommendedVibe?: string | null
    evidence?: string[]
    usedDemoFallback?: boolean
    mcpToolsInvoked?: boolean
    mcpConnected?: boolean
    recommendation?: {
        copy: string
        imageUrl: string
        uiComponent: string
    }
    dispatchSegmentName?: string
    dispatchSubject?: string
    dispatchBodyHtml?: string
}