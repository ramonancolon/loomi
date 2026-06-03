import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001'

export async function POST(
    _request: NextRequest,
    { params }: { params: { id: string } },
): Promise<NextResponse> {
    const { id } = params

    try {
        const response = await fetch(`${BACKEND_URL}/api/campaigns/${id}/approve`, {
            method: 'POST',
        })

        if (!response.ok) {
            const errorData = (await response.json()) as { error?: string }
            return NextResponse.json(
                { error: errorData.error || 'Failed to approve campaign' },
                { status: response.status },
            )
        }

        const data = await response.json()
        return NextResponse.json(data, { status: response.status })
    } catch (error) {
        console.error('Error approving campaign:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
