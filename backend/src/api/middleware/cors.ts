import type { Request, Response, NextFunction } from 'express'
import { env } from '../../config/env'

export function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
    const origin = req.header('Origin')
    if (origin && env.CORS_ALLOWED_ORIGINS.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin)
        res.header('Vary', 'Origin')
    }
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD')
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Cache-Control')
    res.header('Access-Control-Expose-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') {
        res.status(204).end()
        return
    }
    next()
}
