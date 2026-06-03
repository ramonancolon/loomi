export interface PlatformCopySpec {
    label: string
    titleGuide: string
    paragraphCount: number
    paragraphGuide: string
    previewParagraphCount: number
}

const PLATFORM_COPY_SPECS: Record<string, PlatformCopySpec> = {
    email: {
        label: 'Email Campaign',
        titleGuide: '6–10 words, reads like a subject line or hero headline',
        paragraphCount: 3,
        paragraphGuide: '2–3 sentences each; opener, value, soft CTA',
        previewParagraphCount: 2,
    },
    social: {
        label: 'Social Media Post',
        titleGuide: '5–8 words, punchy scroll-stopping hook',
        paragraphCount: 2,
        paragraphGuide: '1–2 short sentences each; hook plus CTA',
        previewParagraphCount: 1,
    },
    landing_page: {
        label: 'Landing Page',
        titleGuide: '4–8 words, bold hero headline',
        paragraphCount: 4,
        paragraphGuide: '2–4 sentences each; hero, benefit, proof, conversion CTA',
        previewParagraphCount: 2,
    },
}

export function getPlatformCopySpec(platform: string): PlatformCopySpec {
    return PLATFORM_COPY_SPECS[platform] ?? PLATFORM_COPY_SPECS.email
}

export interface StructuredCopy {
    title?: string
    paragraphs: string[]
}

export function parseStructuredCopy(copy: string): StructuredCopy {
    const trimmed = copy.trim()
    const match = trimmed.match(/^#\s+(.+?)(?:\n\n([\s\S]*))?$/)

    if (!match) {
        return {
            paragraphs: trimmed ? [trimmed] : [],
        }
    }

    const title = match[1]?.trim()
    const body = match[2]?.trim() ?? ''
    const paragraphs = body
        ? body.split(/\n\n+/).map((paragraph) => paragraph.trim()).filter(Boolean)
        : []

    return { title, paragraphs }
}

export function formatStructuredCopy(title: string, paragraphs: string[]): string {
    const body = paragraphs.map((paragraph) => paragraph.trim()).filter(Boolean).join('\n\n')
    return body ? `# ${title.trim()}\n\n${body}` : `# ${title.trim()}`
}

export function buildCopyGenerationPrompt(input: {
    brandName: string
    campaignGoal: string
    targetAudience?: string
    vibe: string
    platform: string
}): string {
    const spec = getPlatformCopySpec(input.platform)
    const audienceLine = input.targetAudience
        ? `Target audience: ${input.targetAudience}\n`
        : ''

    return `Generate ${spec.label} marketing copy for the brand "${input.brandName}".
Campaign goal: ${input.campaignGoal}
${audienceLine}Tone / vibe: ${input.vibe}

Structure requirements:
- Title: ${spec.titleGuide}
- Body: exactly ${spec.paragraphCount} paragraphs (${spec.paragraphGuide})

Return ONLY the copy in this exact format (no markdown besides the title line):
# <Title>

<Paragraph 1>

<Paragraph 2>
...`
}

export function buildCopyPreviewPrompt(input: {
    brandName: string
    campaignGoal: string
    targetAudience: string
    vibe: string
    platform: string
}): string {
    const spec = getPlatformCopySpec(input.platform)

    return `Write a short preview of ${spec.label} copy for approval review.
Brand: ${input.brandName}
Goal: ${input.campaignGoal}
Audience: ${input.targetAudience}
Tone: ${input.vibe}

Return ONLY:
# <Title>

${Array.from({ length: spec.previewParagraphCount }, (_, index) => `<Preview paragraph ${index + 1}>`).join('\n\n')}

Keep it concise — this is a preview blurb, not the final asset.`
}

function titleFromBrandAndGoal(brandName: string, campaignGoal: string, platform: string): string {
    const goalSnippet = campaignGoal.split(/\s+/).slice(0, 6).join(' ')
    if (platform === 'social') {
        return `${brandName}: ${goalSnippet}`
    }
    if (platform === 'landing_page') {
        return `${brandName} — ${goalSnippet}`
    }
    return `${brandName}: ${goalSnippet}`
}

export function generateMockStructuredCopy(input: {
    brandName: string
    campaignGoal: string
    targetAudience?: string
    vibe: string
    platform: string
    preview?: boolean
}): string {
    const spec = getPlatformCopySpec(input.platform)
    const paragraphCount = input.preview ? spec.previewParagraphCount : spec.paragraphCount
    const title = titleFromBrandAndGoal(input.brandName, input.campaignGoal, input.platform)
    const audience = input.targetAudience ? ` for ${input.targetAudience}` : ''

    const paragraphTemplates: Record<string, string[]> = {
        email: [
            `${input.brandName} is ready to ${input.campaignGoal.toLowerCase()}${audience}. This ${input.vibe} email opens with a clear reason to care and a focused benefit.`,
            `Highlight what makes the offer timely, why it fits the reader, and what action they should take next without feeling rushed.`,
            `Close with a confident invitation to explore the collection and claim the next step today.`,
        ],
        social: [
            `${input.campaignGoal} — built ${input.vibe}${audience}. Tap in, react, and share if this speaks to you.`,
            `Follow for the drop, DM us with questions, or visit the link in bio to see more.`,
        ],
        landing_page: [
            `Welcome to ${input.brandName}. We built this experience to ${input.campaignGoal.toLowerCase()}${audience}.`,
            `Every detail is tuned for a ${input.vibe} feel — clear headline, strong proof, and a path to action above the fold.`,
            `See the featured offer, compare options quickly, and understand why this campaign matters right now.`,
            `Ready when you are. Start below and take the next step with confidence.`,
        ],
    }

    const templates = paragraphTemplates[input.platform] ?? paragraphTemplates.email
    return formatStructuredCopy(title, templates.slice(0, paragraphCount))
}
