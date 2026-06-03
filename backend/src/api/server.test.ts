import { describe, it, expect, beforeEach, vi, Mock } from 'vitest'
import request from 'supertest'
import { type WorkflowClient } from '@temporalio/client'
import { WorkflowNotFoundError } from '@temporalio/common'
import { CampaignRequest } from '../types/campaign'

vi.mock('../activity/generateCopyActivity', () => ({
    generateCopyActivity: vi.fn().mockResolvedValue('Rerolled copy'),
}))

vi.mock('../activity/generateCopyPreviewActivity', () => ({
    generateCopyPreviewActivity: vi.fn().mockResolvedValue('# Rerolled Preview\n\nNew preview paragraph.'),
}))

vi.mock('../activity/generateImageActivity', () => ({
    generateImageActivity: vi.fn().mockResolvedValue('https://example.com/rerolled.jpg'),
}))

vi.mock('../activity/generateUIActivity', () => ({
    generateUIActivity: vi.fn().mockResolvedValue('<div>Rerolled UI</div>'),
}))

import { createExpressApp } from './server'

// Mock the workflow client
const mockStart = vi.fn()
const mockGetHandle = vi.fn()
const mockQuery = vi.fn()
const mockSignal = vi.fn()

const mockWorkflowClient: WorkflowClient = {
    start: mockStart,
    execute: vi.fn(),
    getHandle: mockGetHandle,
    cancel: vi.fn(),
    terminate: vi.fn(),
    describe: vi.fn(),
    result: vi.fn(),
    signal: vi.fn(),
    query: vi.fn(),
    listNamespaces: vi.fn(),
    listWorkflows: vi.fn(),
    deleteNamespace: vi.fn(),
    update: vi.fn(),
} as any

describe('Express API Routes', () => {
    let app: any

    beforeEach(() => {
        vi.clearAllMocks()
        app = createExpressApp(mockWorkflowClient)
    })

    describe('GET /health', () => {
        it('should return health status', async () => {
            const response = await request(app).get('/health')
            expect(response.status).toBe(200)
            expect(response.body.status).toBe('ok')
            expect(response.body.timestamp).toBeDefined()
        })
    })

    describe('POST /api/campaigns', () => {
        it('should create a campaign successfully', async () => {
            const campaign: CampaignRequest = {
                brandName: 'Test Brand',
                campaignGoal: 'Test Goal',
                targetAudience: 'Test Audience',
                vibe: 'minimalist',
                platform: 'email'
            }

            mockStart.mockResolvedValue(undefined)

            const response = await request(app)
                .post('/api/campaigns')
                .send(campaign)
                .set('Content-Type', 'application/json')

            expect(response.status).toBe(202)
            expect(response.body.id).toBeDefined()
            expect(response.body.id).toContain('campaign-')
            expect(response.body.runId).toBe(response.body.id)
            expect(response.body.status).toBe('pending')
            expect(response.body.brandName).toBe('Test Brand')
            expect(response.body.campaignGoal).toBe('Test Goal')
            expect(response.body.targetAudience).toBe('Test Audience')
            expect(response.body.vibe).toBe('minimalist')
            expect(response.body.platform).toBe('email')
            expect(response.body.progress).toBe(0)
        })

        it('should return 400 if brandName is missing', async () => {
            const response = await request(app)
                .post('/api/campaigns')
                .send({
                    campaignGoal: 'Test Goal',
                    targetAudience: 'Test Audience',
                    vibe: 'minimalist',
                    platform: 'email'
                })
                .set('Content-Type', 'application/json')

            expect(response.status).toBe(400)
            expect(response.body.error).toContain('Validation failed')
        })

        it('should return 400 if campaignGoal is missing', async () => {
            const response = await request(app)
                .post('/api/campaigns')
                .send({
                    brandName: 'Test Brand',
                    targetAudience: 'Test Audience',
                    vibe: 'minimalist',
                    platform: 'email'
                })
                .set('Content-Type', 'application/json')

            expect(response.status).toBe(400)
            expect(response.body.error).toContain('Validation failed')
        })

        it('should return 400 if vibe is missing', async () => {
            const response = await request(app)
                .post('/api/campaigns')
                .send({
                    brandName: 'Test Brand',
                    campaignGoal: 'Test Goal',
                    targetAudience: 'Test Audience',
                    platform: 'email'
                })
                .set('Content-Type', 'application/json')

            expect(response.status).toBe(400)
            expect(response.body.error).toContain('Validation failed')
        })

        it('should return 500 if workflow execution fails', async () => {
            mockStart.mockRejectedValue(new Error('Workflow failed'))

            const response = await request(app)
                .post('/api/campaigns')
                .send({
                    brandName: 'Test Brand',
                    campaignGoal: 'Test Goal',
                    targetAudience: 'Test Audience',
                    vibe: 'minimalist',
                    platform: 'email'
                })
                .set('Content-Type', 'application/json')

            expect(response.status).toBe(500)
            expect(response.body.error).toBe('Failed to create campaign')
        })

        it('should generate unique workflow ID for each request', async () => {
            mockStart.mockResolvedValue(undefined)

            const response1 = await request(app)
                .post('/api/campaigns')
                .send({
                    brandName: 'Test Brand',
                    campaignGoal: 'Test Goal',
                    targetAudience: 'Test Audience',
                    vibe: 'minimalist',
                    platform: 'email'
                })
                .set('Content-Type', 'application/json')

            expect(response1.status).toBe(202)
            expect(response1.body.id).toBeDefined()

            mockStart.mockResolvedValue(undefined)

            const response2 = await request(app)
                .post('/api/campaigns')
                .send({
                    brandName: 'Test Brand 2',
                    campaignGoal: 'Test Goal 2',
                    targetAudience: 'Test Audience 2',
                    vibe: 'dark',
                    platform: 'social'
                })
                .set('Content-Type', 'application/json')

            expect(response2.status).toBe(202)
            expect(response2.body.id).toBeDefined()
            expect(response2.body.id).not.toBe(response1.body.id)
        })
    })

    describe('GET /api/campaigns/:id', () => {
        it('should return campaign status', async () => {
            const mockStatus = {
                id: 'test-workflow-id',
                status: 'complete',
                progress: 100,
                copy: 'Generated copy',
                imageUrl: 'https://example.com/image.jpg',
                uiComponent: 'Generated UI',
                errorMessage: null
            }

            const mockHandle = {
                query: mockQuery
            }

            mockQuery.mockImplementation((queryName) => {
                if (queryName === 'status') return 'complete'
                if (queryName === 'progress') return 100
                if (queryName === 'partialResults') return mockStatus
                return null
            })
            mockGetHandle.mockReturnValue(mockHandle)

            const response = await request(app)
                .get('/api/campaigns/test-workflow-id')
                .set('Content-Type', 'application/json')

            expect(response.status).toBe(200)
            expect(response.body.id).toBe('test-workflow-id')
            expect(response.body.status).toBe('complete')
            expect(response.body.progress).toBe(100)
            expect(response.body.copy).toBe('Generated copy')
        })

        it('should return 404 for non-existent workflow (WorkflowNotFoundError)', async () => {
            mockGetHandle.mockReturnValue({
                query: mockQuery
            })
            mockQuery.mockRejectedValue(new WorkflowNotFoundError('Workflow not found', 'non-existent-id', undefined))

            const response = await request(app)
                .get('/api/campaigns/non-existent-id')
                .set('Content-Type', 'application/json')

            expect(response.status).toBe(404)
            expect(response.body.error).toBe('Campaign not found')
        })

        it('should return 202 if workflow query fails (still running or not found)', async () => {
            mockGetHandle.mockReturnValue({
                query: mockQuery
            })
            mockQuery.mockRejectedValue(new Error('Query failed'))

            const response = await request(app)
                .get('/api/campaigns/non-existent-id')
                .set('Content-Type', 'application/json')

            expect(response.status).toBe(202)
            expect(response.body.status).toBe('pending')
        })

        it('should return error for empty workflow ID', async () => {
            const response = await request(app)
                .get('/api/campaigns/')
                .set('Content-Type', 'application/json')

            // This will likely return 404 or 500 depending on Express routing
            expect([404, 500]).toContain(response.status)
        })
    })

    describe('POST /api/campaigns/:id/reroll', () => {
        const partialResults = {
            id: 'campaign-123',
            brandName: 'Test Brand',
            campaignGoal: 'Test Goal',
            targetAudience: 'Test Audience',
            vibe: 'minimalist',
            platform: 'email',
            copy: 'Existing copy',
            imageUrl: 'https://example.com/image.jpg',
            uiComponent: '<div>UI</div>',
            copyPreviewBlurb: null,
            reasoningStream: [],
            status: 'complete' as const,
            progress: 100,
        }

        beforeEach(() => {
            mockGetHandle.mockReturnValue({ query: mockQuery })
            mockQuery.mockImplementation((queryName: string) => {
                if (queryName === 'status') return 'complete'
                if (queryName === 'progress') return 100
                if (queryName === 'partialResults') return partialResults
                return undefined
            })
        })

        it('should reroll marketing copy', async () => {
            const response = await request(app)
                .post('/api/campaigns/campaign-123/reroll')
                .send({ asset: 'copy' })
                .set('Content-Type', 'application/json')

            expect(response.status).toBe(200)
            expect(response.body).toEqual({ asset: 'copy', value: 'Rerolled copy' })
        })

        it('should reroll campaign visual when copy is available', async () => {
            const response = await request(app)
                .post('/api/campaigns/campaign-123/reroll')
                .send({ asset: 'image', copy: 'Existing copy' })
                .set('Content-Type', 'application/json')

            expect(response.status).toBe(200)
            expect(response.body.asset).toBe('image')
        })

        it('should return 400 for invalid asset', async () => {
            const response = await request(app)
                .post('/api/campaigns/campaign-123/reroll')
                .send({ asset: 'invalid' })
                .set('Content-Type', 'application/json')

            expect(response.status).toBe(400)
        })
    })

    describe('POST /api/campaigns/:id/reroll-preview', () => {
        const partialResults = {
            id: 'campaign-123',
            brandName: 'Test Brand',
            campaignGoal: 'Test Goal',
            targetAudience: 'Test Audience',
            vibe: 'minimalist',
            platform: 'email',
            copy: null,
            imageUrl: null,
            uiComponent: null,
            copyPreviewBlurb: '# Old Preview\n\nOld paragraph.',
            reasoningStream: [],
            status: 'recommendation_ready' as const,
            progress: 25,
        }

        beforeEach(() => {
            mockSignal.mockResolvedValue(undefined)
            mockGetHandle.mockReturnValue({ query: mockQuery, signal: mockSignal })
            mockQuery.mockImplementation((queryName: string) => {
                if (queryName === 'status') return 'recommendation_ready'
                if (queryName === 'progress') return 25
                if (queryName === 'partialResults') return partialResults
                return undefined
            })
        })

        it('should reroll copy preview before approval', async () => {
            const response = await request(app)
                .post('/api/campaigns/campaign-123/reroll-preview')
                .set('Content-Type', 'application/json')

            expect(response.status).toBe(200)
            expect(response.body).toEqual({
                copyPreviewBlurb: '# Rerolled Preview\n\nNew preview paragraph.',
            })
            expect(mockSignal).toHaveBeenCalledWith(
                'rerollCopyPreview',
                '# Rerolled Preview\n\nNew preview paragraph.',
            )
        })

        it('should return 400 when campaign is not awaiting approval', async () => {
            mockQuery.mockImplementation((queryName: string) => {
                if (queryName === 'status') return 'complete'
                if (queryName === 'progress') return 100
                if (queryName === 'partialResults') return { ...partialResults, status: 'complete', progress: 100 }
                return undefined
            })

            const response = await request(app)
                .post('/api/campaigns/campaign-123/reroll-preview')
                .set('Content-Type', 'application/json')

            expect(response.status).toBe(400)
            expect(response.body.error).toContain('before approval')
        })
    })

    describe('Error Handling', () => {
        it('should handle unhandled errors with 500 status', async () => {
            const response = await request(app).get('/test-error')
            expect(response.status).toBe(500)
            expect(response.body.error).toBe('Internal server error')
        })
    })

    describe('CORS Middleware', () => {
        it('should set CORS headers for OPTIONS request', async () => {
            const response = await request(app)
                .options('/api/campaigns')
                .set('Origin', 'http://localhost:5173')

            expect(response.status).toBe(204)
            expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173')
        })

        it('should set CORS headers for regular requests', async () => {
            const response = await request(app)
                .get('/health')
                .set('Origin', 'http://localhost:5173')

            expect(response.status).toBe(200)
            expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173')
        })
    })
})
