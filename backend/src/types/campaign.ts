// Campaign types for ChromaFlow

export interface CampaignRequest {
    brandName: string
    campaignGoal: string
    targetAudience: string
    vibe: string
    platform: string
}

// Ensure the backend status matches the AgentState plus the generation steps
export type WorkflowStatus = 'pending' | 'reasoning' | 'recommendation_ready' | 'approved' | 'copy_gen' | 'image_gen' | 'ui_layout_gen' | 'complete' | 'error'

export interface CampaignResult {
    id: string
    brandName: string
    campaignGoal: string
    targetAudience: string
    vibe: string
    platform: string
    copy: string | null
    imageUrl: string | null
    uiComponent: string | null
    copyPreviewBlurb: string | null
    reasoningStream: string[]
    /** Cited facts from MCP tools or transparent demo fallback */
    evidence?: string[]
    usedDemoFallback?: boolean
    mcpToolsInvoked?: boolean
    mcpConnected?: boolean
    status: WorkflowStatus
    progress: number
    errorMessage?: string | null
}

export interface CampaignResponse extends CampaignResult {
    runId: string
}

export interface CampaignStatusResponse extends CampaignResult { }
