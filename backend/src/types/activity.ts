// Activity types for ChromaFlow

export interface CopyGenerationInput {
    brandName: string
    campaignGoal: string
    targetAudience?: string
    vibe: string
    platform: string
}

export interface CopyGenerationOutput {
    copy: string
}

export interface ImageGenerationInput {
    brandName: string
    campaignGoal: string
    vibe: string
    copy: string
}

export interface ImageGenerationOutput {
    imageUrl: string
}

export interface UIGenerationInput {
    brandName: string
    campaignGoal: string
    vibe: string
    copy: string
    imageUrl: string
}

export interface UIGenerationOutput {
    uiComponent: string
}

export interface DispatchCampaignInput {
    segmentName: string
    subject: string
    bodyHtml: string
}

export interface DispatchCampaignOutput {
    success: boolean
    dispatchedAt: string
}
