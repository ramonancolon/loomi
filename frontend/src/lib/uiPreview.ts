/** Prepare generated UI markup for inline HTML preview. */
export function prepareUiPreviewHtml(source: string): string {
    const normalized = normalizeUiMarkup(source)

    if (/^<(div|section|main|article|header)\b/i.test(normalized)) {
        return normalized
    }

    if (/function\s+GeneratedUICard|export\s+(default\s+)?function/i.test(source)) {
        return [
            '<div class="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-950">',
            '<p class="font-semibold">Preview unavailable for this React source layout.</p>',
            '<p class="mt-2 text-sm">Use <strong>Reroll</strong> on the UI layout card to regenerate as HTML.</p>',
            '</div>',
        ].join('')
    }

    return normalized || '<p class="text-sm text-gray-500">Preview unavailable.</p>'
}

function normalizeUiMarkup(source: string): string {
    let html = source.trim()
    html = html.replace(/```(?:html|tsx|jsx|javascript|react)?\s*/gi, '').replace(/```/g, '').trim()

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
