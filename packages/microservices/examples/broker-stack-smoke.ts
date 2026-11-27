/**
 * Broker full-stack smoke: gateway forwards an HTTP request over Redis.
 * Requires a local Redis on BROKER_REDIS_URL.
 */
import { startBrokerStack } from './broker-stack';

const PORT = Number(process.env.BROKER_GATEWAY_PORT ?? 3225);

async function main(): Promise<void> {
    const { backend, gateway } = await startBrokerStack(PORT);
    try {
        const response = await fetch(`http://127.0.0.1:${PORT}/api/orders`);
        if (!response.ok) {
            throw new Error(`gateway returned ${response.status}`);
        }
        const order = await response.json() as { id?: number; status?: string };
        if (order.id !== 7 || order.status !== 'paid') {
            throw new Error(`unexpected broker payload: ${JSON.stringify(order)}`);
        }
        console.log('broker-stack smoke ok');
    } finally {
        await gateway.close();
        await backend.close();
    }
}

main().catch(error => {
    console.error('broker-stack smoke failed:', error);
    process.exit(1);
});
