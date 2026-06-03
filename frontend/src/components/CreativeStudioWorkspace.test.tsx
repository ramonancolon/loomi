import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CreativeStudioWorkspace } from './CreativeStudioWorkspace'
import { useCampaignStore } from '@/store/useCampaignStore'

vi.mock('./McpConnectionBanner', () => ({
    McpConnectionBanner: () => null,
}))

// Mock fetch API
const mockFetch = vi.fn()

// Mock zustand store
vi.mock('@/store/useCampaignStore', () => ({
    useCampaignStore: vi.fn()
}))

// Mock response data
const mockCampaignResponse = {
    id: 'test-workflow-123',
}

const mockProgressResponse = {
    id: 'test-workflow-123',
    brandName: 'Nexus Athletics',
    campaignGoal: 'Win back customers',
    vibe: 'minimalist',
    copy: 'Test copy content',
    imageUrl: 'https://example.com/image.jpg',
    uiComponent: '<div>Test UI</div>',
    status: 'complete',
    progress: 100,
}

// Mock EventSource for SSE
class MockEventSource {
    url: string
    onmessage: ((this: MockEventSource, ev: MessageEvent) => any) | null = null
    onerror: ((this: MockEventSource, ev: Event) => any) | null = null
    close = vi.fn()
    static instances: MockEventSource[] = []

    constructor(url: string) {
        this.url = url
        MockEventSource.instances.push(this)
    }

    emit(data: any) {
        if (this.onmessage) {
            this.onmessage(new MessageEvent('message', {
                data: JSON.stringify(data)
            }))
        }
    }

    emitError(message: string) {
        if (this.onmessage) {
            this.onmessage(new MessageEvent('message', {
                data: JSON.stringify({ type: 'error', message })
            }))
        }
    }
}

describe('CreativeStudioWorkspace', () => {
    let mockStoreState: any

    beforeEach(() => {
        // Reset mocks before each test
        vi.clearAllMocks()
        // Mock fetch globally
        global.fetch = mockFetch
        // Mock EventSource globally
        MockEventSource.instances = []
        global.EventSource = MockEventSource as any

        // Reset store state
        mockStoreState = {
            agentState: { status: 'idle', reasoningStream: [] },
            workflowId: null,
            setAgentState: vi.fn((newState) => {
                mockStoreState.agentState = { ...mockStoreState.agentState, ...newState }
            }),
            setWorkflowId: vi.fn((id: string | null) => {
                mockStoreState.workflowId = id
            }),
            reset: vi.fn(() => {
                mockStoreState.agentState = { status: 'idle', reasoningStream: [] }
                mockStoreState.workflowId = null
            }),
        }

        vi.mocked(useCampaignStore).mockReturnValue(mockStoreState)
    })

    it('renders the form with all fields', () => {
        render(<CreativeStudioWorkspace />)

        // Check for form elements
        expect(screen.getByPlaceholderText('e.g., Nexus Athletics')).toBeInTheDocument()
        expect(screen.getByPlaceholderText(/Win back customers/)).toBeInTheDocument()
        expect(screen.getByPlaceholderText('e.g., Lapsed VIPs')).toBeInTheDocument()
        expect(screen.getByText('Launch Autonomous Agent')).toBeInTheDocument()
    })

    it('renders all vibe options', () => {
        render(<CreativeStudioWorkspace />)

        const vibeSelects = screen.getAllByRole('combobox')
        // vibe is the first combobox
        const vibeSelect = vibeSelects[0]
        
        fireEvent.click(vibeSelect)

        expect(screen.getByText('Auto (Let Agent Decide)')).toBeInTheDocument()
        expect(screen.getByText('Minimalist')).toBeInTheDocument()
        expect(screen.getByText('Vintage')).toBeInTheDocument()
    })

    it('updates form field values on input change', () => {
        render(<CreativeStudioWorkspace />)

        const brandInput = screen.getByPlaceholderText('e.g., Nexus Athletics')
        const goalInput = screen.getByPlaceholderText(/Win back customers/)
        const audienceInput = screen.getByPlaceholderText('e.g., Lapsed VIPs')

        fireEvent.change(brandInput, { target: { value: 'Test Brand' } })
        fireEvent.change(goalInput, { target: { value: 'Test Goal' } })
        fireEvent.change(audienceInput, { target: { value: 'Test Audience' } })

        expect(brandInput).toHaveValue('Test Brand')
        expect(goalInput).toHaveValue('Test Goal')
        expect(audienceInput).toHaveValue('Test Audience')
    })

    it('enables launch button with pre-filled demo brief', () => {
        render(<CreativeStudioWorkspace />)
        const launchButton = screen.getByText('Launch Autonomous Agent')
        expect(launchButton).toBeEnabled()
    })

    it('disables launch button when required fields are cleared', () => {
        render(<CreativeStudioWorkspace />)

        const brandInput = screen.getByPlaceholderText('e.g., Nexus Athletics')
        const goalInput = screen.getByPlaceholderText(/Win back customers/)
        const audienceInput = screen.getByPlaceholderText('e.g., Lapsed VIPs')

        fireEvent.change(brandInput, { target: { value: '' } })
        fireEvent.change(goalInput, { target: { value: '' } })
        fireEvent.change(audienceInput, { target: { value: '' } })

        const launchButton = screen.getByText('Launch Autonomous Agent')
        expect(launchButton).toBeDisabled()
    })

    it('calls fetch API on form submission', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockCampaignResponse,
        })

        render(<CreativeStudioWorkspace />)

        const brandInput = screen.getByPlaceholderText('e.g., Nexus Athletics')
        const goalInput = screen.getByPlaceholderText(/Win back customers/)
        const audienceInput = screen.getByPlaceholderText('e.g., Lapsed VIPs')

        fireEvent.change(brandInput, { target: { value: 'Test Brand' } })
        fireEvent.change(goalInput, { target: { value: 'Test Goal' } })
        fireEvent.change(audienceInput, { target: { value: 'Test Audience' } })

        const launchButton = screen.getByText('Launch Autonomous Agent')
        fireEvent.click(launchButton)

        // Wait for fetch to be called
        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledTimes(1)
        })

        // Check fetch was called with correct parameters
        expect(mockFetch).toHaveBeenCalledWith('/api/campaigns', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                brandName: 'Test Brand',
                campaignGoal: 'Test Goal',
                targetAudience: 'Test Audience',
                vibe: 'auto',
                platform: 'email',
            }),
        })
    })

    it('shows error state when generation fails', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 500,
            json: async () => ({ error: 'Failed to create campaign' }),
        })

        render(<CreativeStudioWorkspace />)

        const brandInput = screen.getByPlaceholderText('e.g., Nexus Athletics')
        const goalInput = screen.getByPlaceholderText(/Win back customers/)
        const audienceInput = screen.getByPlaceholderText('e.g., Lapsed VIPs')

        fireEvent.change(brandInput, { target: { value: 'Test Brand' } })
        fireEvent.change(goalInput, { target: { value: 'Test Goal' } })
        fireEvent.change(audienceInput, { target: { value: 'Test Audience' } })

        const launchButton = screen.getByText('Launch Autonomous Agent')
        fireEvent.click(launchButton)

        await waitFor(() => {
            expect(screen.getAllByText('Failed to create campaign')).toHaveLength(2)
        })
    })

    it('displays waiting state initially', () => {
        render(<CreativeStudioWorkspace />)
        expect(screen.getByText('Waiting for campaign brief')).toBeInTheDocument()
    })

    it('displays results when complete', async () => {
        mockStoreState.agentState = {
            status: 'complete',
            reasoningStream: [],
            recommendation: {
                copy: 'Generated copy',
                imageUrl: 'https://example.com/image.jpg',
                uiComponent: '<div>Generated UI</div>'
            }
        }
        mockStoreState.workflowId = 'test-workflow-123'
        vi.mocked(useCampaignStore).mockReturnValue(mockStoreState)

        render(<CreativeStudioWorkspace />)

        expect(screen.getByText('Generated Marketing Copy')).toBeInTheDocument()
        expect(screen.getByText('Generated copy')).toBeInTheDocument()
        expect(screen.getByText('Campaign Visual')).toBeInTheDocument()
        expect(screen.getByText('UI Layout Preview')).toBeInTheDocument()
        expect(screen.getAllByText('Download')).toHaveLength(3)
        expect(screen.getAllByText('Reroll')).toHaveLength(3)
        expect(screen.getAllByRole('button', { name: 'Reroll' })).toHaveLength(3)
        for (const button of screen.getAllByRole('button', { name: 'Reroll' })) {
            expect(button).toBeEnabled()
        }
    })

    it('disables asset reroll when workflow id is missing', () => {
        mockStoreState.agentState = {
            status: 'complete',
            reasoningStream: [],
            recommendation: {
                copy: 'Generated copy',
                imageUrl: 'https://example.com/image.jpg',
                uiComponent: '<div>Generated UI</div>',
            },
        }
        mockStoreState.workflowId = null
        vi.mocked(useCampaignStore).mockReturnValue(mockStoreState)

        render(<CreativeStudioWorkspace />)

        for (const button of screen.getAllByRole('button', { name: 'Reroll' })) {
            expect(button).toBeDisabled()
        }
    })
})
