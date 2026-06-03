import type { CopyGenerationInput } from '../types/activity'
import { runProviderChain, type MockFallback } from './aiProviderChain'
import { buildCopyPreviewPrompt, generateMockStructuredCopy } from './copyFormat'

interface OpenAIChoiceMessage {
    content: string
}

interface OpenAIChoice {
    message: OpenAIChoiceMessage
}

interface OpenAIResponseData {
    choices: OpenAIChoice[]
}

function generateMockPreview(input: CopyGenerationInput): string {
    return generateMockStructuredCopy({
        brandName: input.brandName,
        campaignGoal: input.campaignGoal,
        targetAudience: input.targetAudience,
        vibe: input.vibe,
        platform: input.platform,
        preview: true,
    })
}

async function geminiCall(input: CopyGenerationInput): Promise<string> {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY environment variable is not set')
    }

    const { GoogleGenAI } = await import('@google/genai')
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    const prompt = buildCopyPreviewPrompt({
        brandName: input.brandName,
        campaignGoal: input.campaignGoal,
        targetAudience: input.targetAudience ?? '',
        vibe: input.vibe,
        platform: input.platform,
    })

    try {
        const response = await ai.models.generateContent({
            model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
            contents: prompt,
        })
        return response.text?.trim() || generateMockPreview(input)
    } catch (error) {
        console.error('Gemini API error:', error)
        throw new Error(`Gemini API failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
}

async function openAICall(input: CopyGenerationInput): Promise<string> {
    if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY environment variable is not set')
    }

    const prompt = buildCopyPreviewPrompt({
        brandName: input.brandName,
        campaignGoal: input.campaignGoal,
        targetAudience: input.targetAudience ?? '',
        vibe: input.vibe,
        platform: input.platform,
    })

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a marketing copywriter. Generate a short platform-specific copy preview with a title line and preview paragraphs exactly as requested.',
                    },
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
                temperature: 0.9,
            }),
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(`OpenAI API error: ${response.status} ${response.statusText} ${JSON.stringify(errorData)}`)
        }

        const data = (await response.json()) as OpenAIResponseData
        return data.choices[0].message.content?.trim() || generateMockPreview(input)
    } catch (error) {
        console.error('OpenAI API error:', error)
        throw new Error(`OpenAI API failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
}

export async function generateCopyPreviewActivity(input: CopyGenerationInput): Promise<string> {
    const providers = [
        {
            name: 'Gemini',
            isAvailable: () => !!process.env.GEMINI_API_KEY,
            run: (inp: CopyGenerationInput) => deps.geminiCall(inp),
        },
        {
            name: 'OpenAI',
            isAvailable: () => !!process.env.OPENAI_API_KEY,
            run: (inp: CopyGenerationInput) => deps.openAICall(inp),
        },
    ]

    const mockFallback: MockFallback<string> = {
        generate: () => deps.generateMockPreview(input),
    }

    return runProviderChain(input, providers, mockFallback)
}

export const deps = {
    geminiCall,
    openAICall,
    generateMockPreview,
}
