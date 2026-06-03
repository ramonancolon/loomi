import type { Request, Response, NextFunction } from 'express'
import { finishOAuthFlow } from '../mcpAuthHtml'

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
    console.error('Unhandled error:', err)
    if (res.headersSent) {
        return
    }

    if (req.originalUrl.includes('/api/mcp/auth')) {
        finishOAuthFlow(res, {
            success: false,
            message: err.message || 'Internal server error',
        })
        return
    }

    res.status(500).json({ error: 'Internal server error' })
}
