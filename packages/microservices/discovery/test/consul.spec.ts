import expect = require('expect');
import * as http from 'node:http';
import { ConsulServiceDiscovery } from '../src/consul.discovery';

describe('ConsulServiceDiscovery', () => {
    let server: http.Server;
    let url: string;
    let health: any[];
    let registrations: any[];
    let deregistrations: string[];
    let lastToken: string | undefined;

    before(async () => {
        server = http.createServer((req, res) => {
            const target = new URL(req.url ?? '/', 'http://127.0.0.1');
            lastToken = req.headers['x-consul-token'] as string | undefined;
            const reply = (body: any = {}) => {
                res.setHeader('content-type', 'application/json');
                res.end(JSON.stringify(body));
            };
            if (req.method === 'PUT' && target.pathname === '/v1/agent/service/register') {
                let text = '';
                req.on('data', chunk => text += chunk);
                req.on('end', () => {
                    registrations.push(JSON.parse(text));
                    reply({});
                });
                return;
            }
            if (req.method === 'PUT' && target.pathname.startsWith('/v1/agent/service/deregister/')) {
                deregistrations.push(decodeURIComponent(target.pathname.split('/').pop()!));
                reply({});
                return;
            }
            if (target.pathname === '/v1/agent/services') {
                reply({
                    'a-1': { ID: 'a-1', Service: 'greeter', Address: '10.0.0.1', Port: 8080, Tags: ['api'], Meta: { protocol: 'http', version: 'v1' } }
                });
                return;
            }
            if (target.pathname === '/v1/health/service/greeter') {
                reply(health);
                return;
            }
            res.statusCode = 404;
            res.end('{}');
        });
        await new Promise<void>(resolve => server.listen(0, '127.0.0.1', () => resolve()));
        const address = server.address() as any;
        url = `http://127.0.0.1:${address.port}`;
    });

    after(async () => {
        await new Promise<void>(resolve => server.close(() => resolve()));
    });

    beforeEach(() => {
        health = [{
            Node: { Address: '10.0.0.1' },
            Service: {
                ID: 'greeter-1',
                Service: 'greeter',
                Address: '10.0.0.1',
                Port: 8080,
                Tags: ['api'],
                Meta: { protocol: 'http', version: 'v1' },
                Weights: { Passing: 5 }
            },
            Checks: [{ Status: 'passing' }]
        }];
        registrations = [];
        deregistrations = [];
        lastToken = undefined;
    });

    function create(options: any = {}) {
        return new ConsulServiceDiscovery({ url, watchInterval: 10, ...options });
    }

    it('registers and deregisters through the agent API', async () => {
        const discovery = create({ token: 'secret' });
        const endpoint = await discovery.register({
            id: 'greeter-1',
            name: 'greeter',
            address: '10.0.0.1:8080',
            protocol: 'http',
            port: 8080,
            tags: ['api'],
            metadata: { region: 'east' },
            healthCheckPath: '/health'
        });

        expect(endpoint.id).toBe('greeter-1');
        expect(registrations.length).toBe(1);
        expect(registrations[0].ID).toBe('greeter-1');
        expect(registrations[0].Address).toBe('10.0.0.1');
        expect(registrations[0].Port).toBe(8080);
        expect(registrations[0].Check.HTTP).toContain('/health');
        expect(lastToken).toBe('secret');

        await discovery.deregister('greeter-1');
        expect(deregistrations).toEqual(['greeter-1']);
        discovery.onDestroy();
    });

    it('maps health entries to endpoints and filters queries', async () => {
        const discovery = create();
        const endpoints = await discovery.discover('greeter');
        expect(endpoints[0]).toMatchObject({
            id: 'greeter-1',
            name: 'greeter',
            address: '10.0.0.1:8080',
            protocol: 'http',
            version: 'v1',
            weight: 5,
            status: 'UP'
        });

        expect((await discovery.query({ name: 'greeter', tags: ['api'], protocol: 'http' })).length).toBe(1);
        expect((await discovery.query({ name: 'greeter', tags: ['missing'] })).length).toBe(0);
        expect(await discovery.healthCheck(endpoints[0])).toBe(true);

        const services = await discovery.getServices();
        expect(services[0]).toMatchObject({ name: 'greeter', port: 8080 });
        discovery.onDestroy();
    });

    it('polls watchers when health data changes', async () => {
        const discovery = create({ watchInterval: 10 });
        const snapshots: any[][] = [];
        await discovery.watch('greeter', endpoints => snapshots.push(endpoints));

        health = [{
            Node: { Address: '10.0.0.2' },
            Service: { ID: 'greeter-2', Service: 'greeter', Address: '10.0.0.2', Port: 8081, Meta: { protocol: 'http' } },
            Checks: [{ Status: 'passing' }]
        }];
        // watch() emits immediately; force the polling path deterministically.
        await (discovery as any).poll('greeter');

        expect(snapshots.length).toBeGreaterThanOrEqual(2);
        expect(snapshots[snapshots.length - 1][0].id).toBe('greeter-2');

        await discovery.unwatch('greeter', () => undefined);
        discovery.onDestroy();
    });
});
