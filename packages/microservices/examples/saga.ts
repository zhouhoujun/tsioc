/**
 * Saga demo: reserve → charge → ship, compensating reserve when charge fails.
 */
import { runSaga, SagaError } from '@tsdi/service';

async function main(): Promise<void> {
    const calls: string[] = [];
    try {
        await runSaga([
            { name: 'reserve', execute: () => { calls.push('reserve'); }, compensate: () => { calls.push('release'); } },
            { name: 'charge', execute: () => { throw new Error('card declined'); } }
        ], {});
    } catch (error) {
        if (!(error instanceof SagaError) || error.failure.failedStep !== 'charge') {
            throw error;
        }
    }
    if (calls.join(',') !== 'reserve,release') {
        throw new Error(`unexpected saga calls: ${calls.join(',')}`);
    }
    console.log('saga demo ok');
}

main().catch(error => {
    console.error('saga demo failed:', error);
    process.exit(1);
});
