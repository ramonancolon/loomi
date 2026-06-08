import { describe, it, expect, vi, beforeEach } from 'vitest'

// Hoist our mocks so we can change them dynamically in tests
const { mockActivities } = vi.hoisted(() => {
    return {
        mockActivities: {
            agentReasoningActivity: vi.fn().mockResolvedValue({
                recommendedVibe: 'minimalist',
                reasoningStream: ['Mock reasoning'],
                copyPreviewBlurb: '# Preview Title\n\nPreview paragraph one.',
            }),
            generateCopyActivity: vi.fn().mockResolvedValue('Mock copy'),
            generateImageActivity: vi.fn().mockResolvedValue('https://mock.image.url'),
            generateUIActivity: vi.fn().mockResolvedValue('<MockUI />'),
        }
    }
})

vi.mock('@temporalio/workflow', () => {
    let handlers: Record<string, Function> = {}

    return {
        proxyActivities: () => mockActivities,
        defineQuery: (name: string) => name,
        defineSignal: (name: string) => name,
        condition: vi.fn().mockResolvedValue(true),
        setHandler: (query: any, handler: Function) => {
            handlers[query] = handler
        },
        sleep: vi.fn().mockResolvedValue(undefined),
        // Expose handlers for testing
        __getHandlers: () => handlers,
        __clearHandlers: () => { handlers = {} }
    }
})

import { CampaignGenerationWorkflow, getStatusQuery, getProgressQuery, getPartialResultsQuery } from './campaignGenerationWorkflow'

describe('campaignGenerationWorkflow', () => {
    beforeEach(async () => {
        vi.clearAllMocks()
        const workflow = await import('@temporalio/workflow')
            ; (workflow as any).__clearHandlers()

        // Reset mock activities default behavior
        mockActivities.agentReasoningActivity.mockResolvedValue({
            recommendedVibe: 'minimalist',
            reasoningStream: ['Mock reasoning'],
            copyPreviewBlurb: '# Preview Title\n\nPreview paragraph one.',
        })
        mockActivities.generateCopyActivity.mockResolvedValue('Mock copy')
        mockActivities.generateImageActivity.mockResolvedValue('https://mock.image.url')
        mockActivities.generateUIActivity.mockResolvedValue('<MockUI />')
    })

    it('should execute the campaign generation workflow successfully', async () => {
        const input = {
            brandName: 'Test Brand',
            campaignGoal: 'Test Goal',
            targetAudience: 'Test Audience',
            vibe: 'minimalist',
            platform: 'email'
        }

        const promise = CampaignGenerationWorkflow(input, 'test-workflow-id')
        const result = await promise

        expect(result.status).toBe('complete')
        expect(result.progress).toBe(100)
        expect(result.copy).toBe('Mock copy')
        expect(result.imageUrl).toBe('https://mock.image.url')
        expect(result.uiComponent).toBe('<MockUI />')
    })

    it('should handle errors and update status accordingly', async () => {
        // Mock the copy activity to throw an error
        mockActivities.generateCopyActivity.mockRejectedValue(new Error('Activity failed'))

        const input = {
            brandName: 'Test Brand',
            campaignGoal: 'Test Goal',
            targetAudience: 'Test Audience',
            vibe: 'minimalist',
            platform: 'email'
        }

        const result = await CampaignGenerationWorkflow(input, 'test-workflow-id')

        expect(result?.status).toBe('error')
        expect(result?.progress).toBe(100)
        expect(result?.errorMessage).toBe('Activity failed')
    })

    it('should capture different error messages from failed activities', async () => {
        // Mock the image activity to throw a different error
        mockActivities.generateImageActivity.mockRejectedValue(new Error('Image generation failed: quota exceeded'))

        const input = {
            brandName: 'Test Brand',
            campaignGoal: 'Test Goal',
            targetAudience: 'Test Audience',
            vibe: 'minimalist',
            platform: 'email'
        }

        const result = await CampaignGenerationWorkflow(input, 'test-workflow-id')

        expect(result?.status).toBe('error')
        expect(result?.progress).toBe(100)
        expect(result?.errorMessage).toBe('Image generation failed: quota exceeded')
    })

})
