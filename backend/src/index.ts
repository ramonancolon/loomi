import 'dotenv/config'
import { Connection, Client, type WorkflowClient } from '@temporalio/client'
import { createExpressApp } from './api/server'
import { env } from './config/env'
import { getTemporalConnectionOptions } from './lib/temporalConnection'

async function main(): Promise<void> {
    console.log(`Starting Loomi API on port ${env.PORT}`)
    console.log(`Temporal namespace: ${env.TEMPORAL_NAMESPACE}`)
    console.log(`Temporal address: ${env.TEMPORAL_ADDRESS}`)

    const connection = await Connection.connect(getTemporalConnectionOptions())

    const client = new Client({
        connection,
        namespace: env.TEMPORAL_NAMESPACE,
    })
    const workflowClient: WorkflowClient = client.workflow

    const app = createExpressApp(workflowClient)

    const server = app.listen(env.PORT, () => {
        console.log(`Loomi API is running on port ${env.PORT}`)
    })

    const shutdown = async (): Promise<void> => {
        console.log('Shutting down Loomi API...')
        await new Promise<void>((resolve, reject) => {
            server.close((err) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve()
            })
        })
        await connection.close()
        process.exit(0)
    }

    process.on('SIGINT', () => {
        void shutdown()
    })
    process.on('SIGTERM', () => {
        void shutdown()
    })
}

main().catch((err) => {
    console.error('Failed to start Loomi API:', err)
    process.exit(1)
})
