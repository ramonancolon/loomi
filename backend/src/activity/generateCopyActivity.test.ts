import { describe, it, expect, vi } from 'vitest'
import { generateCopyActivity, deps } from './generateCopyActivity'
import { CopyGenerationInput } from '../types/activity'
import { getPlatformCopySpec } from './copyFormat'

const baseInput = {
    brandName: 'Widget',
    campaignGoal: 'A useful widget',
    vibe: 'minimalist',
    platform: 'email',
} satisfies CopyGenerationInput

describe('generateCopyActivity', () => {
    describe('openAICall / mock generation', () => {
        it('should generate structured copy for minimalist vibe', async () => {
            const result = await deps.generateMockCopy(baseInput)

            expect(result).toMatch(/^# Widget:/)
            expect(result).toContain('Widget')
            expect(result.toLowerCase()).toContain('minimalist')
            expect(result.split('\n\n').length).toBe(getPlatformCopySpec('email').paragraphCount + 1)
        })

        it('should generate structured copy for dark vibe', async () => {
            const input: CopyGenerationInput = {
                brandName: 'Shadow App',
                campaignGoal: 'A mysterious app',
                vibe: 'dark',
                platform: 'email',
            }

            const result = await deps.generateMockCopy(input)

            expect(result).toContain('Shadow App')
            expect(result.toLowerCase()).toContain('mysterious')
            expect(result.toLowerCase()).toContain('dark')
        })

        it('should generate structured copy for vibrant vibe', async () => {
            const input: CopyGenerationInput = {
                brandName: 'Energy Drink',
                campaignGoal: 'A boosting beverage',
                vibe: 'vibrant',
                platform: 'social',
            }

            const result = await deps.generateMockCopy(input)

            expect(result).toContain('Energy Drink')
            expect(result.toLowerCase()).toContain('vibrant')
            expect(result.split('\n\n').length).toBe(getPlatformCopySpec('social').paragraphCount + 1)
        })

        it('should generate structured copy for pastel vibe', async () => {
            const input: CopyGenerationInput = {
                brandName: 'Soft Toy',
                campaignGoal: 'A cuddly companion',
                vibe: 'pastel',
                platform: 'landing_page',
            }

            const result = await deps.generateMockCopy(input)

            expect(result).toContain('Soft Toy')
            expect(result.toLowerCase()).toContain('pastel')
            expect(result.split('\n\n').length).toBe(getPlatformCopySpec('landing_page').paragraphCount + 1)
        })

        it('should generate structured copy for tech vibe', async () => {
            const input: CopyGenerationInput = {
                brandName: 'Smart Device',
                campaignGoal: 'An innovative gadget',
                vibe: 'tech',
                platform: 'email',
            }

            const result = await deps.generateMockCopy(input)

            expect(result).toContain('Smart Device')
            expect(result.toLowerCase()).toContain('tech')
            expect(result.toLowerCase()).toContain('innovative')
        })

        it('should generate structured copy for nature vibe', async () => {
            const input: CopyGenerationInput = {
                brandName: 'Organic Tea',
                campaignGoal: 'A healthy beverage',
                vibe: 'nature',
                platform: 'email',
            }

            const result = await deps.generateMockCopy(input)

            expect(result).toContain('Organic Tea')
            expect(result.toLowerCase()).toContain('nature')
        })

        it('should handle empty inputs gracefully', async () => {
            const input: CopyGenerationInput = {
                brandName: '',
                campaignGoal: '',
                vibe: 'minimalist',
                platform: 'email',
            }

            const result = await deps.generateMockCopy(input)

            expect(result.startsWith('#')).toBe(true)
            expect(result.toLowerCase()).toContain('minimalist')
        })
    })

    describe('generateCopyActivity', () => {
        it('should return generated copy', async () => {
            const result = await generateCopyActivity(baseInput)

            expect(result).toContain('Widget')
            expect(result.startsWith('#')).toBe(true)
        })

        it('should handle errors gracefully', async () => {
            vi.spyOn(deps, 'geminiCall').mockImplementationOnce(() => {
                throw new Error('API Error')
            })

            const result = await generateCopyActivity(baseInput)
            expect(result).toContain('Widget')
        })

        it('should include brand name in copy', async () => {
            const input: CopyGenerationInput = {
                brandName: 'Super Widget Pro',
                campaignGoal: 'A super useful widget',
                vibe: 'tech',
                platform: 'email',
            }

            const result = await generateCopyActivity(input)

            expect(result).toContain('Super Widget Pro')
        })
    })
})
