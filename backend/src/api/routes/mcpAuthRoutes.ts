import { Router, type NextFunction, type Request, type Response } from 'express'
import { auth } from '@modelcontextprotocol/sdk/client/auth.js'
import { env } from '../../config/env'
import { getMcpConnectionStatus } from '../../mcp/connect'
import { getMarketingMcpOAuthProvider } from '../../mcp/oauthProvider'
import { finishOAuthFlow } from '../mcpAuthHtml'

type RouteHandler = (req: Request, res: Response) => Promise<void>

function asyncRoute(handler: RouteHandler) {
    return (req: Request, res: Response, next: NextFunction): void => {
        void handler(req, res).catch((error: unknown) => {
            console.error('MCP auth route error:', error)
            if (res.headersSent) {
                return
            }
            const message = error instanceof Error ? error.message : 'OAuth request failed'
            finishOAuthFlow(res, { success: false, message })
        })
    }
}

export function createMcpAuthRouter(): Router {
    const router = Router()

    router.get('/status', async (_req: Request, res: Response): Promise<void> => {
        const status = await getMcpConnectionStatus()
        res.json(status)
    })

    router.get('/login', asyncRoute(async (_req, res) => {
        let authorizationUrl: URL | undefined

        const provider = getMarketingMcpOAuthProvider((url) => {
            authorizationUrl = url
        })

        const result = await auth(provider, {
            serverUrl: env.MCP_MARKETING_URL,
        })

        if (result === 'AUTHORIZED') {
            finishOAuthFlow(res, {
                success: true,
                message: 'Marketing MCP is already connected.',
            })
            return
        }

        if (authorizationUrl) {
            res.redirect(authorizationUrl.toString())
            return
        }

        finishOAuthFlow(res, {
            success: false,
            message: 'OAuth redirect URL was not generated.',
        })
    }))

    router.get('/callback', asyncRoute(async (req, res) => {
        const code = typeof req.query.code === 'string' ? req.query.code : undefined
        const oauthError = typeof req.query.error === 'string' ? req.query.error : undefined

        if (oauthError) {
            const description = typeof req.query.error_description === 'string'
                ? req.query.error_description
                : oauthError
            finishOAuthFlow(res, { success: false, message: description })
            return
        }

        if (!code) {
            finishOAuthFlow(res, {
                success: false,
                message: 'Missing authorization code. Start sign-in again from Campaign Studio.',
            })
            return
        }

        const provider = getMarketingMcpOAuthProvider()

        const result = await auth(provider, {
            serverUrl: env.MCP_MARKETING_URL,
            authorizationCode: code,
        })

        if (result !== 'AUTHORIZED') {
            finishOAuthFlow(res, {
                success: false,
                message: 'OAuth callback did not complete authorization.',
            })
            return
        }

        finishOAuthFlow(res, {
            success: true,
            message: 'Marketing MCP connected successfully.',
        })
    }))

    router.post('/logout', async (_req: Request, res: Response): Promise<void> => {
        const provider = getMarketingMcpOAuthProvider()
        await provider.invalidateCredentials('all')
        res.json({ status: 'logged_out' })
    })

    return router
}
