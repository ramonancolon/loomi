import { env } from '../config/env'
import type { CampaignRequest } from '../types/campaign'

export const VALID_VIBES = [
    'minimalist',
    'vintage',
    'nature',
    'luxury',
    'tech',
    'dark',
    'vibrant',
    'pastel',
] as const

export interface McpReasoningContext {
    marketingConnected: boolean
    conversationConnected: boolean
    mockSegmentPrompt: string
}

export function buildAgentReasoningPrompt(
    campaign: CampaignRequest,
    ctx: McpReasoningContext,
): string {
    const analyticsInstruction = ctx.marketingConnected
        ? `2. Call at least one Analytics MCP tool (performance, metrics, trends, or campaign results) to ground recommendations in measurable signals. Cite specific metrics or trends in evidence and reasoningSteps.`
        : `2. Analytics MCP is unavailable — note this limitation in reasoningSteps; do not invent metrics.`

    const marketingInstruction = ctx.marketingConnected
        ? `3. Call at least one Marketing MCP tool (segments, campaigns, journeys, or audience insights) for the target audience "${campaign.targetAudience}".`
        : `3. Marketing MCP is unavailable — use only catalog/conversation tools and note the gap in reasoningSteps.`

    return `You are the Loomi Campaign Studio strategist for Bloomreach Engagement.

Analyze this campaign and use connected Bloomreach MCP tools before recommending creative direction. Do not guess segment or performance data — use tools or state what you could not retrieve.

Engagement project: ${env.ENGAGEMENT_URL}
${ctx.mockSegmentPrompt}
Campaign brief:
- Brand: ${campaign.brandName}
- Goal: ${campaign.campaignGoal}
- Target audience: ${campaign.targetAudience}
- Platform: ${campaign.platform}
- Requested vibe: ${campaign.vibe || 'auto'}

Required tool usage (when connected):
1. Use Conversation/catalog MCP tools to find relevant products or offers for the campaign goal.
${analyticsInstruction}
${marketingInstruction}
4. Choose recommendedVibe from: ${VALID_VIBES.join(', ')}.
5. If the user requested a specific vibe (not auto/empty), prefer it unless MCP data strongly contradicts it — explain why in reasoningSteps.
6. Return evidence: short bullet facts with source labels (e.g. "Analytics: …", "Marketing: …", "Catalog: …").
7. Return copyPreviewBlurb: short sample ${campaign.platform} copy (title + preview paragraphs) for human review before full generation.

After using tools, respond with ONLY a JSON object (no markdown fences) in exactly this shape:
{
  "recommendedVibe": "<one of: ${VALID_VIBES.join(', ')}>",
  "reasoningSteps": ["<step>", "<step>"],
  "summary": "<one-sentence strategy summary>",
  "evidence": ["<source>: <fact>", "<source>: <fact>"],
  "copyPreviewBlurb": "# <Title>\\n\\n<Preview paragraph>"
}`
}
