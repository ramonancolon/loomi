function sanitizeFilename(name: string): string {
    return name.replace(/[^a-z0-9-_]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'campaign'
}

function triggerDownload(href: string, filename: string): void {
    const anchor = document.createElement('a')
    anchor.href = href
    anchor.download = filename
    anchor.rel = 'noopener'
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
}

export function downloadTextAsset(filename: string, content: string, mimeType = 'text/plain;charset=utf-8'): void {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    triggerDownload(url, filename)
    URL.revokeObjectURL(url)
}

export async function downloadImageAsset(filename: string, imageUrl: string): Promise<void> {
    if (imageUrl.startsWith('data:')) {
        triggerDownload(imageUrl, filename)
        return
    }

    const response = await fetch(imageUrl)
    if (!response.ok) {
        throw new Error('Failed to download image')
    }

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    triggerDownload(url, filename)
    URL.revokeObjectURL(url)
}

export function buildCampaignAssetFilenames(brandName: string): {
    copy: string
    image: string
    ui: string
} {
    const base = sanitizeFilename(brandName)
    return {
        copy: `${base}-copy.txt`,
        image: `${base}-visual.png`,
        ui: `${base}-ui.html`,
    }
}
