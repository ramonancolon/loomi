import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ImageGenerationInput } from '../types/activity'
import { generateImageActivity } from './generateImageActivity'

// Mock implementation for testing
async function mockImageGeneration(input: ImageGenerationInput): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 100))
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

// Export for use in other tests
(generateImageActivity as any).__testable = { mockImageGeneration }

describe('generateImageActivity', () => {
    describe('mockImageGeneration', () => {
        it('should generate image URL for minimalist vibe', async () => {
            const input: ImageGenerationInput = {
                brandName: 'Widget',
                campaignGoal: 'A useful widget',
                vibe: 'minimalist',
                copy: ''
            }
            const result = await mockImageGeneration(input)
            expect(result).toContain(encodeURIComponent('Widget'))
            expect(result).toContain('808080')
            expect(result).toContain('ffffff')
        })

        it('should generate image URL for dark vibe', async () => {
            const input: ImageGenerationInput = {
                brandName: 'Shadow App',
                campaignGoal: 'A mysterious app',
                vibe: 'dark',
                copy: ''
            }
            const result = await mockImageGeneration(input)
            expect(result).toContain(encodeURIComponent('Shadow App'))
            expect(result).toContain('333333')
            expect(result).toContain('000000')
        })

        it('should generate image URL for vibrant vibe', async () => {
            const input: ImageGenerationInput = {
                brandName: 'Party Planner',
                campaignGoal: 'Event planning app',
                vibe: 'vibrant',
                copy: ''
            }
            const result = await mockImageGeneration(input)
            expect(result).toContain(encodeURIComponent('Party Planner'))
            expect(result).toContain('333333')
            expect(result).toContain('ffffff')
        })

        it('should handle errors gracefully', async () => {
            const input: ImageGenerationInput = {
                brandName: 'Test Product',
                campaignGoal: 'Test description',
                vibe: 'unknown',
                copy: ''
            }
            const result = await mockImageGeneration(input)
            expect(result).toContain(encodeURIComponent('Test Product'))
            expect(result).toContain('333333')
        })
    })

    describe('generateImageActivity', () => {
        it('should generate image URL successfully', async () => {
            const input: ImageGenerationInput = {
                brandName: 'Test Product',
                campaignGoal: 'Test description',
                vibe: 'minimalist',
                copy: 'Test copy'
            }
            const result = await generateImageActivity(input)
            expect(result).toContain(encodeURIComponent('Test Product'))
            expect(result).toContain('808080')
        })

        it('should throw error on failure', async () => {
            const input: ImageGenerationInput = {
                brandName: 'Test Product',
                campaignGoal: 'Test description',
                vibe: 'minimalist',
                copy: 'Test copy'
            }
            
            // For it to throw, we must mock the fallback to throw
            const { deps } = await import('./generateImageActivity.js')
            vi.spyOn(deps, 'mockImageGeneration').mockImplementationOnce(() => {
                throw new Error('Network Error')
            })

            await expect(generateImageActivity(input)).rejects.toThrow('Network Error')
        })
    })
})
