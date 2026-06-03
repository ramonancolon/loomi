import type { ImageGenerationInput } from '../types/activity'
import { persistCampaignImageDataUrl } from '../lib/campaignAssetStorage'
import { runProviderChain, type MockFallback } from './aiProviderChain'

function buildImagePrompt(input: ImageGenerationInput): string {
    const copyHint = input.copy?.trim()
        ? ` Marketing message to reflect visually: "${input.copy.slice(0, 200)}".`
        : ''

    return [
        `Create a professional marketing campaign hero image for the brand "${input.brandName}".`,
        `Campaign goal: ${input.campaignGoal}.`,
        `Visual style / vibe: ${input.vibe}.`,
        copyHint,
        'No watermarks. Avoid clutter. Suitable for a landing page banner.',
    ].join(' ')
}

function extractImageDataUrl(response: {
    candidates?: Array<{
        content?: {
            parts?: Array<{
                inlineData?: { data?: string; mimeType?: string }
            }>
        }
    }>
}): string | undefined {
    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data) {
            const mimeType = part.inlineData.mimeType || 'image/png'
            return `data:${mimeType};base64,${part.inlineData.data}`
        }
    }
    return undefined
}

// Mock image generation fallback
async function mockImageGeneration(input: ImageGenerationInput): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 1000))

    const productEncoded = encodeURIComponent(input.brandName)
    const descriptionEncoded = encodeURIComponent(input.campaignGoal)
    const vibeColors: Record<string, string> = {
        minimalist: '808080',
        vintage: 'd2691e',
        nature: '228b22',
        luxury: 'ffd700',
        tech: '1e90ff',
    }

    const color = vibeColors[input.vibe.toLowerCase()] || '333333'
    const bgColor = input.vibe.toLowerCase() === 'dark' ? '000000' : 'ffffff'

    return `https://placehold.co/800x400/${color}/${bgColor}?text=${productEncoded}:+${descriptionEncoded}`
}

async function geminiImageCall(input: ImageGenerationInput): Promise<string> {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY environment variable is not set')
    }

    const { GoogleGenAI } = await import('@google/genai')
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    const model = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image'

    const response = await ai.models.generateContent({
        model,
        contents: buildImagePrompt(input),
        config: {
            imageConfig: {
                aspectRatio: '16:9',
            },
        },
    })

    const imageDataUrl = extractImageDataUrl(response)
    if (!imageDataUrl) {
        throw new Error('Gemini image generation returned no image data')
    }

    return persistCampaignImageDataUrl(imageDataUrl)
}

export const deps = {
    geminiImageCall,
    mockImageGeneration,
}

export async function generateImageActivity(input: ImageGenerationInput): Promise<string> {
    const providers = [
        {
            name: 'Gemini Image',
            isAvailable: () => !!process.env.GEMINI_API_KEY,
            run: (inp: ImageGenerationInput) => deps.geminiImageCall(inp),
        },
    ]

    const mockFallback: MockFallback<string> = {
        generate: () => deps.mockImageGeneration(input),
    }

    return runProviderChain(input, providers, mockFallback)
}

generateImageActivity.__testable = { mockImageGeneration }
