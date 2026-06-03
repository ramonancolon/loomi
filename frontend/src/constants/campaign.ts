export const VIBES = [
    { id: 'auto', name: 'Auto (Let Agent Decide)', description: 'Agent will choose based on audience insights' },
    { id: 'minimalist', name: 'Minimalist', description: 'Clean, simple, elegant' },
    { id: 'vintage', name: 'Vintage', description: 'Retro, nostalgic, classic' },
    { id: 'nature', name: 'Nature', description: 'Organic, earthy, fresh' },
    { id: 'luxury', name: 'Luxury', description: 'Premium, gold, sophisticated' },
    { id: 'tech', name: 'Tech', description: 'Modern, blue, innovative' },
] as const

export const PLATFORMS = [
    { id: 'email', name: 'Email Campaign' },
    { id: 'social', name: 'Social Media' },
    { id: 'landing_page', name: 'Landing Page' },
] as const

/** Pre-filled win-back example for segment-aware campaign generation */
export const DEFAULT_CAMPAIGN_FORM = {
    brandName: 'Pacific Apparel',
    campaignGoal: 'Win back customers who have not purchased in the last 6 months with a personalized email offer',
    targetAudience: 'Lapsed VIPs',
    vibe: 'auto',
    platform: 'email',
} as const
