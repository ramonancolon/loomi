/** @type {import('next').NextConfig} */
const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001'

const nextConfig = {
    output: 'standalone',
    reactStrictMode: true,
    images: {
        remotePatterns: [
            { protocol: 'http', hostname: 'localhost' },
            { protocol: 'https', hostname: '**' },
        ],
    },
    async rewrites() {
        // Campaign routes (/api/campaigns/*) are handled by local route handlers
        // in app/api so SSE streaming isn't broken by the dev proxy's gzip buffering.
        // Other backend endpoints (e.g. MCP auth) are proxied directly.
        return [
            {
                source: '/api/mcp/:path*',
                destination: `${backendUrl}/api/mcp/:path*`,
            },
        ]
    },
}

export default nextConfig
