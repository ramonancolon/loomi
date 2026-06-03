import fs from 'node:fs/promises'
import path from 'node:path'
import type {
    OAuthClientInformationMixed,
    OAuthTokens,
} from '@modelcontextprotocol/sdk/shared/auth.js'
import type { OAuthDiscoveryState } from '@modelcontextprotocol/sdk/client/auth.js'

export interface McpOAuthSession {
    clientInformation?: OAuthClientInformationMixed
    tokens?: OAuthTokens
    codeVerifier?: string
    discoveryState?: OAuthDiscoveryState
}

async function ensureParentDir(filePath: string): Promise<void> {
    await fs.mkdir(path.dirname(filePath), { recursive: true })
}

export class FileOAuthStore {
    constructor(private readonly filePath: string) {}

    async read(): Promise<McpOAuthSession> {
        try {
            const raw = await fs.readFile(this.filePath, 'utf8')
            return JSON.parse(raw) as McpOAuthSession
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                return {}
            }
            throw error
        }
    }

    async write(session: McpOAuthSession): Promise<void> {
        await ensureParentDir(this.filePath)
        await fs.writeFile(this.filePath, JSON.stringify(session, null, 2), 'utf8')
    }

    async update(
        updater: (current: McpOAuthSession) => McpOAuthSession | Promise<McpOAuthSession>,
    ): Promise<McpOAuthSession> {
        const current = await this.read()
        const next = await updater(current)
        await this.write(next)
        return next
    }

    async clear(scope: 'all' | 'client' | 'tokens' | 'verifier' | 'discovery'): Promise<void> {
        await this.update((current) => {
            if (scope === 'all') {
                return {}
            }

            const next = { ...current }
            if (scope === 'client') {
                delete next.clientInformation
            }
            if (scope === 'tokens') {
                delete next.tokens
            }
            if (scope === 'verifier') {
                delete next.codeVerifier
            }
            if (scope === 'discovery') {
                delete next.discoveryState
            }
            return next
        })
    }
}
