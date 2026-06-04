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
            dispatchCampaignActivity: vi.fn().mockResolvedValue({ success: true }),
        }
    }
})

// We need to mock the workflow context before importing the workflow
vi.mock('@temporalio/workflow', () => {
    let handlers: Record<string, Function> = {}
    let conditionResolvers: Array<() => void> = []

    return {
        proxyActivities: () => mockActivities,
        defineQuery: (name: string) => name,
        defineSignal: (name: string) => name,
        condition: vi.fn().mockImplementation((predicateFn: () => boolean) => {
            return new Promise<void>((resolve) => {
                if (predicateFn()) {
                    resolve()
                } else {
                    conditionResolvers.push(resolve)
                }
            })
        }),
        setHandler: (query: any, handler: Function) => {
            handlers[query] = handler
        },
        sleep: vi.fn().mockResolvedValue(undefined),
        // Expose handlers for testing
        __getHandlers: () => handlers,
        __clearHandlers: () => { handlers = {} },
        __resolveCondition: () => {
            const resolver = conditionResolvers.shift()
            if (resolver) resolver()
        }
    }
})

import { CampaignGenerationWorkflow, getStatusQuery, getProgressQuery, getPartialResultsQuery, dispatchCampaignSignal } from './campaignGenerationWorkflow'

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
        mockActivities.dispatchCampaignActivity.mockResolvedValue({ success: true })
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

    it('should handle dispatch signal and update status to dispatched', async () => {
        const input = {
            brandName: 'Test Brand',
            campaignGoal: 'Test Goal',
            targetAudience: 'Test Audience',
            vibe: 'minimalist',
            platform: 'email'
        }

        const promise = CampaignGenerationWorkflow(input, 'test-workflow-id')

        // Wait for the workflow to reach the dispatch wait state
        await new Promise(resolve => setTimeout(resolve, 10))

        // Send the dispatch signal
        const workflowModule = await import('@temporalio/workflow')
        const handlers = (workflowModule as any).__getHandlers()
        if ('dispatchCampaign' in handlers) {
            handlers['dispatchCampaign']('Test Segment', 'Test Subject', '<html>Test Body</html>')
        }

        const result = await promise

        expect(result?.status).toBe('dispatched')
        expect(result?.progress).toBe(100)
        expect(result?.dispatchSegmentName).toBe('Test Segment')
        expect(result?.dispatchSubject).toBe('Test Subject')
        expect(result?.dispatchBodyHtml).toBe('<html>Test Body</html>')
        expect(mockActivities.dispatchCampaignActivity).toHaveBeenCalledWith({
            segmentName: 'Test Segment',
            subject: 'Test Subject',
            bodyHtml: '<html>Test Body</html>'
        })
    })

    it('should handle dispatch failure and update status to error', async () => {
        // Mock dispatch activity to fail
        mockActivities.dispatchCampaignActivity.mockResolvedValue({ success: false, errorMessage: 'Failed to connect' })

        const input = {
            brandName: 'Test Brand',
            campaignGoal: 'Test Goal',
            targetAudience: 'Test Audience',
            vibe: 'minimalist',
            platform: 'email'
        }

        const promise = CampaignGenerationWorkflow(input, 'test-workflow-id')

        // Wait for the workflow to reach the dispatch wait state
        await new Promise(resolve => setTimeout(resolve, 10))

        // Send the dispatch signal
        const handlers = (await import('@temporalio/workflow')).__getHandlers()
        if ('dispatchCampaign' in handlers) {
            handlers['dispatchCampaign']('Test Segment', 'Test Subject', '<html>Test Body</html>')
        }

        const result = await promise

        expect(result?.status).toBe('error')
        expect(result?.progress).toBe(100)
        expect(result?.errorMessage).toBe('Failed to dispatch campaign')
    })
})
