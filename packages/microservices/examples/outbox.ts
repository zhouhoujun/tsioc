/**
 * Outbox demo: persist a record, drain it, and remove it only after delivery.
 */
import { MemoryOutboxStore, OutboxDispatcher } from '@tsdi/service';

async function main(): Promise<void> {
    const store = new MemoryOutboxStore();
    await store.add({
        topic: 'orders.created',
        payload: { orderId: 7 },
        headers: { 'x-tenant': 'acme' }
    });

    const delivered: string[] = [];
    const dispatcher = new OutboxDispatcher(store, async message => {
        delivered.push(message.topic);
    });
    try {
        const sent = await dispatcher.dispatchOnce();
        if (sent !== 1 || delivered[0] !== 'orders.created' || await store.size() !== 0) {
            throw new Error(`unexpected outbox result: sent=${sent} delivered=${delivered.join(',')} size=${await store.size()}`);
        }
        console.log('outbox demo ok');
    } finally {
        await dispatcher.stop();
    }
}

main().catch(error => {
    console.error('outbox demo failed:', error);
    process.exit(1);
});
