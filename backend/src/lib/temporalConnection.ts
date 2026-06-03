import { env } from '../config/env'

/** Options shared by @temporalio/client Connection and Worker NativeConnection. */
export function getTemporalConnectionOptions(): {
    address: string
    tls?: true
    apiKey?: string
    metadata?: Record<string, string>
} {
    const options: {
        address: string
        tls?: true
        apiKey?: string
        metadata?: Record<string, string>
    } = {
        address: env.TEMPORAL_ADDRESS,
    }

    if (env.TEMPORAL_USE_TLS) {
        options.tls = true
    }

    if (env.TEMPORAL_API_KEY) {
        options.apiKey = env.TEMPORAL_API_KEY
        options.tls = true
        options.metadata = {
            'temporal-namespace': env.TEMPORAL_NAMESPACE,
        }
    }

    return options
}
