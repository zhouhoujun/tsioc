import expect = require('expect');
import * as http from 'node:http';
import { NacosServiceDiscovery } from '../src/nacos.discovery';

describe('NacosServiceDiscovery', () => {
    let server: http.Server;
    let serverAddr: string;
    let hosts: any[];
    let registrations: URLSearchParams[] = [];
    let deregistrations: URLSearchParams[] = [];
    let loginCalls = 0;

    before(async () => {
        server = http.createServer((req, res) => {
            const url = new URL(req.url ?? '/', 'http://127.0.0.1');
            res.setHeader('content-type', 'application/json');
            if (url.pathname === '/nacos/v1/auth/login') {
                loginCalls += 1;
                res.end(JSON.stringify({ accessToken: 'token-1' }));
                return;
            }
            if (url.pathname === '/nacos/v1/ns/instance' && req.method === 'POST') {
                registrations.push(url.searchParams);
                res.end('ok');
                return;
            }
            if (url.pathname === '/nacos/v1/ns/instance' && req.method === 'DELETE') {
                deregistrations.push(url.searchParams);
                res.end('ok');
                return;
            }
            if (url.pathname === '/nacos/v1/ns/instance/list') {
                res.end(JSON.stringify({ hosts }));
                return;
            }
            if (url.pathname === '/nacos/v1/ns/service/list') {
                res.end(JSON.stringify({ doms: ['greeter'] }));
                return;
            }
            res.statusCode = 404;
            res.end('{}');
        });
        await new Promise<void>(resolve => server.listen(0, '127.0.0.1', () => resolve()));
        serverAddr = `http://127.0.0.1:${(server.address() as any).port}`;
    });

    after(async () => {
        await new Promise<void>(resolve => server.close(() => resolve()));
    });

    beforeEach(() => {
        hosts = [{
            instanceId: 'greeter-1',
            ip: '10.0.0.1',
            port: 8080,
            healthy: true,
            enabled: true,
            weight: 3,
            serviceName: 'greeter',
            metadata: { protocol: 'http', version: 'v1', tags: 'api,prod' }
        }, {
            instanceId: 'greeter-2',
            ip: '10.0.0.2',
            port: 8080,
            healthy: false,
            metadata: { protocol: 'http' }
        }];
        registrations = [];
        deregistrations = [];
        loginCalls = 0;
    });

    function create(options: any = {}) {
        return new NacosServiceDiscovery({
            serverAddr,
            groupName: 'DEFAULT_GROUP',
            watchInterval: 10,
            ...options
        });
    }

    it('logs in and registers an instance', async () => {
        const discovery = create({ username: 'nacos', password: 'nacos' });
        const endpoint = await discovery.register({
            id: 'greeter-1',
            name: 'greeter',
            address: '10.0.0.1:8080',
            protocol: 'http',
            tags: ['api'],
            metadata: { region: 'east' }
        });

        expect(endpoint.id).toBe('greeter-1');
        expect(loginCalls).toBe(1);
        expect(registrations.length).toBe(1);
        const params = registrations[0];
        expect(params.get('serviceName')).toBe('greeter');
        expect(params.get('ip')).toBe('10.0.0.1');
        expect(params.get('port')).toBe('8080');
        expect(params.get('accessToken')).toBe('token-1');
        expect(JSON.parse(params.get('metadata')!).protocol).toBe('http');

        await discovery.deregister('greeter-1');
        expect(deregistrations[0].get('serviceName')).toBe('greeter');
        discovery.onDestroy();
    });

    it('discovers healthy and unhealthy instances', async () => {
        const discovery = create({ accessToken: 'direct-token' });
        const endpoints = await discovery.discover('greeter');
        expect(endpoints.map(endpoint => endpoint.id)).toEqual(['greeter-1', 'greeter-2']);
        expect(endpoints[0]).toMatchObject({
            address: '10.0.0.1:8080',
            protocol: 'http',
            version: 'v1',
            tags: ['api', 'prod'],
            weight: 3,
            status: 'UP'
        });
        expect(endpoints[1].status).toBe('DOWN');

        expect((await discovery.query({ name: 'greeter', status: 'UP' })).length).toBe(1);
        expect((await discovery.query({ name: 'greeter', tags: ['missing'] })).length).toBe(0);
        expect(await discovery.healthCheck(endpoints[0])).toBe(true);
        const services = await discovery.getServices();
        expect(services[0].name).toBe('greeter');
        discovery.onDestroy();
    });

    it('polls watchers for instance changes', async () => {
        const discovery = create({ accessToken: 'direct-token' });
        const snapshots: any[][] = [];
        await discovery.watch('greeter', endpoints => snapshots.push(endpoints));

        hosts = [{
            instanceId: 'greeter-3',
            ip: '10.0.0.3',
            port: 9090,
            healthy: true,
            serviceName: 'greeter',
            metadata: { protocol: 'http' }
        }];
        await (discovery as any).poll('greeter');
        expect(snapshots.length).toBeGreaterThanOrEqual(2);
        expect(snapshots[snapshots.length - 1][0].id).toBe('greeter-3');
        discovery.onDestroy();
    });
});
