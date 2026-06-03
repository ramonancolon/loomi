'use client'

import { useCallback, useEffect, useState } from 'react'
import { fetchMcpConnectionStatus, getMcpLoginUrl, type McpConnectionStatus } from '@/lib/api/mcp'

export function McpConnectionBanner() {
    const [status, setStatus] = useState<McpConnectionStatus | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [oauthNotice, setOauthNotice] = useState<string | null>(null)

    const loadStatus = useCallback(async () => {
        try {
            setError(null)
            setStatus(await fetchMcpConnectionStatus())
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not load MCP status')
        }
    }, [])

    useEffect(() => {
        void loadStatus()
    }, [loadStatus])

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const auth = params.get('mcp_auth')
        if (!auth) {
            return
        }

        const message = params.get('mcp_message')
        if (auth === 'success') {
            setOauthNotice('Bloomreach sign-in completed. MCP status updated below.')
        } else {
            setOauthNotice(
                message
                    ? `Bloomreach sign-in issue: ${message}`
                    : 'Bloomreach sign-in did not complete.',
            )
        }

        params.delete('mcp_auth')
        params.delete('mcp_message')
        const query = params.toString()
        const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname
        window.history.replaceState({}, '', nextUrl)

        void loadStatus()
    }, [loadStatus])

    useEffect(() => {
        const onMessage = (event: MessageEvent) => {
            if (event.data?.type === 'loomi-mcp-oauth') {
                void loadStatus()
            }
        }
        window.addEventListener('message', onMessage)
        return () => window.removeEventListener('message', onMessage)
    }, [loadStatus])

    if (error) {
        return (
            <div className="callout-info text-sm" role="status">
                <p className="text-text-muted">MCP status unavailable. Start the backend API on port 3001.</p>
            </div>
        )
    }

    if (!status) {
        return null
    }

    if (status.readyForLiveReasoning) {
        return (
            <div className="space-y-2">
                {oauthNotice && (
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300" role="status">
                        {oauthNotice}
                    </div>
                )}
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-text-main" role="status">
                    <p className="font-medium text-emerald-700 dark:text-emerald-400">Bloomreach MCP ready</p>
                    <p className="mt-1 text-text-muted">
                        Marketing, Analytics, and catalog tools can drive live agent reasoning.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-2">
            {oauthNotice && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300" role="status">
                    {oauthNotice}
                </div>
            )}
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm" role="status">
                <p className="font-medium text-amber-800 dark:text-amber-300">Connect Bloomreach MCP</p>
                <p className="mt-1 text-text-muted">
                    Sign in once to unlock Marketing and Analytics tools. You will return here automatically after Bloomreach approves access.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                    <a
                        href={getMcpLoginUrl(status.marketingMcp.loginPath)}
                        className="glass-btn glass-btn-primary px-4 py-2 text-sm"
                    >
                        Sign in to Marketing &amp; Analytics MCP
                    </a>
                    <button
                        type="button"
                        onClick={() => { void loadStatus() }}
                        className="text-sm text-text-muted underline-offset-2 hover:underline"
                    >
                        Refresh status
                    </button>
                </div>
            </div>
        </div>
    )
}
