import { describe, it, expect } from 'vitest'
import type { UIGenerationInput } from '../types/activity'
import { mockGenerateUI } from './generateUIActivity'

describe('generateUIActivity', () => {
    describe('mockGenerateUI', () => {
        it('should generate minimalist UI component', async () => {
            const input: UIGenerationInput = {
                brandName: 'Widget',
                campaignGoal: 'A useful widget',
                vibe: 'minimalist',
                copy: 'Simple and elegant design',
                imageUrl: 'https://example.com/image.jpg'
            }
            const result = await mockGenerateUI(input)
            expect(result).toContain('Widget')
            expect(result).toContain('Simple and elegant design')
            expect(result).toContain('bg-white')
            expect(result).toContain('text-gray-900')
            expect(result).toContain('border-gray-200')
        })

        it('should generate dark theme UI component', async () => {
            const input: UIGenerationInput = {
                brandName: 'Dark App',
                campaignGoal: 'A dark themed application',
                vibe: 'dark',
                copy: 'Experience the darkness',
                imageUrl: 'https://example.com/image.jpg'
            }
            const result = await mockGenerateUI(input)
            expect(result).toContain('Dark App')
            expect(result).toContain('Experience the darkness')
            expect(result).toContain('bg-gray-950')
            expect(result).toContain('text-white')
            expect(result).toContain('border-gray-800')
        })

        it('should generate vibrant theme UI component', async () => {
            const input: UIGenerationInput = {
                brandName: 'Vibrant Brand',
                campaignGoal: 'A colorful brand',
                vibe: 'vibrant',
                copy: 'Full of life and energy',
                imageUrl: 'https://example.com/image.jpg'
            }
            const result = await mockGenerateUI(input)
            expect(result).toContain('Vibrant Brand')
            expect(result).toContain('Full of life and energy')
            expect(result).toContain('from-pink-500')
            expect(result).toContain('via-red-500')
            expect(result).toContain('to-yellow-500')
        })

        it('should generate pastel theme UI component', async () => {
            const input: UIGenerationInput = {
                brandName: 'Pastel Shop',
                campaignGoal: 'Soft and gentle products',
                vibe: 'pastel',
                copy: 'Soft and gentle',
                imageUrl: 'https://example.com/image.jpg'
            }
            const result = await mockGenerateUI(input)
            expect(result).toContain('Pastel Shop')
            expect(result).toContain('Soft and gentle')
            expect(result).toContain('from-purple-100')
            expect(result).toContain('via-pink-100')
            expect(result).toContain('to-blue-100')
        })

        it('should generate tech theme UI component', async () => {
            const input: UIGenerationInput = {
                brandName: 'Tech Product',
                campaignGoal: 'Advanced technology',
                vibe: 'tech',
                copy: 'Future technology',
                imageUrl: 'https://example.com/image.jpg'
            }
            const result = await mockGenerateUI(input)
            expect(result).toContain('Tech Product')
            expect(result).toContain('Future technology')
            expect(result).toContain('bg-gray-950')
            expect(result).toContain('text-cyan-400')
            expect(result).toContain('border-cyan-500')
        })

        it('should generate nature theme UI component', async () => {
            const input: UIGenerationInput = {
                brandName: 'Nature Brand',
                campaignGoal: 'Organic products',
                vibe: 'nature',
                copy: 'From nature',
                imageUrl: 'https://example.com/image.jpg'
            }
            const result = await mockGenerateUI(input)
            expect(result).toContain('Nature Brand')
            expect(result).toContain('From nature')
            expect(result).toContain('from-emerald-50')
            expect(result).toContain('via-green-50')
            expect(result).toContain('to-teal-50')
        })

        it('should fallback to minimalist theme for unknown vibe', async () => {
            const input: UIGenerationInput = {
                brandName: 'Unknown Brand',
                campaignGoal: 'Unknown product',
                vibe: 'unknown-vibe',
                copy: 'Unknown description',
                imageUrl: 'https://example.com/image.jpg'
            }
            const result = await mockGenerateUI(input)
            expect(result).toContain('Unknown Brand')
            expect(result).toContain('Unknown description')
            expect(result).toContain('bg-white')
            expect(result).toContain('text-gray-900')
        })

        it('should include image URL in the generated UI', async () => {
            const input: UIGenerationInput = {
                brandName: 'Product with Image',
                campaignGoal: 'Product description',
                vibe: 'dark',
                copy: 'Product copy',
                imageUrl: 'https://custom-image.com/hero.jpg'
            }
            const result = await mockGenerateUI(input)
            expect(result).toContain('https://custom-image.com/hero.jpg')
        })

        it('should generate an HTML fragment', async () => {
            const input: UIGenerationInput = {
                brandName: 'Test Product',
                campaignGoal: 'Test description',
                vibe: 'minimalist',
                copy: 'Test copy',
                imageUrl: 'https://example.com/image.jpg'
            }
            const result = await mockGenerateUI(input)
            expect(result.trim().startsWith('<div')).toBe(true)
            expect(result).not.toContain('import React')
            expect(result).not.toContain('GeneratedUICard')
        })

        it('should include brand name in heading', async () => {
            const input: UIGenerationInput = {
                brandName: 'Super Product',
                campaignGoal: 'Description',
                vibe: 'dark',
                copy: 'Copy',
                imageUrl: 'https://example.com/image.jpg'
            }
            const result = await mockGenerateUI(input)
            expect(result).toContain('<h1')
            expect(result).toContain('Super Product')
        })

        it('should include copy in paragraph', async () => {
            const input: UIGenerationInput = {
                brandName: 'Product',
                campaignGoal: 'Description',
                vibe: 'dark',
                copy: 'This is the marketing copy',
                imageUrl: 'https://example.com/image.jpg'
            }
            const result = await mockGenerateUI(input)
            expect(result).toContain('<p')
            expect(result).toContain('This is the marketing copy')
        })

        it('should include call-to-action buttons', async () => {
            const input: UIGenerationInput = {
                brandName: 'Product',
                campaignGoal: 'Description',
                vibe: 'dark',
                copy: 'Copy',
                imageUrl: 'https://example.com/image.jpg'
            }
            const result = await mockGenerateUI(input)
            expect(result).toContain('Get Started')
            expect(result).toContain('Learn More')
        })
    })
})
