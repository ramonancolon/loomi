import { NextRequest } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001'

export const dynamic = 'force-dynamic'

export async function GET(
    _request: NextRequest,
    { params }: { params: { id: string } },
): Promise<Response> {
    const { id } = params

    try {
        const backendResponse = await fetch(`${BACKEND_URL}/api/campaigns/${id}/progress`, {
            cache: 'no-store',
        })

        if (!backendResponse.ok || !backendResponse.body) {
            return new Response('Failed to connect to progress stream', {
                status: backendResponse.status,
            })
        }

        return new Response(backendResponse.body, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                Connection: 'keep-alive',
            },
        })
    } catch (error) {
        console.error('Error proxying progress stream:', error)
        return new Response('Internal server error', { status: 500 })
    }
}
