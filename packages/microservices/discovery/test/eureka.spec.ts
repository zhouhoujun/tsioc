import expect = require('expect');
import * as http from 'node:http';
import { EurekaServiceDiscovery } from '../src/eureka.discovery';

describe('EurekaServiceDiscovery', () => {
    let server: http.Server;
    let eurekaUrl: string;
    let instances: any[];
    let registrations: any[] = [];
    let renewals = 0;
    let deregistrations: string[] = [];
    let failing = false;

    before(async () => {
        server = http.createServer((req, res) => {
            const url = new URL(req.url ?? '/', 'http://127.0.0.1');
            res.setHeader('content-type', 'application/json');
            if (req.method === 'POST' && /^\/eureka\/apps\/[^/]+$/.test(url.pathname)) {
                let text = '';
                req.on('data', chunk => text += chunk);
                req.on('end', () => {
                    registrations.push(JSON.parse(text));
                    res.statusCode = 204;
                    res.end();
                });
                return;
            }
            if (req.method === 'PUT') {
                renewals += 1;
                res.statusCode = 204;
                res.end();
                return;
            }
            if (req.method === 'DELETE') {
                deregistrations.push(url.pathname);
                res.statusCode = 204;
                res.end();
                return;
            }
            if (url.pathname === '/eureka/apps/GREETER') {
                if (failing) {
                    res.statusCode = 500;
                    res.end('{"error":"boom"}');
                    return;
                }
                res.end(JSON.stringify({ application: { name: 'GREETER', instance: instances } }));
                return;
            }
            if (url.pathname === '/eureka/apps') {
                res.end(JSON.stringify({
                    applications: {
                        application: [{ name: 'GREETER', instance: instances[0] }]
                    }
                }));
                return;
            }
            res.statusCode = 404;
            res.end('{}');
        });
        await new Promise<void>(resolve => server.listen(0, '127.0.0.1', () => resolve()));
        eurekaUrl = `http://127.0.0.1:${(server.address() as any).port}/eureka`;
    });

    after(async () => {
        await new Promise<void>(resolve => server.close(() => resolve()));
    });

    beforeEach(() => {
        instances = [{
            instanceId: 'greeter-1',
            hostName: '10.0.0.1',
            ipAddr: '10.0.0.1',
            app: 'GREETER',
            status: 'UP',
            port: { $: 8080, '@enabled': 'true' },
            metadata: { protocol: 'http', version: 'v1', tags: 'api,prod' }
        }, {
            instanceId: 'greeter-2',
            hostName: '10.0.0.2',
            ipAddr: '10.0.0.2',
            app: 'GREETER',
            status: 'DOWN',
            port: { $: 8080 },
            metadata: { protocol: 'http' }
        }];
        registrations = [];
        renewals = 0;
        deregistrations = [];
        failing = false;
    });

    function create(options: any = {}) {
        return new EurekaServiceDiscovery({ eurekaUrl, watchInterval: 10, heartbeatInterval: 10, ...options });
    }

    it('registers and deregisters through the Eureka REST API', async () => {
        const discovery = create();
        const endpoint = await discovery.register({
            id: 'greeter-1',
            name: 'greeter',
            address: '10.0.0.1:8080',
            protocol: 'http',
            tags: ['api'],
            metadata: { region: 'east' }
        });

        expect(endpoint.id).toBe('greeter-1');
        expect(registrations.length).toBe(1);
        const instance = registrations[0].instance;
        expect(instance.app).toBe('GREETER');
        expect(instance.ipAddr).toBe('10.0.0.1');
        expect(instance.port.$).toBe(8080);
        expect(instance.metadata.protocol).toBe('http');

        await new Promise(resolve => setTimeout(resolve, 25));
        expect(renewals).toBeGreaterThanOrEqual(1);

        await discovery.deregister('greeter-1');
        expect(deregistrations[0]).toContain('/GREETER/greeter-1');
        discovery.onDestroy();
    });

    it('discovers instances and lists applications', async () => {
        const discovery = create();
        const endpoints = await discovery.discover('greeter');
        expect(endpoints.map(endpoint => endpoint.id)).toEqual(['greeter-1', 'greeter-2']);
        expect(endpoints[0]).toMatchObject({
            address: '10.0.0.1:8080',
            protocol: 'http',
            version: 'v1',
            tags: ['api', 'prod'],
            status: 'UP'
        });
        expect(endpoints[1].status).toBe('DOWN');

        expect((await discovery.query({ name: 'greeter', status: 'UP' })).length).toBe(1);
        expect((await discovery.query({ name: 'greeter', tags: ['missing'] })).length).toBe(0);
        expect(await discovery.healthCheck(endpoints[0])).toBe(true);

        const services = await discovery.getServices();
        expect(services[0]).toMatchObject({ name: 'greeter', address: '10.0.0.1:8080' });
        discovery.onDestroy();
    });

    it('surfaces registry 5xx errors', async () => {
        const discovery = create();
        failing = true;
        await expect(discovery.discover('greeter')).rejects.toThrow(/Eureka request failed: 500/);
        discovery.onDestroy();
    });

    it('polls watchers for instance changes', async () => {
        const discovery = create();
        const snapshots: any[][] = [];
        await discovery.watch('greeter', endpoints => snapshots.push(endpoints));

        instances = [{
            instanceId: 'greeter-3',
            ipAddr: '10.0.0.3',
            app: 'GREETER',
            status: 'UP',
            port: { $: 9090 },
            metadata: { protocol: 'http' }
        }];
        await (discovery as any).poll('greeter');
        expect(snapshots.length).toBeGreaterThanOrEqual(2);
        expect(snapshots[snapshots.length - 1][0].id).toBe('greeter-3');
        discovery.onDestroy();
    });
});
