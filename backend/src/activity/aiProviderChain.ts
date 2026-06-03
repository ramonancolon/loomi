/**
 * Generic utility for running AI providers with fallback chain support.
 * Providers are tried in order until one succeeds or all fail.
 */

/**
 * Represents a single AI provider in the fallback chain.
 * @template TInput The input type for the provider
 * @template TOutput The output type the provider returns
 */
export interface AIProvider<TInput, TOutput> {
  /**
   * Name of the provider for logging purposes
   */
  name: string

  /**
   * Returns true if this provider is available (has required credentials, etc.)
   */
  isAvailable: () => boolean

  /**
   * Executes the provider's AI functionality
   * @param input The input to pass to the provider
   * @returns The output from the provider
   * @throws If the provider fails
   */
  run: (input: TInput) => Promise<TOutput>
}

/**
 * Optional mock fallback to use when all providers fail
 */
export interface MockFallback<TOutput> {
    /**
     * The mock fallback function to call when all providers fail
     */
    generate: () => TOutput | Promise<TOutput>
}

/**
 * Runs a chain of AI providers, attempting each one until one succeeds.
 * Logs warnings when providers fail and falls through to the next provider.
 * Only throws an error if all providers fail and no mock fallback is provided.
 *
 * @template TInput The input type for the providers
 * @template TOutput The output type the providers return
 * @param input The input to pass to the providers
 * @param providers Ordered list of providers to attempt (first to last)
 * @param mockFallback Optional mock fallback to use if all providers fail
 * @returns The output from the first successful provider, or the mock fallback
 * @throws If all providers fail and no mock fallback is provided
 */
export async function runProviderChain<TInput, TOutput>(
  input: TInput,
  providers: AIProvider<TInput, TOutput>[],
  mockFallback?: MockFallback<TOutput>
): Promise<TOutput> {
  let lastError: Error | undefined

  for (const provider of providers) {
    // Skip unavailable providers
    if (!provider.isAvailable()) {
      console.debug(`Provider "${provider.name}" is not available, skipping...`)
      continue
    }

    try {
      console.debug(`Attempting provider: ${provider.name}`)
      const result = await provider.run(input)
      console.debug(`Provider "${provider.name}" succeeded`)
      return result
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      console.warn(`Provider "${provider.name}" failed: ${lastError.message}`, error)
    }
  }

  // All providers failed, use mock fallback or throw
  if (mockFallback) {
    console.warn('All AI providers failed, using mock fallback')
    return await mockFallback.generate()
  }

  // No mock fallback available, throw the last error
  console.error('All AI providers failed and no mock fallback is available')
  throw lastError || new Error('All AI providers failed')
}
