import type {
    OAuthClientInformationMixed,
    OAuthClientMetadata,
    OAuthTokens,
} from '@modelcontextprotocol/sdk/shared/auth.js'
import type { OAuthClientProvider, OAuthDiscoveryState } from '@modelcontextprotocol/sdk/client/auth.js'
import { env } from '../config/env'
import { FileOAuthStore } from './oauthStore'

let sharedStore: FileOAuthStore | undefined
let sharedProvider: BloomreachMcpOAuthProvider | undefined

export function getMcpOAuthStore(): FileOAuthStore {
    if (!sharedStore) {
        sharedStore = new FileOAuthStore(env.MCP_OAUTH_STORE_PATH)
    }
    return sharedStore
}

export function getMarketingMcpOAuthProvider(
    onRedirect?: (authorizationUrl: URL) => void,
): BloomreachMcpOAuthProvider {
    if (!sharedProvider) {
        sharedProvider = new BloomreachMcpOAuthProvider(getMcpOAuthStore(), onRedirect)
    } else if (onRedirect) {
        sharedProvider.setRedirectHandler(onRedirect)
    }
    return sharedProvider
}

export class BloomreachMcpOAuthProvider implements OAuthClientProvider {
    private redirectHandler: ((authorizationUrl: URL) => void) | undefined

    constructor(
        private readonly store: FileOAuthStore,
        onRedirect?: (authorizationUrl: URL) => void,
    ) {
        this.redirectHandler = onRedirect
    }

    setRedirectHandler(onRedirect: (authorizationUrl: URL) => void): void {
        this.redirectHandler = onRedirect
    }

    get redirectUrl(): string {
        return env.MCP_OAUTH_REDIRECT_URL
    }

    get clientMetadata(): OAuthClientMetadata {
        return {
            client_name: 'Loomi Creative Studio',
            redirect_uris: [this.redirectUrl],
            grant_types: ['authorization_code', 'refresh_token'],
            response_types: ['code'],
            // Register as a public client (PKCE). If the server issues a
            // client_secret anyway, the SDK's selectClientAuthMethod still
            // upgrades to client_secret_post at token-exchange time.
            token_endpoint_auth_method: 'none',
        }
    }

    async clientInformation(): Promise<OAuthClientInformationMixed | undefined> {
        const session = await this.store.read()
        return session.clientInformation
    }

    async saveClientInformation(clientInformation: OAuthClientInformationMixed): Promise<void> {
        await this.store.update((session) => ({
            ...session,
            clientInformation,
        }))
    }

    async tokens(): Promise<OAuthTokens | undefined> {
        const session = await this.store.read()
        return session.tokens
    }

    async saveTokens(tokens: OAuthTokens): Promise<void> {
        await this.store.update((session) => ({
            ...session,
            tokens,
        }))
    }

    redirectToAuthorization(authorizationUrl: URL): void {
        if (this.redirectHandler) {
            this.redirectHandler(authorizationUrl)
            return
        }
        console.info(`Marketing MCP authorization required: ${authorizationUrl.toString()}`)
    }

    async saveCodeVerifier(codeVerifier: string): Promise<void> {
        await this.store.update((session) => ({
            ...session,
            codeVerifier,
        }))
    }

    async codeVerifier(): Promise<string> {
        const session = await this.store.read()
        if (!session.codeVerifier) {
            throw new Error('No OAuth code verifier saved — restart login at /api/mcp/auth/login')
        }
        return session.codeVerifier
    }

    async saveDiscoveryState(state: OAuthDiscoveryState): Promise<void> {
        await this.store.update((session) => ({
            ...session,
            discoveryState: state,
        }))
    }

    async discoveryState(): Promise<OAuthDiscoveryState | undefined> {
        const session = await this.store.read()
        return session.discoveryState
    }

    async invalidateCredentials(
        scope: 'all' | 'client' | 'tokens' | 'verifier' | 'discovery',
    ): Promise<void> {
        await this.store.clear(scope)
    }
}

export async function isMarketingMcpAuthorized(): Promise<boolean> {
    const tokens = await getMcpOAuthStore().read()
    return Boolean(tokens.tokens?.access_token)
}
