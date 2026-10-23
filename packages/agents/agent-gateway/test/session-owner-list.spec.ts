import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { SessionOwnerStore } from '../src/auth/SessionOwnerStore';

function buildStore(owners: Record<string, string | undefined>, events?: string[]) {
    return new SessionOwnerStore({
        getOwnerPrincipalId: async (sessionId: string) => {
            events?.push(`start:${sessionId}`);
            await new Promise<void>(resolve => setImmediate(resolve));
            events?.push(`end:${sessionId}`);
            return owners[sessionId];
        },
        has: async (sessionId: string) => Object.prototype.hasOwnProperty.call(owners, sessionId)
    } as any);
}

@Suite('session ownership listing')
export class SessionOwnerListTest {

    @Test('filters by principal and preserves the input order')
    async filtersAndPreservesOrder() {
        const store = buildStore({ a: 'u1', b: 'u2', c: 'u1', d: undefined });
        expect(await store.listOwned(['c', 'b', 'a', 'd'], 'u1')).toEqual(['c', 'a']);
    }

    @Test('reads every owner in parallel instead of one after another')
    async readsInParallel() {
        const events: string[] = [];
        const store = buildStore({ a: 'u1', b: 'u1', c: 'u1' }, events);
        await store.listOwned(['a', 'b', 'c'], 'u1');
        // With Promise.all every read starts before the first one resolves;
        // a sequential loop would interleave start/end per session.
        expect(events.slice(0, 3)).toEqual(['start:a', 'start:b', 'start:c']);
    }

    @Test('no principal means nothing is owned')
    async noPrincipal() {
        const store = buildStore({ a: 'u1' });
        expect(await store.listOwned(['a'], undefined)).toEqual([]);
        expect(await store.listOwned(['a'], '')).toEqual([]);
    }
}
