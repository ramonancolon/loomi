import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { UnauthorizedError } from '@modelcontextprotocol/sdk/client/auth.js'
import { env } from '../config/env'
import { getMarketingMcpOAuthProvider, isMarketingMcpAuthorized } from './oauthProvider'

export interface ConnectedMcpClients {
    clients: Client[]
    warnings: string[]
    conversationConnected: boolean
    /** Marketing + Analytics tools (shared OAuth server) */
    marketingConnected: boolean
    analyticsConnected: boolean
    disconnect: () => Promise<void>
}

export function hasLiveMcpIntelligence(connection: Pick<ConnectedMcpClients, 'conversationConnected' | 'marketingConnected'>): boolean {
    return connection.conversationConnected || connection.marketingConnected
}

async function connectConversationMcp(): Promise<Client> {
    const client = new Client({ name: 'loomi-conversation', version: '1.0.0' })
    const transport = new StreamableHTTPClientTransport(new URL(env.MCP_CONVERSATION_URL))
    await client.connect(transport)
    return client
}

async function connectMarketingMcp(): Promise<Client> {
    const provider = getMarketingMcpOAuthProvider()
    const client = new Client({ name: 'loomi-marketing-analytics', version: '1.0.0' })
    const transport = new StreamableHTTPClientTransport(new URL(env.MCP_MARKETING_URL), {
        authProvider: provider,
    })
    await client.connect(transport)
    return client
}

/**
 * Connects to available Bloomreach MCP servers.
 * Conversation MCP is always attempted; marketing/analytics MCP requires prior OAuth login.
 */
export async function connectMcpClients(): Promise<ConnectedMcpClients> {
    const clients: Client[] = []
    const warnings: string[] = []
    let conversationConnected = false
    let marketingConnected = false

    try {
        clients.push(await connectConversationMcp())
        conversationConnected = true
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        warnings.push(`Conversation MCP unavailable: ${message}`)
    }

    const authorized = await isMarketingMcpAuthorized()
    if (!authorized) {
        warnings.push(
            'Marketing & Analytics MCP not authorized. Visit /api/mcp/auth/login before generating campaigns.',
        )
    } else {
        try {
            clients.push(await connectMarketingMcp())
            marketingConnected = true
        } catch (error) {
            if (error instanceof UnauthorizedError) {
                warnings.push(
                    'Marketing MCP session expired. Re-authenticate at /api/mcp/auth/login.',
                )
            } else {
                const message = error instanceof Error ? error.message : String(error)
                warnings.push(`Marketing/Analytics MCP unavailable: ${message}`)
            }
        }
    }

    return {
        clients,
        warnings,
        conversationConnected,
        marketingConnected,
        analyticsConnected: marketingConnected,
        disconnect: async () => {
            await Promise.all(clients.map((client) => client.close()))
        },
    }
}

export async function getMcpConnectionStatus(): Promise<{
    engagementUrl: string
    conversationMcp: { url: string; authRequired: false }
    marketingMcp: { url: string; authorized: boolean; loginPath: string }
    analyticsMcp: {
        url: string
        authorized: boolean
        sharedWithMarketing: boolean
        loginPath: string
    }
    readyForLiveReasoning: boolean
}> {
    const authorized = await isMarketingMcpAuthorized()
    return {
        engagementUrl: env.ENGAGEMENT_URL,
        conversationMcp: {
            url: env.MCP_CONVERSATION_URL,
            authRequired: false,
        },
        marketingMcp: {
            url: env.MCP_MARKETING_URL,
            authorized,
            loginPath: '/api/mcp/auth/login',
        },
        analyticsMcp: {
            url: env.MCP_ANALYTICS_URL,
            authorized,
            sharedWithMarketing: env.MCP_ANALYTICS_URL === env.MCP_MARKETING_URL,
            loginPath: '/api/mcp/auth/login',
        },
        readyForLiveReasoning: authorized,
    }
}
