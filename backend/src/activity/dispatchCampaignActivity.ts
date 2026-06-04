import { dispatchEmailCampaign } from '../mcp/loomiConnect'
import type { DispatchCampaignInput, DispatchCampaignOutput } from '../types/activity'

/**
 * Temporal Activity: dispatchCampaignActivity
 * Calls the MCP tool to dispatch the email campaign to Bloomreach Engagement.
 */
export async function dispatchCampaignActivity(
    input: DispatchCampaignInput
): Promise<DispatchCampaignOutput> {
    const result = await dispatchEmailCampaign(
        input.segmentName,
        input.subject,
        input.bodyHtml
    )
    return result
}
