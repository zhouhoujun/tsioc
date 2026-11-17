/**
 * Quickstart gate smoke: boot the example, hit a route and the readiness
 * probe, then shut down through the graceful-close path.
 */
import { startQuickstart } from './http-quickstart';

const PORT = Number(process.env.TSIO_EXAMPLE_PORT ?? 3215);

async function main(): Promise<void> {
    const context = await startQuickstart(PORT);
    try {
        const hello = await fetch(`http://127.0.0.1:${PORT}/hello`);
        if (!hello.ok) {
            throw new Error(`GET /hello returned ${hello.status}`);
        }
        const payload = await hello.json() as { ok?: boolean; service?: string };
        if (payload.ok !== true || payload.service !== 'quickstart') {
            throw new Error(`unexpected /hello payload: ${JSON.stringify(payload)}`);
        }

        const readiness = await fetch(`http://127.0.0.1:${PORT}/health/readiness`);
        if (readiness.status !== 200) {
            throw new Error(`GET /health/readiness returned ${readiness.status}`);
        }
        const health = await readiness.json() as { status?: string };
        if (health.status !== 'UP') {
            throw new Error(`unexpected readiness payload: ${JSON.stringify(health)}`);
        }
        console.log('quickstart smoke ok');
    } finally {
        await context.close();
    }
}

main().catch(error => {
    console.error('quickstart smoke failed:', error);
    process.exit(1);
});
