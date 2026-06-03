import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { CampaignRequest } from '../types/campaign'
import { agentReasoningActivity, deps } from './reasoningActivity'

describe('agentReasoningActivity', () => {
    const campaign: CampaignRequest = {
        brandName: 'Pacific Apparel',
        campaignGoal: 'Win back customers who have not purchased in 6 months',
        targetAudience: 'Lapsed VIPs',
        vibe: 'auto',
        platform: 'email',
    }

    beforeEach(() => {
        vi.restoreAllMocks()
    })

    it('uses demo fallback when no MCP clients are available', async () => {
        vi.spyOn(deps, 'connectMcpClients').mockResolvedValue({
            clients: [],
            warnings: ['Marketing & Analytics MCP not authorized.'],
            conversationConnected: false,
            marketingConnected: false,
            analyticsConnected: false,
            disconnect: vi.fn().mockResolvedValue(undefined),
        })

        const result = await agentReasoningActivity(campaign)

        expect(result.recommendedVibe).toBe('luxury')
        expect(result.usedDemoFallback).toBe(true)
        expect(result.mcpConnected).toBe(false)
        expect(result.evidence.length).toBeGreaterThan(0)
        expect(result.reasoningStream.some((line) => line.includes('No live Bloomreach MCP'))).toBe(true)
        expect(result.reasoningStream.some((line) => line.includes('demo segment'))).toBe(true)
        expect(result.copyPreviewBlurb).toMatch(/^# Pacific Apparel:/)
    })

    it('uses demo fallback when Gemini key is missing despite MCP clients', async () => {
        const previousKey = process.env.GEMINI_API_KEY
        delete process.env.GEMINI_API_KEY

        vi.spyOn(deps, 'connectMcpClients').mockResolvedValue({
            clients: [{ close: vi.fn() } as never],
            warnings: [],
            conversationConnected: true,
            marketingConnected: false,
            analyticsConnected: false,
            disconnect: vi.fn().mockResolvedValue(undefined),
        })

        const result = await agentReasoningActivity(campaign)

        expect(result.reasoningStream.some((line) => line.includes('GEMINI_API_KEY not set'))).toBe(true)
        expect(result.usedDemoFallback).toBe(true)
        expect(result.mcpConnected).toBe(false)

        if (previousKey) {
            process.env.GEMINI_API_KEY = previousKey
        }
    })

    it('uses demo fallback when MCP connection throws', async () => {
        vi.spyOn(deps, 'connectMcpClients').mockRejectedValue(new Error('network down'))

        const result = await agentReasoningActivity(campaign)

        expect(result.reasoningStream.some((line) => line.includes('connection failed'))).toBe(true)
        expect(result.usedDemoFallback).toBe(true)
        expect(result.mcpConnected).toBe(false)
    })

    it('respects a user-selected vibe in demo fallback', async () => {
        vi.spyOn(deps, 'connectMcpClients').mockResolvedValue({
            clients: [],
            warnings: [],
            conversationConnected: false,
            marketingConnected: false,
            analyticsConnected: false,
            disconnect: vi.fn().mockResolvedValue(undefined),
        })

        const result = await agentReasoningActivity({
            ...campaign,
            vibe: 'tech',
        })

        expect(result.recommendedVibe).toBe('tech')
        expect(result.reasoningStream.some((line) => line.includes('user-requested vibe: tech'))).toBe(true)
    })
})
