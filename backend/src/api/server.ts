import express, { type Request, type Response } from 'express'
import path from 'node:path'
import { type WorkflowClient } from '@temporalio/client'
import { getCampaignAssetDirectory } from '../lib/campaignAssetStorage'
import { corsMiddleware } from './middleware/cors'
import { errorHandler } from './middleware/errorHandler'
import { createCampaignRouter } from './routes/campaignRoutes'
import { createMcpAuthRouter } from './routes/mcpAuthRoutes'

export function createExpressApp(workflowClient: WorkflowClient): express.Express {
    const app = express()

    app.use(express.json())
    app.use(express.urlencoded({ extended: true }))
    app.use(corsMiddleware)

    app.get('/health', (_req: Request, res: Response): void => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() })
    })

    app.use(
        '/api/assets',
        express.static(getCampaignAssetDirectory(), { maxAge: '1d', fallthrough: false }),
    )

    app.use('/api/campaigns', createCampaignRouter(workflowClient))
    app.use('/api/mcp/auth', createMcpAuthRouter())

    if (process.env.NODE_ENV === 'test') {
        app.get('/test-error', (_req: Request, _res: Response): void => {
            throw new Error('Test error')
        })
    }

    app.use(errorHandler)

    return app
}
