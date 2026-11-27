/**
 * Full-stack gate smoke: backend + in-memory discovery + gateway.
 */
import { startFullStack } from './full-stack';

const BACKEND_PORT = Number(process.env.FULLSTACK_BACKEND_PORT ?? 3223);
const GATEWAY_PORT = Number(process.env.FULLSTACK_GATEWAY_PORT ?? 3222);

async function main(): Promise<void> {
    const { backend, gateway, discovery } = await startFullStack(BACKEND_PORT, GATEWAY_PORT);
    try {
        const direct = await fetch(`http://127.0.0.1:${BACKEND_PORT}/users`);
        if (!direct.ok) {
            throw new Error(`backend returned ${direct.status}`);
        }
        const response = await fetch(`http://127.0.0.1:${GATEWAY_PORT}/api/users`);
        if (!response.ok) {
            throw new Error(`gateway returned ${response.status}`);
        }
        const users = await response.json() as Array<{ id: number; name: string }>;
        if (users.length !== 2 || users[0].name !== 'ada') {
            throw new Error(`unexpected gateway payload: ${JSON.stringify(users)}`);
        }
        console.log('full-stack smoke ok');
    } finally {
        await gateway.close();
        await backend.close();
        discovery.onDestroy?.();
    }
}

main().catch(error => {
    console.error('full-stack smoke failed:', error);
    process.exit(1);
});
