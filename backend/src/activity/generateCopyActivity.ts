import type { CopyGenerationInput } from '../types/activity'
import { runProviderChain, type MockFallback } from './aiProviderChain'
import { buildCopyGenerationPrompt, generateMockStructuredCopy } from './copyFormat'

interface OpenAIChoiceMessage {
    content: string
}

interface OpenAIChoice {
    message: OpenAIChoiceMessage
}

interface OpenAIResponseData {
    choices: OpenAIChoice[]
}

function generateMockCopy(input: CopyGenerationInput): string {
    return generateMockStructuredCopy({
        brandName: input.brandName,
        campaignGoal: input.campaignGoal,
        targetAudience: input.targetAudience,
        vibe: input.vibe,
        platform: input.platform,
    })
}

async function geminiCall(input: CopyGenerationInput): Promise<string> {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY environment variable is not set')
    }

    const { GoogleGenAI } = await import('@google/genai')
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    const prompt = buildCopyGenerationPrompt(input)

    try {
        const response = await ai.models.generateContent({
            model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
            contents: prompt,
        })
        return response.text?.trim() || generateMockCopy(input)
    } catch (error) {
        console.error('Gemini API error:', error)
        throw new Error(`Gemini API failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
}

async function openAICall(input: CopyGenerationInput): Promise<string> {
    if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY environment variable is not set')
    }

    const prompt = buildCopyGenerationPrompt(input)

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
                        content: 'You are a marketing copywriter. Generate platform-specific copy with a title line and multiple paragraphs exactly as requested.',
                    },
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
                temperature: 0.7,
            }),
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(`OpenAI API error: ${response.status} ${response.statusText} ${JSON.stringify(errorData)}`)
        }

        const data = (await response.json()) as OpenAIResponseData
        return data.choices[0].message.content?.trim() || generateMockCopy(input)
    } catch (error) {
        console.error('OpenAI API error:', error)
        throw new Error(`OpenAI API failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
}

export async function generateCopyActivity(input: CopyGenerationInput): Promise<string> {
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
        generate: () => deps.generateMockCopy(input),
    }

    return runProviderChain(input, providers, mockFallback)
}

export const deps = {
    geminiCall,
    openAICall,
    generateMockCopy,
}
