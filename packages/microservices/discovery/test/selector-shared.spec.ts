import expect = require('expect');
import { EndpointSelection } from '../src/selector';

function endpoint(id: string, service: string, weight?: number): any {
    return { id, name: service, address: `http://${id}`, weight };
}

describe('EndpointSelection', () => {
    it('round-robins independently per service', () => {
        const selection = new EndpointSelection();
        const users = [endpoint('u1', 'users'), endpoint('u2', 'users')];
        const orders = [endpoint('o1', 'orders'), endpoint('o2', 'orders')];

        const picks = [
            selection.select(users)!.id,
            selection.select(users)!.id,
            selection.select(orders)!.id,
            selection.select(users)!.id,
            selection.select(orders)!.id,
            selection.select(orders)!.id
        ];

        expect(picks).toEqual(['u1', 'u2', 'o1', 'u1', 'o2', 'o1']);
    });

    it('uses an external round-robin cursor when provided', () => {
        const selection = new EndpointSelection();
        const pool = [endpoint('a', 'svc'), endpoint('b', 'svc')];
        const keys: string[] = [];

        const picks = [0, 1, 2].map(() => selection.select(pool, {
            key: 'svc:/api',
            nextIndex: (key, size) => { keys.push(`${key}:${size}`); return 0; }
        })!.id);

        expect(picks).toEqual(['a', 'a', 'a']);
        expect(keys).toEqual(['svc:/api:2', 'svc:/api:2', 'svc:/api:2']);
    });

    it('distributes weighted picks by endpoint weight', () => {
        const selection = new EndpointSelection();
        const pool = [endpoint('a', 'svc', 1), endpoint('b', 'svc', 3)];
        const picks: string[] = [];
        for (let i = 0; i < 8; i++) {
            picks.push(selection.select(pool, { strategy: 'weighted' })!.id);
        }

        expect(picks.filter(id => id === 'a')).toHaveLength(2);
        expect(picks.filter(id => id === 'b')).toHaveLength(6);
    });

    it('selects the least busy endpoint and breaks ties by weight', () => {
        const selection = new EndpointSelection();
        const pool = [endpoint('a', 'svc', 1), endpoint('b', 'svc', 5)];
        const active: Record<string, number> = { a: 2, b: 2 };

        const picked = selection.select(pool, {
            strategy: 'least-connections',
            activeOf: ep => active[ep.id] ?? 0
        });

        expect(picked?.id).toBe('b');

        active.b = 4;
        expect(selection.select(pool, {
            strategy: 'least-connections',
            activeOf: ep => active[ep.id] ?? 0
        })?.id).toBe('a');
    });

    it('keeps consistent hashing stable for the same key', () => {
        const selection = new EndpointSelection();
        const pool = [endpoint('a', 'svc'), endpoint('b', 'svc'), endpoint('c', 'svc')];

        const first = selection.select(pool, { strategy: 'consistent-hash', hashKey: 'client-1' })!.id;
        const second = selection.select(pool, { strategy: 'consistent-hash', hashKey: 'client-1' })!.id;

        expect(first).toBe(second);
    });

    it('returns null for an empty endpoint list', () => {
        expect(new EndpointSelection().select([])).toBeNull();
    });
});
