import type { CampaignRequest } from '@/types/campaign'

export interface StructuredCopy {
    title?: string
    paragraphs: string[]
    raw: string
}

const PREVIEW_PARAGRAPH_COUNTS: Record<string, number> = {
    email: 2,
    social: 1,
    landing_page: 2,
}

function previewTitle(brandName: string, campaignGoal: string, platform: string): string {
    const goalSnippet = campaignGoal.split(/\s+/).slice(0, 6).join(' ')
    if (platform === 'social') {
        return `${brandName}: ${goalSnippet}`
    }
    if (platform === 'landing_page') {
        return `${brandName} — ${goalSnippet}`
    }
    return `${brandName}: ${goalSnippet}`
}

/** Client-side fallback when SSE has not yet delivered copyPreviewBlurb. */
export function buildClientCopyPreview(
    campaign: Pick<CampaignRequest, 'brandName' | 'campaignGoal' | 'targetAudience' | 'platform'>,
    vibe = 'minimalist',
): string {
    const paragraphCount = PREVIEW_PARAGRAPH_COUNTS[campaign.platform] ?? PREVIEW_PARAGRAPH_COUNTS.email
    const audience = campaign.targetAudience ? ` for ${campaign.targetAudience}` : ''
    const title = previewTitle(campaign.brandName, campaign.campaignGoal, campaign.platform)

    const templates: Record<string, string[]> = {
        email: [
            `${campaign.brandName} is ready to ${campaign.campaignGoal.toLowerCase()}${audience}. This ${vibe} email opens with a clear reason to care.`,
            `Highlight what makes the offer timely and invite readers to take the next step today.`,
        ],
        social: [
            `${campaign.campaignGoal} — built ${vibe}${audience}. Tap in, react, and share if this speaks to you.`,
        ],
        landing_page: [
            `Welcome to ${campaign.brandName}. We built this experience to ${campaign.campaignGoal.toLowerCase()}${audience}.`,
            `Every detail is tuned for a ${vibe} feel — clear headline, strong proof, and a path to action.`,
        ],
    }

    const paragraphs = (templates[campaign.platform] ?? templates.email).slice(0, paragraphCount)
    const body = paragraphs.join('\n\n')
    return `# ${title}\n\n${body}`
}

export function parseStructuredCopy(copy: string): StructuredCopy {
    const trimmed = copy.trim()
    const match = trimmed.match(/^#\s+(.+?)(?:\n\n([\s\S]*))?$/)

    if (!match) {
        return {
            paragraphs: trimmed ? [trimmed] : [],
            raw: copy,
        }
    }

    const title = match[1]?.trim()
    const body = match[2]?.trim() ?? ''
    const paragraphs = body
        ? body.split(/\n\n+/).map((paragraph) => paragraph.trim()).filter(Boolean)
        : []

    return {
        title,
        paragraphs,
        raw: copy,
    }
}
