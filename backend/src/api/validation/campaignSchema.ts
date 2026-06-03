import { z } from 'zod'

export const CampaignRequestSchema = z.object({
    brandName: z.string().trim().min(1, 'Brand name is required'),
    campaignGoal: z.string().trim().min(1, 'Campaign goal is required'),
    targetAudience: z.string().trim().min(1, 'Target audience is required'),
    vibe: z.string().trim().min(1, 'Vibe is required'),
    platform: z.string().trim().min(1, 'Platform is required'),
})

export type ValidatedCampaignRequest = z.infer<typeof CampaignRequestSchema>

export const RerollAssetSchema = z.object({
    asset: z.enum(['copy', 'image', 'ui']),
    copy: z.string().optional(),
    imageUrl: z.string().optional(),
})

export type ValidatedRerollRequest = z.infer<typeof RerollAssetSchema>
