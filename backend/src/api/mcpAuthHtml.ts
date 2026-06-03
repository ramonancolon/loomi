import type { Response } from 'express'
import { env } from '../config/env'

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}

export function getAppReturnUrl(): string {
    return (
        process.env.FRONTEND_URL?.trim()
        || env.CORS_ALLOWED_ORIGINS[0]
        || 'http://localhost:3000'
    )
}

export function buildOAuthResultHtml(options: {
    success: boolean
    title: string
    message: string
    returnUrl: string
}): string {
    const title = escapeHtml(options.title)
    const message = escapeHtml(options.message)
    const returnUrl = escapeHtml(options.returnUrl)
    const accent = options.success ? '#059669' : '#dc2626'

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 32rem; margin: 3rem auto; padding: 0 1rem; color: #0f172a; background: #f8fafc; }
    h1 { color: ${accent}; font-size: 1.35rem; }
    p { line-height: 1.5; color: #475569; }
    a.button {
      display: inline-block; margin-top: 1rem; padding: 0.6rem 1rem;
      background: #0f172a; color: #fff; text-decoration: none; border-radius: 0.5rem;
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>${message}</p>
  <a class="button" href="${returnUrl}">Return to Campaign Studio</a>
</body>
</html>`
}

/** Send user back to the Next app (avoids a blank callback tab). */
export function finishOAuthFlow(
    res: Response,
    options: { success: boolean; message: string },
): void {
    const returnBase = getAppReturnUrl()
    const params = new URLSearchParams()
    params.set('mcp_auth', options.success ? 'success' : 'error')
    if (!options.success && options.message) {
        params.set('mcp_message', options.message.slice(0, 200))
    }

    try {
        res.redirect(302, `${returnBase}?${params.toString()}`)
    } catch {
        const title = options.success ? 'Bloomreach connected' : 'Sign-in issue'
        res.status(options.success ? 200 : 400)
        res.type('html')
        res.send(buildOAuthResultHtml({
            success: options.success,
            title,
            message: options.message,
            returnUrl: returnBase,
        }))
    }
}
