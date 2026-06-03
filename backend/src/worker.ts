import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { NativeConnection, Worker } from '@temporalio/worker'
import * as activities from './activities'
import { env } from './config/env'
import { getTemporalConnectionOptions } from './lib/temporalConnection'

function resolveWorkflowsPath(): string {
    const besideWorker = path.join(__dirname, 'workflow', 'campaignGenerationWorkflow.js')
    if (fs.existsSync(besideWorker)) {
        return besideWorker
    }
    return path.join(__dirname, '..', 'dist', 'workflow', 'campaignGenerationWorkflow.js')
}

async function runWorker(): Promise<void> {
    console.log(`Starting Temporal worker (task queue: ${env.TEMPORAL_TASK_QUEUE})`)
    console.log(`Temporal namespace: ${env.TEMPORAL_NAMESPACE}`)
    console.log(`Temporal address: ${env.TEMPORAL_ADDRESS}`)

    const connection = await NativeConnection.connect(getTemporalConnectionOptions())

    const worker = await Worker.create({
        connection,
        namespace: env.TEMPORAL_NAMESPACE,
        taskQueue: env.TEMPORAL_TASK_QUEUE,
        workflowsPath: resolveWorkflowsPath(),
        activities,
    })

    await worker.run()
}

runWorker().catch((err) => {
    console.error('Failed to start Temporal worker:', err)
    process.exit(1)
})
