import { create } from 'zustand'
import type { AgentState } from '@/types/campaign'

interface CampaignStore {
    agentState: AgentState
    workflowId: string | null
    setAgentState: (state: Partial<AgentState>) => void
    setWorkflowId: (workflowId: string | null) => void
    reset: () => void
}

export const useCampaignStore = create<CampaignStore>((set) => ({
    agentState: {
        status: 'idle',
        reasoningStream: [],
    },
    workflowId: null,
    setAgentState: (state) =>
        set((prev) => ({
            agentState: { ...prev.agentState, ...state },
        })),
    setWorkflowId: (workflowId) => set({ workflowId }),
    reset: () =>
        set({
            agentState: {
                status: 'idle',
                reasoningStream: [],
            },
            workflowId: null,
        }),
}))