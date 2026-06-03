import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { env } from '../config/env'

const ASSET_DIR = path.join(process.cwd(), '.generated-assets')

function extensionForMime(mimeType: string): string {
    if (mimeType.includes('png')) return 'png'
    if (mimeType.includes('webp')) return 'webp'
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg'
    return 'png'
}

/** Persist a data URL to disk and return a small HTTP URL for Temporal workflow state. */
export async function persistCampaignImageDataUrl(dataUrl: string): Promise<string> {
    const trimmed = dataUrl.trim()
    if (!trimmed.startsWith('data:')) {
        return trimmed
    }

    const match = trimmed.match(/^data:([^;]+);base64,(.+)$/s)
    if (!match) {
        throw new Error('Invalid image data URL returned from image generation')
    }

    const [, mimeType, base64Payload] = match
    const filename = `${randomUUID()}.${extensionForMime(mimeType)}`
    await mkdir(ASSET_DIR, { recursive: true })
    await writeFile(path.join(ASSET_DIR, filename), Buffer.from(base64Payload, 'base64'))

    return `${env.PUBLIC_API_BASE_URL}/api/assets/${filename}`
}

export function getCampaignAssetDirectory(): string {
    return ASSET_DIR
}
