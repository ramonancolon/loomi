import { Router, type Request, type Response } from 'express'
import { type WorkflowClient } from '@temporalio/client'
import { WorkflowNotFoundError } from '@temporalio/common'
import { CampaignGenerationWorkflow } from '../../workflow/campaignGenerationWorkflow'
import type { CampaignRequest, CampaignResponse, CampaignResult, CampaignStatusResponse } from '../../types/campaign'
import type { WorkflowStatus } from '../../types/campaign'
import { CampaignRequestSchema, RerollAssetSchema } from '../validation/campaignSchema'
import { generateCopyActivity } from '../../activity/generateCopyActivity'
import { generateCopyPreviewActivity } from '../../activity/generateCopyPreviewActivity'
import { generateImageActivity } from '../../activity/generateImageActivity'
import { generateUIActivity } from '../../activity/generateUIActivity'
import {
    buildStatusResponse,
    createPendingCampaignResponse,
    createPendingStatusFallback,
} from '../campaignResponse'
import { env } from '../../config/env'

function createWorkflowId(): string {
    return `campaign-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

async function queryWorkflowState(
    workflowClient: WorkflowClient,
    id: string,
): Promise<{ status: WorkflowStatus; progress: number; partialResults: CampaignResult }> {
    const handle = workflowClient.getHandle(id)
    const status = await handle.query<WorkflowStatus>('status')
    const progress = await handle.query<number>('progress')
    const partialResults = await handle.query<CampaignResult>('partialResults')
    return { status, progress, partialResults }
}

export function createCampaignRouter(workflowClient: WorkflowClient): Router {
    const router = Router()

    router.post('/', async (req: Request<{}, {}, CampaignRequest>, res: Response<CampaignResponse | { error: string }>): Promise<void> => {
        try {
            const validation = CampaignRequestSchema.safeParse(req.body)
            if (!validation.success) {
                const errors = validation.error.issues.map((issue) => issue.message).join(', ')
                res.status(400).json({ error: `Validation failed: ${errors}` })
                return
            }

            const campaign = validation.data
            const workflowId = createWorkflowId()

            await workflowClient.start(CampaignGenerationWorkflow, {
                workflowId,
                taskQueue: env.TEMPORAL_TASK_QUEUE,
                args: [campaign, workflowId],
            })

            res.status(202).json(createPendingCampaignResponse(workflowId, campaign))
        } catch (error) {
            console.error('Error creating campaign:', error)
            res.status(500).json({ error: 'Failed to create campaign' })
        }
    })

    router.get('/:id', async (req: Request<{ id: string }>, res: Response<CampaignStatusResponse | { error: string }>): Promise<void> => {
        try {
            const { id } = req.params
            try {
                const { status, progress, partialResults } = await queryWorkflowState(workflowClient, id)
                res.json(buildStatusResponse(id, status, progress, partialResults))
            } catch (error) {
                if (error instanceof WorkflowNotFoundError) {
                    // Workflow never existed or was completed and cleaned up
                    res.status(404).json({ error: 'Campaign not found' })
                } else {
                    // Transient query failures (workflow still running, connection issues, etc.)
                    res.status(202).json(
                        createPendingStatusFallback(id, 'Workflow still running or not found'),
                    )
                }
            }
        } catch (error) {
            console.error('Error getting campaign status:', error)
            res.status(500).json({ error: 'Failed to get campaign status' })
        }
    })

    router.post('/:id/approve', async (req: Request<{ id: string }>, res: Response): Promise<void> => {
        try {
            const { id } = req.params
            const handle = workflowClient.getHandle(id)
            await handle.signal('approveCampaign')
            res.status(200).json({ success: true })
        } catch (error) {
            console.error('Error approving campaign:', error)
            res.status(500).json({ error: 'Failed to approve campaign' })
        }
    })

    router.post('/:id/reroll-preview', async (req: Request<{ id: string }>, res: Response): Promise<void> => {
        try {
            const { id } = req.params

            let status: WorkflowStatus
            let partialResults: CampaignResult
            try {
                const state = await queryWorkflowState(workflowClient, id)
                status = state.status
                partialResults = state.partialResults
            } catch (error) {
                if (error instanceof WorkflowNotFoundError) {
                    res.status(404).json({ error: 'Campaign not found' })
                    return
                }
                res.status(500).json({ error: 'Failed to load campaign state' })
                return
            }

            if (status !== 'recommendation_ready') {
                res.status(400).json({ error: 'Copy preview can only be rerolled before approval' })
                return
            }

            const generationInput = {
                brandName: partialResults.brandName,
                campaignGoal: partialResults.campaignGoal,
                targetAudience: partialResults.targetAudience,
                vibe: partialResults.vibe,
                platform: partialResults.platform,
            }

            const copyPreviewBlurb = await generateCopyPreviewActivity(generationInput)
            const handle = workflowClient.getHandle(id)
            await handle.signal('rerollCopyPreview', copyPreviewBlurb)

            res.status(200).json({ copyPreviewBlurb })
        } catch (error) {
            console.error('Error rerolling copy preview:', error)
            res.status(500).json({ error: 'Failed to reroll copy preview' })
        }
    })

    router.post('/:id/reroll', async (req: Request<{ id: string }>, res: Response): Promise<void> => {
        try {
            const validation = RerollAssetSchema.safeParse(req.body)
            if (!validation.success) {
                const errors = validation.error.issues.map((issue) => issue.message).join(', ')
                res.status(400).json({ error: `Validation failed: ${errors}` })
                return
            }

            const { id } = req.params
            const { asset, copy: copyOverride, imageUrl: imageOverride } = validation.data

            let partialResults: CampaignResult
            try {
                const state = await queryWorkflowState(workflowClient, id)
                partialResults = state.partialResults
            } catch (error) {
                if (error instanceof WorkflowNotFoundError) {
                    res.status(404).json({ error: 'Campaign not found' })
                    return
                }
                res.status(500).json({ error: 'Failed to load campaign state' })
                return
            }

            const generationInput = {
                brandName: partialResults.brandName,
                campaignGoal: partialResults.campaignGoal,
                targetAudience: partialResults.targetAudience,
                vibe: partialResults.vibe,
                platform: partialResults.platform,
            }

            const currentCopy = copyOverride ?? partialResults.copy ?? undefined
            const currentImageUrl = imageOverride ?? partialResults.imageUrl ?? undefined

            let value: string
            switch (asset) {
                case 'copy':
                    value = await generateCopyActivity(generationInput)
                    break
                case 'image':
                    if (!currentCopy) {
                        res.status(400).json({ error: 'Marketing copy is required before rerolling the visual' })
                        return
                    }
                    value = await generateImageActivity({ ...generationInput, copy: currentCopy })
                    break
                case 'ui':
                    if (!currentCopy || !currentImageUrl) {
                        res.status(400).json({ error: 'Copy and visual are required before rerolling the UI layout' })
                        return
                    }
                    value = await generateUIActivity({
                        ...generationInput,
                        copy: currentCopy,
                        imageUrl: currentImageUrl,
                    })
                    break
            }

            res.status(200).json({ asset, value })
        } catch (error) {
            console.error('Error rerolling campaign asset:', error)
            res.status(500).json({ error: 'Failed to reroll asset' })
        }
    })

    router.get('/:id/progress', (req: Request<{ id: string }>, res: Response): void => {
        const { id } = req.params
        const origin = req.header('Origin')
        if (origin && env.CORS_ALLOWED_ORIGINS.includes(origin)) {
            res.setHeader('Access-Control-Allow-Origin', origin)
        }

        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Connection', 'keep-alive')

        const writeEvent = (payload: unknown): void => {
            res.write(`data: ${JSON.stringify(payload)}\n\n`)
        }

        writeEvent({ type: 'connected', timestamp: new Date().toISOString() })

        let intervalId: NodeJS.Timeout | undefined
        let closed = false

        const closeStream = (): void => {
            if (closed) return
            closed = true
            if (intervalId) clearInterval(intervalId)
            res.end()
        }

        const sendUpdate = async (): Promise<void> => {
            if (closed) return
            try {
                const { status, progress, partialResults } = await queryWorkflowState(workflowClient, id)
                writeEvent({
                    type: 'progress',
                    status,
                    progress,
                    vibe: partialResults.vibe,
                    copy: partialResults.copy,
                    imageUrl: partialResults.imageUrl,
                    uiComponent: partialResults.uiComponent,
                    copyPreviewBlurb: partialResults.copyPreviewBlurb,
                    reasoningStream: partialResults.reasoningStream ?? [],
                    errorMessage: partialResults.errorMessage ?? null,
                    timestamp: new Date().toISOString(),
                })

                if (status === 'complete' || status === 'error') {
                    closeStream()
                }
            } catch {
                writeEvent({ type: 'error', message: 'Workflow not found or terminated' })
                closeStream()
            }
        }

        void sendUpdate()
        intervalId = setInterval(() => {
            void sendUpdate()
        }, 1000)

        req.on('close', closeStream)
    })

    return router
}
