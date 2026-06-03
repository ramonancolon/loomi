import path from 'node:path'

function readPort(): number {
    const raw = process.env.PORT ?? process.env.BACKEND_PORT ?? '3001'
    const port = Number.parseInt(raw, 10)
    if (!Number.isFinite(port) || port <= 0) {
        throw new Error(`Invalid port: ${raw}`)
    }
    return port
}

function readAllowedOrigins(): string[] {
    const fromEnv = process.env.CORS_ALLOWED_ORIGINS
    if (fromEnv) {
        return fromEnv.split(',').map((origin) => origin.trim()).filter(Boolean)
    }
    return [
        'http://localhost:5173',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
    ]
}

function readMcpOAuthRedirectUrl(port: number): string {
    return (
        process.env.MCP_OAUTH_REDIRECT_URL
        ?? `http://localhost:${port}/api/mcp/auth/callback`
    )
}

function readMcpOAuthStorePath(): string {
    return process.env.MCP_OAUTH_STORE_PATH
        ?? path.join(process.cwd(), '.mcp-oauth', 'session.json')
}

export const env = {
    NODE_ENV: process.env.NODE_ENV ?? 'development',
    PORT: readPort(),
    PUBLIC_API_BASE_URL:
        process.env.PUBLIC_API_BASE_URL ?? `http://localhost:${readPort()}`,
    TEMPORAL_NAMESPACE: process.env.TEMPORAL_NAMESPACE ?? 'default',
    TEMPORAL_ADDRESS: process.env.TEMPORAL_ADDRESS ?? '127.0.0.1:7233',
    TEMPORAL_TASK_QUEUE: process.env.TEMPORAL_TASK_QUEUE ?? 'chromaflow-task-queue',
    /** Temporal Cloud API key (Bearer). When set, TLS is enabled automatically. */
    TEMPORAL_API_KEY: process.env.TEMPORAL_API_KEY ?? '',
    /** Force TLS (optional; defaults to true when TEMPORAL_API_KEY is set). */
    TEMPORAL_USE_TLS:
        process.env.TEMPORAL_USE_TLS === 'true'
        || Boolean(process.env.TEMPORAL_API_KEY?.trim()),
    CORS_ALLOWED_ORIGINS: readAllowedOrigins(),

    /** Bloomreach Engagement project (Pacific Apparel / noisy-muffin) */
    ENGAGEMENT_URL:
        process.env.ENGAGEMENT_URL ?? 'https://uqa.app.exponea.dev/p/noisy-muffin',

    /** Marketing + Analytics MCP (OAuth required; analytics tools on same server) */
    MCP_MARKETING_URL:
        process.env.MCP_MARKETING_URL ?? 'https://loomi-mcp-alpha.bloomreach.com/mcp',

    /** Analytics MCP surface (defaults to marketing server; separate URL if organizers provide one) */
    MCP_ANALYTICS_URL:
        process.env.MCP_ANALYTICS_URL
        ?? process.env.MCP_MARKETING_URL
        ?? 'https://loomi-mcp-alpha.bloomreach.com/mcp',

    /** Conversation / product catalog MCP (no auth) */
    MCP_CONVERSATION_URL:
        process.env.MCP_CONVERSATION_URL
        ?? 'https://uqa.api.exponea.dev/cocoaas/public/api/clarity-search/v1/mcp/019d4917-3c76-7479-9f00-06c620b231bb',

    MCP_OAUTH_REDIRECT_URL: readMcpOAuthRedirectUrl(readPort()),
    MCP_OAUTH_STORE_PATH: readMcpOAuthStorePath(),
} as const
