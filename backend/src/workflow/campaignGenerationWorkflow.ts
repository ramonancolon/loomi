import { proxyActivities, defineQuery, defineSignal, setHandler, condition } from '@temporalio/workflow'
import { ActivityFailure } from '@temporalio/common'
import type { CampaignRequest, CampaignResult, WorkflowStatus } from '../types/campaign'
import type { ReasoningResult } from '../activity/reasoningActivity'

// Import activity types
interface GenerateCopyActivity {
    (campaign: { brandName: string; campaignGoal: string; targetAudience?: string; vibe: string; platform: string }): Promise<string>
}

interface GenerateImageActivity {
    (input: { brandName: string; campaignGoal: string; vibe: string; copy: string }): Promise<string>
}

interface GenerateUIActivity {
    (input: { brandName: string; campaignGoal: string; vibe: string; copy: string; imageUrl: string }): Promise<string>
}

interface AgentReasoningActivity {
    (campaign: CampaignRequest): Promise<ReasoningResult>
}

interface DispatchCampaignActivity {
    (input: { segmentName: string; subject: string; bodyHtml: string }): Promise<{ success: boolean; dispatchedAt: string }>
}

const { agentReasoningActivity } = proxyActivities<{
    agentReasoningActivity: AgentReasoningActivity
}>({
    startToCloseTimeout: '3 minutes',
})

const { generateCopyActivity, generateImageActivity, generateUIActivity } = proxyActivities<{
    generateCopyActivity: GenerateCopyActivity
    generateImageActivity: GenerateImageActivity
    generateUIActivity: GenerateUIActivity
}>({
    startToCloseTimeout: '2 minutes',
})

const { dispatchCampaignActivity } = proxyActivities<{
    dispatchCampaignActivity: DispatchCampaignActivity
}>({
    startToCloseTimeout: '2 minutes',
})

// Define queries
export const getStatusQuery = defineQuery<WorkflowStatus>('status')
export const getProgressQuery = defineQuery<number>('progress')
export const getPartialResultsQuery = defineQuery<CampaignResult>('partialResults')

// Define signal
export const approveCampaignSignal = defineSignal('approveCampaign')
export const rerollCopyPreviewSignal = defineSignal<[string]>('rerollCopyPreview')
export const dispatchCampaignSignal = defineSignal<[string, string, string]>('dispatchCampaign')

function getWorkflowErrorMessage(error: unknown): string {
    if (error instanceof ActivityFailure) {
        const causeMessage = error.cause instanceof Error ? error.cause.message : undefined
        if (causeMessage && causeMessage !== 'Activity task failed') {
            return causeMessage
        }
        if (error.message && error.message !== 'Activity task failed') {
            return error.message
        }
    }
    if (error instanceof Error) {
        return error.message
    }
    return 'Generation failed'
}

export async function CampaignGenerationWorkflow(campaign: CampaignRequest, workflowId: string): Promise<CampaignResult> {
    // Workflow state
    let workflowStatus: WorkflowStatus = 'pending'
    let workflowProgress = 0
    let workflowCopy: string | null = null
    let workflowImageUrl: string | null = null
    let workflowUiComponent: string | null = null
    let copyPreviewBlurb: string | null = null
    let reasoningStream: string[] = []
    let strategyEvidence: string[] = []
    let usedDemoFallback = false
    let mcpToolsInvoked = false
    let mcpConnected = false
    let isApproved = false
    let isDispatched = false
    let finalVibe = campaign.vibe

    // Workflow state for error handling
    let errorMessage: string | undefined

    // Dispatch state
    let dispatchSegmentName = ''
    let dispatchSubject = ''
    let dispatchBodyHtml = ''

    // Register query handlers
    setHandler(getStatusQuery, () => workflowStatus)
    setHandler(getProgressQuery, () => workflowProgress)
    setHandler(getPartialResultsQuery, () => ({
        id: workflowId,
        brandName: campaign.brandName,
        campaignGoal: campaign.campaignGoal,
        targetAudience: campaign.targetAudience,
        platform: campaign.platform,
        vibe: finalVibe,
        copy: workflowCopy,
        imageUrl: workflowImageUrl,
        uiComponent: workflowUiComponent,
        copyPreviewBlurb,
        reasoningStream,
        evidence: strategyEvidence,
        usedDemoFallback,
        mcpToolsInvoked,
        mcpConnected,
        status: workflowStatus,
        progress: workflowProgress,
        errorMessage,
    }))

    // Register signal handler
    setHandler(approveCampaignSignal, () => {
        isApproved = true
    })

    setHandler(rerollCopyPreviewSignal, (newPreview: string) => {
        if (workflowStatus === 'recommendation_ready' && newPreview.trim()) {
            copyPreviewBlurb = newPreview.trim()
            reasoningStream = [...reasoningStream, 'Copy preview refreshed for review.']
        }
    })

    // Register dispatch signal handler
    setHandler(dispatchCampaignSignal, (segmentName: string, subject: string, bodyHtml: string) => {
        dispatchSegmentName = segmentName
        dispatchSubject = subject
        dispatchBodyHtml = bodyHtml
        isDispatched = true
    })

    try {
        // Phase 1: Understand & Decide (Agent Reasoning)
        workflowStatus = 'reasoning'
        workflowProgress = 10

        const reasoningResult = await agentReasoningActivity(campaign)
        reasoningStream = reasoningResult.reasoningStream
        strategyEvidence = reasoningResult.evidence
        usedDemoFallback = reasoningResult.usedDemoFallback
        mcpToolsInvoked = reasoningResult.mcpToolsInvoked
        mcpConnected = reasoningResult.mcpConnected
        finalVibe = reasoningResult.recommendedVibe
        copyPreviewBlurb = reasoningResult.copyPreviewBlurb

        // Phase 2: Recommend (Wait for Human Approval)
        workflowStatus = 'recommendation_ready'
        workflowProgress = 25

        // Pause workflow until signal is received
        await condition(() => isApproved)

        // Human approved
        workflowStatus = 'approved'
        workflowProgress = 30

        // Phase 3: Act (Execute final generation based on the decided strategy)
        const generationInput = {
            brandName: campaign.brandName,
            campaignGoal: campaign.campaignGoal,
            targetAudience: campaign.targetAudience,
            vibe: finalVibe,
            platform: campaign.platform,
        }

        workflowStatus = 'copy_gen'
        workflowProgress = 40
        const copy = await generateCopyActivity(generationInput)
        workflowCopy = copy

        workflowStatus = 'image_gen'
        workflowProgress = 60
        const imageUrl = await generateImageActivity({ ...generationInput, copy })
        workflowImageUrl = imageUrl

        workflowStatus = 'ui_layout_gen'
        workflowProgress = 85
        const uiComponent = await generateUIActivity({ ...generationInput, copy, imageUrl })
        workflowUiComponent = uiComponent

        workflowStatus = 'complete'
        workflowProgress = 100

        // Wait for dispatch signal after completion
        await condition(() => isDispatched)

        // Dispatch the campaign
        workflowStatus = 'dispatching'
        workflowProgress = 100

        try {
            const dispatchResult = await dispatchCampaignActivity({
                segmentName: dispatchSegmentName,
                subject: dispatchSubject,
                bodyHtml: dispatchBodyHtml,
            })

            if (dispatchResult.success) {
                workflowStatus = 'dispatched'
            } else {
                workflowStatus = 'error'
                errorMessage = 'Failed to dispatch campaign'
            }
        } catch (dispatchError) {
            workflowStatus = 'error'
            errorMessage = getWorkflowErrorMessage(dispatchError)
        }

        return {
            id: workflowId,
            brandName: campaign.brandName,
            campaignGoal: campaign.campaignGoal,
            targetAudience: campaign.targetAudience,
            platform: campaign.platform,
            vibe: finalVibe,
            copy,
            imageUrl,
            uiComponent,
            copyPreviewBlurb,
            reasoningStream,
            evidence: strategyEvidence,
            usedDemoFallback,
            mcpToolsInvoked,
            mcpConnected,
            status: workflowStatus,
            progress: workflowProgress,
            dispatchSegmentName,
            dispatchSubject,
            dispatchBodyHtml,
            dispatchSuccess: workflowStatus === 'dispatched',
            dispatchErrorMessage: errorMessage,
        }
    } catch (error) {
        workflowStatus = 'error'
        workflowProgress = 100
        errorMessage = getWorkflowErrorMessage(error)

        return {
            id: workflowId,
            brandName: campaign.brandName,
            campaignGoal: campaign.campaignGoal,
            targetAudience: campaign.targetAudience,
            platform: campaign.platform,
            vibe: finalVibe,
            copy: workflowCopy,
            imageUrl: workflowImageUrl,
            uiComponent: workflowUiComponent,
            copyPreviewBlurb,
            reasoningStream,
            evidence: strategyEvidence,
            usedDemoFallback,
            mcpToolsInvoked,
            mcpConnected,
            status: 'error',
            progress: 100,
            errorMessage,
        }
    }
}
