import expect = require('expect');
import { ServiceEndpoint } from '../src/discovery';
import {
    RandomEndpointSelector,
    RoundRobinEndpointSelector,
    WeightedEndpointSelector,
    LeastConnectionsEndpointSelector
} from '../src/selector';

function makeEndpoint(id: string): ServiceEndpoint {
    return { id, name: 'svc', address: `127.0.0.1:${id}`, status: 'UP' };
}

describe('RandomEndpointSelector', () => {
    it('returns null for empty list', () => {
        const sel = new RandomEndpointSelector();
        expect(sel.select([])).toBeNull();
    });

    it('returns valid endpoint for non-empty list', () => {
        const sel = new RandomEndpointSelector();
        const endpoints = [makeEndpoint('1'), makeEndpoint('2')];
        const result = sel.select(endpoints);
        expect(result).not.toBeNull();
        expect(endpoints).toContain(result);
    });
});

describe('RoundRobinEndpointSelector', () => {
    it('returns null for empty list', () => {
        const sel = new RoundRobinEndpointSelector();
        expect(sel.select([])).toBeNull();
    });

    it('rounds through endpoints in order', () => {
        const sel = new RoundRobinEndpointSelector();
        const endpoints = [makeEndpoint('a'), makeEndpoint('b'), makeEndpoint('c')];
        expect(sel.select(endpoints)!.id).toBe('a');
        expect(sel.select(endpoints)!.id).toBe('b');
        expect(sel.select(endpoints)!.id).toBe('c');
        expect(sel.select(endpoints)!.id).toBe('a');
    });

    it('resets index on onDestroy', () => {
        const sel = new RoundRobinEndpointSelector();
        const endpoints = [makeEndpoint('x'), makeEndpoint('y')];
        sel.select(endpoints);
        sel.select(endpoints);
        sel.onDestroy();
        expect(sel.select(endpoints)!.id).toBe('x');
    });
});

describe('WeightedEndpointSelector', () => {
    it('returns null for empty list', () => {
        const sel = new WeightedEndpointSelector();
        expect(sel.select([])).toBeNull();
    });

    it('respects weights', () => {
        const endpoints = [makeEndpoint('heavy'), makeEndpoint('light')];
        const sel = new WeightedEndpointSelector({
            weights: { heavy: 100, light: 1 }
        });
        let heavyCount = 0;
        for (let i = 0; i < 1000; i++) {
            if (sel.select(endpoints)!.id === 'heavy') heavyCount++;
        }
        expect(heavyCount).toBeGreaterThan(800);
    });

    it('setWeights updates weights', () => {
        const sel = new WeightedEndpointSelector();
        sel.setWeights({ a: 10, b: 1 });
        const endpoints = [makeEndpoint('a'), makeEndpoint('b')];
        let aCount = 0;
        for (let i = 0; i < 1000; i++) {
            if (sel.select(endpoints)!.id === 'a') aCount++;
        }
        expect(aCount).toBeGreaterThan(500);
    });
});

describe('LeastConnectionsEndpointSelector', () => {
    it('returns null for empty list', () => {
        const sel = new LeastConnectionsEndpointSelector();
        expect(sel.select([])).toBeNull();
    });

    it('picks endpoint with fewest connections', () => {
        const sel = new LeastConnectionsEndpointSelector();
        const endpoints = [makeEndpoint('busy'), makeEndpoint('free')];
        for (let i = 0; i < 3; i++) {
            sel.select(endpoints);
        }
        expect(sel.select(endpoints)!.id).toBe('free');
    });

    it('release decrements connection count', () => {
        const sel = new LeastConnectionsEndpointSelector();
        const endpoints = [makeEndpoint('a'), makeEndpoint('b')];
        sel.select(endpoints);
        sel.select(endpoints);
        sel.release(endpoints[0]);
        expect(sel.select(endpoints)!.id).toBe('a');
    });
});
