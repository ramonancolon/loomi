import type { CampaignRequest } from '../types/campaign'
import { connectMcpClients, hasLiveMcpIntelligence } from '../mcp/connect'
import { getSegmentInsights, buildMockSegmentContext, formatSegmentInsightsSummary } from '../mcp/loomiConnect'
import { buildAgentReasoningPrompt, VALID_VIBES } from '../mcp/reasoningPrompt'
import { env } from '../config/env'
import { generateMockStructuredCopy } from './copyFormat'

export interface ReasoningResult {
    reasoningStream: string[]
    recommendedVibe: string
    copyPreviewBlurb: string
    /** Facts cited from MCP tools or transparent demo fallback */
    evidence: string[]
    /** True when demo heuristics ran instead of the Gemini + MCP agent path */
    usedDemoFallback: boolean
    /** True when Gemini recorded at least one MCP tool call/result in this run */
    mcpToolsInvoked: boolean
    /** True when Marketing OAuth and/or Conversation MCP connected for this run */
    mcpConnected: boolean
}

interface AgentStrategyResponse {
    recommendedVibe: string
    reasoningSteps: string[]
    summary: string
    evidence?: string[]
    copyPreviewBlurb?: string
}

function normalizeVibe(vibe: string | undefined, fallback: string): string {
    const normalized = (vibe ?? '').trim().toLowerCase()
    if (VALID_VIBES.includes(normalized as (typeof VALID_VIBES)[number])) {
        return normalized
    }
    return fallback
}

function appendAfcHistory(
    reasoningStream: string[],
    history: Array<{ role?: string; parts?: Array<{ text?: string; functionCall?: { name?: string }; functionResponse?: { name?: string } }> }> | undefined,
): void {
    if (!history?.length) {
        return
    }

    for (const turn of history) {
        for (const part of turn.parts ?? []) {
            if (part.functionCall?.name) {
                reasoningStream.push(`MCP tool call: ${part.functionCall.name}`)
            }
            if (part.functionResponse?.name) {
                reasoningStream.push(`MCP tool result: ${part.functionResponse.name}`)
            }
            if (part.text?.trim()) {
                reasoningStream.push(part.text.trim())
            }
        }
    }
}

function appendEvidence(reasoningStream: string[], evidence: string[] | undefined): string[] {
    const items = (evidence ?? []).map((e) => e.trim()).filter(Boolean)
    if (items.length > 0) {
        reasoningStream.push('Evidence from intelligence layer:')
        for (const item of items) {
            reasoningStream.push(`  • ${item}`)
        }
    }
    return items
}

async function runDemoFallbackReasoning(
    campaign: CampaignRequest,
    reasoningStream: string[],
    reason: string,
): Promise<ReasoningResult> {
    reasoningStream.push(reason)
    reasoningStream.push(`Analyzing campaign goal: "${campaign.campaignGoal}" for brand "${campaign.brandName}"`)
    reasoningStream.push(`Using demo segment heuristics for audience: "${campaign.targetAudience}"`)

    const insights = await getSegmentInsights(campaign.targetAudience)
    const evidence = [
        `Demo segment: churn risk ${insights.churnRisk}`,
        `Demo segment: last engagement ${new Date(insights.lastEngagementDate).toLocaleDateString()}`,
        `Demo segment: preferred channels ${insights.preferredChannels.join(', ')}`,
    ]
    reasoningStream.push(formatSegmentInsightsSummary(insights))

    let recommendedVibe = campaign.vibe
    if (!recommendedVibe || recommendedVibe === 'auto' || recommendedVibe === '') {
        recommendedVibe = insights.recommendedVibes[0] || 'minimalist'
        reasoningStream.push(`Based on demo segment data, recommending vibe: ${recommendedVibe}`)
    } else {
        reasoningStream.push(
            `Using user-requested vibe: ${recommendedVibe} (demo segment prefers ${insights.recommendedVibes.join('/')}).`,
        )
    }

    reasoningStream.push(`Strategy decided for ${campaign.platform}. Awaiting human approval before execution...`)
    appendEvidence(reasoningStream, evidence)

    const normalizedVibe = normalizeVibe(recommendedVibe, 'minimalist')
    const copyPreviewBlurb = generateMockStructuredCopy({
        brandName: campaign.brandName,
        campaignGoal: campaign.campaignGoal,
        targetAudience: campaign.targetAudience,
        vibe: normalizedVibe,
        platform: campaign.platform,
        preview: true,
    })

    return {
        reasoningStream,
        recommendedVibe: normalizedVibe,
        copyPreviewBlurb,
        evidence,
        usedDemoFallback: true,
        mcpToolsInvoked: false,
        mcpConnected: false,
    }
}

async function runAgenticReasoning(
    campaign: CampaignRequest,
    reasoningStream: string[],
): Promise<ReasoningResult> {
    let connection: Awaited<ReturnType<typeof deps.connectMcpClients>>
    try {
        connection = await deps.connectMcpClients()
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        return deps.runDemoFallbackReasoning(
            campaign,
            reasoningStream,
            `Bloomreach MCP connection failed (${message}).`,
        )
    }

    const { clients, warnings, marketingConnected, conversationConnected, disconnect } = connection
    warnings.forEach((warning) => reasoningStream.push(warning))

    if (!hasLiveMcpIntelligence(connection)) {
        await disconnect()
        return deps.runDemoFallbackReasoning(
            campaign,
            reasoningStream,
            'No live Bloomreach MCP surfaces connected. Connect at /api/mcp/auth/login and ensure Conversation MCP is reachable.',
        )
    }

    if (!process.env.GEMINI_API_KEY) {
        await disconnect()
        return deps.runDemoFallbackReasoning(
            campaign,
            reasoningStream,
            'GEMINI_API_KEY not set — cannot run MCP tool orchestration. Set the key for live agent reasoning.',
        )
    }

    let mockSegmentPrompt = ''
    if (!marketingConnected) {
        const mockSegment = await buildMockSegmentContext(campaign.targetAudience)
        reasoningStream.push('Marketing/Analytics MCP not connected — supplementing with demo segment context only.')
        reasoningStream.push(mockSegment.summary)
        mockSegmentPrompt = `\n${mockSegment.promptContext}\nUse catalog MCP for products; do not invent marketing or analytics metrics.\n`
    } else {
        reasoningStream.push('Marketing & Analytics MCP connected — agent must call analytics and marketing tools before recommending.')
    }

    if (conversationConnected) {
        reasoningStream.push('Conversation/catalog MCP connected — agent will query product catalog tools.')
    }

    try {
        const { GoogleGenAI, mcpToTool } = await import('@google/genai')
        const mcpTool = mcpToTool(...(clients as never[]), { timeout: 30_000 })
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

        const prompt = buildAgentReasoningPrompt(campaign, {
            marketingConnected,
            conversationConnected,
            mockSegmentPrompt,
        })

        const response = await ai.models.generateContent({
            model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
            contents: prompt,
            config: {
                tools: [mcpTool],
                automaticFunctionCalling: {
                    maximumRemoteCalls: 12,
                },
            },
        })

        appendAfcHistory(reasoningStream, response.automaticFunctionCallingHistory)

        let strategy: AgentStrategyResponse | undefined
        if (response.text) {
            const cleaned = response.text
                .replace(/```(?:json)?\s*/gi, '')
                .replace(/```/g, '')
                .trim()
            const jsonStart = cleaned.indexOf('{')
            const jsonEnd = cleaned.lastIndexOf('}')
            const candidate = jsonStart >= 0 && jsonEnd > jsonStart
                ? cleaned.slice(jsonStart, jsonEnd + 1)
                : cleaned
            try {
                strategy = JSON.parse(candidate) as AgentStrategyResponse
            } catch {
                reasoningStream.push('Could not parse agent strategy JSON — using demo fallback.')
            }
        }

        if (!strategy) {
            await disconnect()
            return deps.runDemoFallbackReasoning(
                campaign,
                reasoningStream,
                'Agent strategy parse failed after MCP calls.',
            )
        }

        reasoningStream.push(`Analyzing campaign goal: "${campaign.campaignGoal}" for brand "${campaign.brandName}"`)
        for (const step of strategy.reasoningSteps ?? []) {
            if (step.trim()) {
                reasoningStream.push(step.trim())
            }
        }
        if (strategy.summary?.trim()) {
            reasoningStream.push(strategy.summary.trim())
        }
        reasoningStream.push('Awaiting human approval before execution...')

        const evidence = appendEvidence(reasoningStream, strategy.evidence)

        const fallbackVibe =
            campaign.vibe && campaign.vibe !== 'auto' ? campaign.vibe : 'minimalist'
        const normalizedVibe = normalizeVibe(strategy.recommendedVibe, fallbackVibe)
        const copyPreviewBlurb = strategy.copyPreviewBlurb?.trim()
            || generateMockStructuredCopy({
                brandName: campaign.brandName,
                campaignGoal: campaign.campaignGoal,
                targetAudience: campaign.targetAudience,
                vibe: normalizedVibe,
                platform: campaign.platform,
                preview: true,
            })

        const mcpToolsInvoked = reasoningStream.some(
            (line) => line.startsWith('MCP tool call:') || line.startsWith('MCP tool result:'),
        )

        if (marketingConnected && !mcpToolsInvoked) {
            reasoningStream.push(
                'Bloomreach MCP is connected, but no MCP tools were invoked in this run. Strategy used model context only — try launching again or check GEMINI_API_KEY.',
            )
        } else if (!mcpToolsInvoked) {
            reasoningStream.push(
                'No MCP tool calls recorded. Connect Marketing MCP via the banner for sandbox segment and analytics tools.',
            )
        }

        return {
            reasoningStream,
            recommendedVibe: normalizedVibe,
            copyPreviewBlurb,
            evidence,
            usedDemoFallback: false,
            mcpToolsInvoked,
            mcpConnected: marketingConnected || conversationConnected,
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        const isQuota = /quota|rate.?limit|RESOURCE_EXHAUSTED|429/i.test(message)
        return deps.runDemoFallbackReasoning(
            campaign,
            reasoningStream,
            isQuota
                ? 'Gemini quota/rate limit reached.'
                : `Agent reasoning failed (${message}).`,
        )
    } finally {
        await disconnect()
    }
}

export async function agentReasoningActivity(campaign: CampaignRequest): Promise<ReasoningResult> {
    const reasoningStream: string[] = []
    return deps.runAgenticReasoning(campaign, reasoningStream)
}

export const deps = {
    runDemoFallbackReasoning,
    runAgenticReasoning,
    connectMcpClients,
}
