import { NextRequest, NextResponse } from 'next/server'
import type { CampaignRequest, CampaignResponse } from '@/types/campaign'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001'

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const body: CampaignRequest = await request.json()

        const response = await fetch(`${BACKEND_URL}/api/campaigns`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        })

        if (!response.ok) {
            const errorData = await response.json()
            return NextResponse.json({ error: errorData.error || 'Failed to create campaign' }, { status: response.status })
        }

        const data: CampaignResponse = await response.json()
        return NextResponse.json(data, { status: response.status })
    } catch (error) {
        console.error('Error creating campaign:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const url = new URL(request.url)
        const id = url.searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'Campaign ID is required' }, { status: 400 })
        }

        const response = await fetch(`${BACKEND_URL}/api/campaigns/${id}`)

        if (!response.ok) {
            const errorData = await response.json()
            return NextResponse.json({ error: errorData.error || 'Failed to get campaign' }, { status: response.status })
        }

        const data = await response.json()
        return NextResponse.json(data)
    } catch (error) {
        console.error('Error getting campaign:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}