export interface McpConnectionStatus {
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
}

export async function fetchMcpConnectionStatus(): Promise<McpConnectionStatus> {
    const response = await fetch('/api/mcp/auth/status')
    if (!response.ok) {
        throw new Error('Failed to load MCP connection status')
    }
    return response.json() as Promise<McpConnectionStatus>
}

/** OAuth login must hit the backend (callback is registered on API host, not Next dev port). */
export function getMcpLoginUrl(loginPath: string): string {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '')
    if (apiBase) {
        return `${apiBase}${loginPath}`
    }
    return loginPath
}
