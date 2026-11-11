import expect = require('expect');
import { GatewayLoadBalancer } from '../src/load-balancer';
import { GatewayRuntime } from '../src/gateway.runtime';

const route = { path: '/api', service: 'svc' } as any;

function endpoints() {
    return [
        { id: 'a', name: 'svc', address: 'http://a', weight: 1 },
        { id: 'b', name: 'svc', address: 'http://b', weight: 3 }
    ] as any[];
}

describe('GatewayLoadBalancer', () => {
    it('supports smooth weighted round-robin', () => {
        const lb = new GatewayLoadBalancer(new GatewayRuntime());
        const pool = endpoints();
        const picks: string[] = [];
        for (let i = 0; i < 4; i++) {
            picks.push(lb.select({ ...route, loadBalance: { strategy: 'weighted' } } as any, pool)!.id);
        }
        expect(picks.filter(id => id === 'a')).toHaveLength(1);
        expect(picks.filter(id => id === 'b')).toHaveLength(3);
    });

    it('selects the least-connections endpoint', () => {
        const runtime = new GatewayRuntime();
        const lb = new GatewayLoadBalancer(runtime);
        const pool = endpoints();
        runtime.beginEndpointRequest('a');
        runtime.beginEndpointRequest('a');
        runtime.beginEndpointRequest('b');
        const picked = lb.select({ ...route, loadBalance: { strategy: 'least-connections' } } as any, pool);
        expect(picked?.id).toBe('b');
        runtime.endEndpointRequest('a');
        runtime.endEndpointRequest('a');
        runtime.endEndpointRequest('b');
    });

    it('keeps consistent hashing stable for the same key', () => {
        const lb = new GatewayLoadBalancer(new GatewayRuntime());
        const pool = endpoints();
        const config = { ...route, loadBalance: { strategy: 'consistent-hash' } } as any;
        const first = lb.select(config, pool, 'client-1')?.id;
        const second = lb.select(config, pool, 'client-1')?.id;
        expect(first).toBe(second);
    });
});
