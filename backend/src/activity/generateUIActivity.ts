import type { UIGenerationInput, UIGenerationOutput } from '../types/activity'
import { parseStructuredCopy } from './copyFormat'

// AI Provider Chain utility
import { runProviderChain, type MockFallback } from './aiProviderChain'

// Mock fallback types
interface OpenAIChoice {
    text: string
}

interface OpenAIResponse {
    choices: OpenAIChoice[]
}

interface OpenAIChoiceMessage {
    content: string
}

interface OpenAIChoice {
    message: OpenAIChoiceMessage
}

interface OpenAIResponseData {
    choices: OpenAIChoice[]
}

// API Key availability checks (dynamic evaluation)
const isGeminiAvailable = () => !!process.env.GEMINI_API_KEY
const isOpenAIAvailable = () => !!process.env.OPENAI_API_KEY

const CAMPAIGN_IMAGE_PLACEHOLDER = '__CAMPAIGN_IMAGE_URL__'
const FALLBACK_IMAGE_URL = 'https://placehold.co/800x450/e2e8f0/475569?text=Campaign+Visual'

function resolveImageUrl(imageUrl: string | undefined): string {
    return imageUrl?.trim() || FALLBACK_IMAGE_URL
}

/** Avoid sending multi-MB data URLs into LLM prompts — they hang requests. */
function describeImageForPrompt(imageUrl: string | undefined): string {
    const resolved = resolveImageUrl(imageUrl)
    if (resolved.startsWith('data:')) {
        return `Use src="${CAMPAIGN_IMAGE_PLACEHOLDER}" for the hero image (generated asset injected after generation).`
    }
    return `Use src="${CAMPAIGN_IMAGE_PLACEHOLDER}" for the hero image (source: ${resolved}).`
}

function injectCampaignImageUrl(component: string, imageUrl: string | undefined): string {
    const resolved = resolveImageUrl(imageUrl)
    return component.split(CAMPAIGN_IMAGE_PLACEHOLDER).join(resolved)
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

function normalizeGeneratedHtml(text: string): string {
    let html = text.replace(/```(?:html|tsx|jsx|javascript|react)?\s*/gi, '').replace(/```/g, '').trim()
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
    if (bodyMatch) {
        html = bodyMatch[1].trim()
    }
    const rootMatch = html.match(/<(div|section|main|article)[\s\S]*$/i)
    if (rootMatch && rootMatch.index !== undefined) {
        html = html.slice(rootMatch.index)
    }
    return html.trim()
}

function buildUiGenerationPrompt(input: UIGenerationInput, selectedVibe: VibeStyles): string {
    const { brandName: product, campaignGoal: description, vibe, copy } = input

    return `Generate a landing-page hero section as an HTML fragment using Tailwind CSS utility classes.

Product: ${product}
Description: ${description}
Marketing copy (may include a markdown title line starting with #):
${copy}
${describeImageForPrompt(input.imageUrl)}

Requirements:
1. Return ONLY raw HTML — no React, no JSX, no import/export, no markdown fences, no script tags.
2. Root element must be a single <div> or <section> with Tailwind classes.
3. Apply the ${vibe} theme with these colors:
   - Background: ${selectedVibe.bg}
   - Text: ${selectedVibe.text}
   - Accent: ${selectedVibe.accent}
   - Card: ${selectedVibe.card}
4. Layout: content on the left (title, copy paragraphs, two buttons) and hero image on the right.
5. Parse the marketing copy into a headline plus paragraph tags — do not dump the raw markdown string into one element.
6. Include "Get Started" and "Learn More" buttons styled with Tailwind.
7. The hero image must use src="${CAMPAIGN_IMAGE_PLACEHOLDER}" exactly on an <img> tag.

Return only the HTML fragment.`
}

// UI Generation Vibe Styles
interface VibeStyles {
    bg: string
    text: string
    accent: string
    card: string
}

const vibeStyles: Record<string, VibeStyles> = {
    minimalist: {
        bg: 'bg-white',
        text: 'text-gray-900',
        accent: 'text-black',
        card: 'bg-gray-50 border border-gray-200'
    },
    dark: {
        bg: 'bg-gray-950',
        text: 'text-white',
        accent: 'text-gray-400',
        card: 'bg-gray-900 border border-gray-800'
    },
    vibrant: {
        bg: 'bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500',
        text: 'text-white',
        accent: 'text-yellow-300',
        card: 'bg-white/20 backdrop-blur-md border border-white/30'
    },
    pastel: {
        bg: 'bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100',
        text: 'text-gray-800',
        accent: 'text-purple-500',
        card: 'bg-white/80 backdrop-blur-md border border-purple-200'
    },
    tech: {
        bg: 'bg-gray-950',
        text: 'text-cyan-400',
        accent: 'text-purple-500',
        card: 'bg-gray-900/80 backdrop-blur-md border border-cyan-500/30'
    },
    nature: {
        bg: 'bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50',
        text: 'text-emerald-950',
        accent: 'text-emerald-600',
        card: 'bg-white/70 backdrop-blur-md border border-emerald-200'
    },
    luxury: {
        bg: 'bg-gradient-to-br from-zinc-950 via-stone-900 to-amber-950',
        text: 'text-amber-50',
        accent: 'text-amber-300',
        card: 'bg-black/40 backdrop-blur-md border border-amber-500/30'
    },
}

// Mock UI generation — returns an HTML fragment the frontend can render directly.
export async function mockGenerateUI(input: UIGenerationInput): Promise<string> {
    const { vibe, copy, brandName } = input
    const selectedVibe = vibeStyles[vibe] || vibeStyles['minimalist']
    const safeImageUrl = resolveImageUrl(input.imageUrl)
    const parsed = parseStructuredCopy(copy)
    const headline = parsed.title ?? brandName
    const paragraphs = parsed.paragraphs.length > 0 ? parsed.paragraphs : [copy]
    const bodyHtml = paragraphs
        .map((paragraph) => `<p class="${selectedVibe.text} text-lg leading-relaxed opacity-90">${escapeHtml(paragraph)}</p>`)
        .join('\n                        ')

    return `<div class="min-h-[28rem] ${selectedVibe.bg} flex items-center justify-center p-6">
    <div class="max-w-5xl w-full ${selectedVibe.card} rounded-2xl p-8 shadow-2xl">
        <div class="flex flex-col md:flex-row gap-8 items-center">
            <div class="flex-1 space-y-5">
                <h1 class="${selectedVibe.text} text-4xl md:text-5xl font-bold leading-tight">${escapeHtml(headline)}</h1>
                ${bodyHtml}
                <div class="flex flex-wrap gap-4 pt-2">
                    <button type="button" class="${selectedVibe.accent} rounded-lg bg-white/15 px-6 py-3 font-semibold transition hover:bg-white/25">Get Started</button>
                    <button type="button" class="${selectedVibe.text} rounded-lg border-2 border-current px-6 py-3 font-semibold transition hover:bg-white/10">Learn More</button>
                </div>
            </div>
            <div class="flex-1 w-full">
                <div class="aspect-video overflow-hidden rounded-xl shadow-lg">
                    <img src="${safeImageUrl}" alt="${escapeHtml(brandName)}" class="h-full w-full object-cover" />
                </div>
            </div>
        </div>
    </div>
</div>`
}

// Export deps for unit tests
export const deps = {
    mockGenerateUI,
    geminiUICall,
    openAIUICall
}

// Gemini API call for UI generation
async function geminiUICall(input: UIGenerationInput): Promise<string> {
    const selectedVibe = vibeStyles[input.vibe] || vibeStyles['minimalist']
    const prompt = buildUiGenerationPrompt(input, selectedVibe)

    try {
        const { GoogleGenAI } = await import('@google/genai')
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY environment variable is not set')
        }
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
        const response = await ai.models.generateContent({
            model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
            contents: prompt,
        })
        const text = response.text || ''
        const cleanedText = normalizeGeneratedHtml(text)
        if (!cleanedText || !cleanedText.includes('<')) {
            throw new Error('Gemini returned invalid HTML layout')
        }

        return injectCampaignImageUrl(cleanedText, input.imageUrl)
    } catch (error) {
        console.error('Gemini UI generation failed:', error)
        throw error
    }
}

// OpenAI API call for UI generation
async function openAIUICall(input: UIGenerationInput): Promise<string> {
    const selectedVibe = vibeStyles[input.vibe] || vibeStyles['minimalist']
    const systemPrompt = 'You are a front-end developer expert in Tailwind CSS. Generate HTML fragments only — never React or JSX.'
    const userPrompt = buildUiGenerationPrompt(input, selectedVibe)

    try {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY environment variable is not set')
        }
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                temperature: 0.7,
                max_tokens: 2000,
            }),
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(`OpenAI API error: ${response.status} ${response.statusText} ${JSON.stringify(errorData)}`)
        }

        const data = (await response.json()) as OpenAIResponseData
        const text = data.choices?.[0]?.message?.content || ''
        const cleanedText = normalizeGeneratedHtml(text)
        if (!cleanedText || !cleanedText.includes('<')) {
            throw new Error('OpenAI returned invalid HTML layout')
        }

        return injectCampaignImageUrl(cleanedText, input.imageUrl)
    } catch (error) {
        console.error('OpenAI UI generation failed:', error)
        throw error
    }
}

// Main activity function with fallback chain
export async function generateUIActivity(input: UIGenerationInput): Promise<string> {
    const providers = [
        {
            name: 'Gemini',
            isAvailable: isGeminiAvailable,
            run: (inp: UIGenerationInput) => geminiUICall(inp),
        },
        {
            name: 'OpenAI',
            isAvailable: isOpenAIAvailable,
            run: (inp: UIGenerationInput) => openAIUICall(inp),
        },
    ]

    const mockFallback: MockFallback<string> = {
        generate: () => mockGenerateUI(input),
    }

    return runProviderChain(input, providers, mockFallback)
}
