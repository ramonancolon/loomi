import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
    mode: 'test',
    test: {
        environment: 'jsdom',
        setupFiles: ['./src/test/setup.ts'],
        globals: true,
        include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
        css: true,
        environmentOptions: {
            jsdom: {
                url: 'http://localhost',
            },
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    define: {
        'process.env': {},
    },
})
