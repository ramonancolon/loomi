import { describe, it, expect, beforeEach, vi } from 'vitest'
import request from 'supertest'
import { type WorkflowClient } from '@temporalio/client'
import { auth } from '@modelcontextprotocol/sdk/client/auth.js'
import { createExpressApp } from '../server'

vi.mock('../../mcp/connect', () => ({
    getMcpConnectionStatus: vi.fn().mockResolvedValue({
        engagementUrl: 'https://uqa.app.exponea.dev/p/noisy-muffin',
        conversationMcp: {
            url: 'https://example.com/conversation-mcp',
            authRequired: false,
        },
        marketingMcp: {
            url: 'https://example.com/marketing-mcp',
            authorized: false,
            loginPath: '/api/mcp/auth/login',
        },
        analyticsMcp: {
            url: 'https://example.com/analytics-mcp',
            authorized: false,
            sharedWithMarketing: true,
            loginPath: '/api/mcp/auth/login',
        },
        readyForLiveReasoning: false,
    }),
}))

vi.mock('../../mcp/oauthProvider', () => ({
    getMarketingMcpOAuthProvider: vi.fn(() => ({
        invalidateCredentials: vi.fn().mockResolvedValue(undefined),
    })),
}))

vi.mock('@modelcontextprotocol/sdk/client/auth.js', () => ({
    auth: vi.fn(),
}))

const mockWorkflowClient = {
    start: vi.fn(),
    getHandle: vi.fn(),
} as unknown as WorkflowClient

describe('MCP auth routes', () => {
    let app: ReturnType<typeof createExpressApp>

    beforeEach(() => {
        vi.clearAllMocks()
        app = createExpressApp(mockWorkflowClient)
    })

    it('returns MCP connection status', async () => {
        const response = await request(app).get('/api/mcp/auth/status')

        expect(response.status).toBe(200)
        expect(response.body.engagementUrl).toContain('noisy-muffin')
        expect(response.body.conversationMcp.authRequired).toBe(false)
        expect(response.body.marketingMcp.authorized).toBe(false)
        expect(response.body.marketingMcp.loginPath).toBe('/api/mcp/auth/login')
        expect(response.body.analyticsMcp.sharedWithMarketing).toBe(true)
        expect(response.body.readyForLiveReasoning).toBe(false)
    })

    it('redirects to the app after OAuth callback', async () => {
        vi.mocked(auth).mockResolvedValue('AUTHORIZED')

        const response = await request(app).get('/api/mcp/auth/callback?code=test-code')

        expect(response.status).toBe(302)
        expect(response.headers.location).toContain('mcp_auth=success')
        expect(response.headers.location).toMatch(/^http:\/\//)
    })
})
