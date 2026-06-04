// Demo fallback segment heuristics when live Marketing/Analytics MCP is unavailable

export interface SegmentInsights {
    segmentName: string
    churnRisk: 'low' | 'medium' | 'high'
    preferredChannels: string[]
    recommendedVibes: string[]
    lastEngagementDate: string
}

/**
 * Mock MCP Tool: getSegmentInsights
 * Simulates fetching product-enriched data for a given audience segment.
 */
export async function getSegmentInsights(segmentName: string): Promise<SegmentInsights> {
    // Simulate network latency
    await new Promise(resolve => setTimeout(resolve, 800))

    const normalized = segmentName.toLowerCase()

    if (normalized.includes('luxury') || normalized.includes('vip')) {
        return {
            segmentName,
            churnRisk: 'low',
            preferredChannels: ['email', 'sms'],
            recommendedVibes: ['luxury', 'minimalist'],
            lastEngagementDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        }
    }

    if (normalized.includes('churn') || normalized.includes('win-back') || normalized.includes('lapsed')) {
        return {
            segmentName,
            churnRisk: 'high',
            preferredChannels: ['email', 'push'],
            recommendedVibes: ['vibrant', 'tech', 'dark'],
            lastEngagementDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        }
    }

    // Default generic response
    return {
        segmentName,
        churnRisk: 'medium',
        preferredChannels: ['email'],
        recommendedVibes: ['nature', 'pastel'],
        lastEngagementDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    }
}

export function formatSegmentInsightsSummary(insights: SegmentInsights): string {
    return `Segment insights: churn risk ${insights.churnRisk.toUpperCase()}, last engaged ${new Date(insights.lastEngagementDate).toLocaleDateString()}.`
}

export async function buildMockSegmentContext(audience: string): Promise<{
    summary: string
    promptContext: string
    insights: SegmentInsights
}> {
    const insights = await getSegmentInsights(audience)
    const summary = formatSegmentInsightsSummary(insights)

    const promptContext = `Demo segment heuristics (live Marketing MCP unavailable):
- Churn risk: ${insights.churnRisk}
- Preferred channels: ${insights.preferredChannels.join(', ')}
- Recommended vibes: ${insights.recommendedVibes.join(', ')}
- Last engagement: ${insights.lastEngagementDate}`

    return { summary, promptContext, insights }
}

/**
 * Mock MCP Tool: dispatchEmailCampaign
 * Simulates dispatching the campaign to Bloomreach Engagement.
 */
export async function dispatchEmailCampaign(
    segmentName: string,
    subject: string,
    bodyHtml: string
): Promise<{ success: boolean; dispatchedAt: string }> {
    // Simulate network latency
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    return {
        success: true,
        dispatchedAt: new Date().toISOString()
    }
}
