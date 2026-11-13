import expect = require('expect');
import * as http from 'node:http';
import { KubernetesServiceDiscovery } from '../src/kubernetes.discovery';

describe('KubernetesServiceDiscovery', () => {
    let server: http.Server;
    let apiServer: string;
    let slices: any[];
    let lastAuthorization: string | undefined;

    before(async () => {
        server = http.createServer((req, res) => {
            const url = new URL(req.url ?? '/', 'http://127.0.0.1');
            lastAuthorization = req.headers.authorization as string | undefined;
            res.setHeader('content-type', 'application/json');
            if (url.pathname.endsWith('/endpointslices')) {
                res.end(JSON.stringify({ items: slices }));
                return;
            }
            if (url.pathname.endsWith('/services')) {
                res.end(JSON.stringify({
                    items: [{
                        metadata: {
                            name: 'greeter',
                            uid: 'svc-1',
                            labels: { tags: 'api,prod', 'app.kubernetes.io/version': 'v1' }
                        },
                        spec: { clusterIP: '10.96.0.10', ports: [{ port: 8080, appProtocol: 'http' }] }
                    }]
                }));
                return;
            }
            res.statusCode = 404;
            res.end('{}');
        });
        await new Promise<void>(resolve => server.listen(0, '127.0.0.1', () => resolve()));
        const address = server.address() as any;
        apiServer = `http://127.0.0.1:${address.port}`;
    });

    after(async () => {
        await new Promise<void>(resolve => server.close(() => resolve()));
    });

    beforeEach(() => {
        slices = [{
            metadata: { name: 'greeter-abc', labels: { 'kubernetes.io/service-name': 'greeter', tags: 'api', 'app.kubernetes.io/version': 'v1' } },
            endpoints: [
                { addresses: ['10.1.0.1'], conditions: { ready: true } },
                { addresses: ['10.1.0.2'], conditions: { ready: false } },
                { addresses: ['10.1.0.3'], conditions: { ready: true, terminating: true } }
            ],
            ports: [{ port: 8080, appProtocol: 'http' }]
        }];
        lastAuthorization = undefined;
    });

    function create(options: any = {}) {
        return new KubernetesServiceDiscovery({ apiServer, watchInterval: 10, token: 'k8s-token', ...options });
    }

    it('discovers ready EndpointSlice addresses only', async () => {
        const discovery = create({ namespace: 'prod' });
        const endpoints = await discovery.discover('greeter');
        expect(endpoints.map(endpoint => endpoint.address)).toEqual(['10.1.0.1:8080']);
        expect(endpoints[0]).toMatchObject({
            protocol: 'http',
            version: 'v1',
            tags: ['api'],
            status: 'UP'
        });
        expect(lastAuthorization).toBe('Bearer k8s-token');
        discovery.onDestroy();
    });

    it('lists services and filters queries', async () => {
        const discovery = create();
        const services = await discovery.getServices();
        expect(services[0]).toMatchObject({
            name: 'greeter',
            address: '10.96.0.10:8080',
            tags: ['api', 'prod'],
            version: 'v1'
        });

        expect((await discovery.query({ name: 'greeter', protocol: 'http' })).length).toBe(1);
        expect((await discovery.query({ name: 'greeter', tags: ['missing'] })).length).toBe(0);
        const endpoint = (await discovery.discover('greeter'))[0];
        expect(await discovery.healthCheck(endpoint)).toBe(true);
        discovery.onDestroy();
    });

    it('polls watchers for EndpointSlice changes', async () => {
        const discovery = create();
        const snapshots: any[][] = [];
        await discovery.watch('greeter', endpoints => snapshots.push(endpoints));

        slices = [{
            metadata: { name: 'greeter-def', labels: { 'kubernetes.io/service-name': 'greeter' } },
            endpoints: [{ addresses: ['10.2.0.1'], conditions: { ready: true } }],
            ports: [{ port: 9090, appProtocol: 'http' }]
        }];
        await (discovery as any).poll('greeter');

        expect(snapshots.length).toBeGreaterThanOrEqual(2);
        expect(snapshots[snapshots.length - 1][0].address).toBe('10.2.0.1:9090');
        discovery.onDestroy();
    });

    it('is read-only for workload registration', async () => {
        const discovery = create();
        await expect(discovery.register({ name: 'greeter', address: '10.0.0.1:8080' }))
            .rejects.toThrow(/read-only/);
        await expect(discovery.deregister('anything')).resolves.toBeUndefined();
        discovery.onDestroy();
    });
});
