import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { Controller, Get, Handle, Payload, provideService, useRouter } from '@tsdi/service';
import { Transport } from '@tsdi/common';
import { useHttpTransport } from '../../http/src/server';
import { InMemoryServiceDiscovery } from '../../discovery/src';
import { useGateway } from '../src';
import expect = require('expect');
import * as http from 'node:http';
import { withUdpTransport } from '../../udp/src/client';
import { useUdpTransport } from '../../udp/src/server';
import { provideClient, withTimeout } from '../../client/src';

const PORT_SEED = Number(process.env.TSIO_TEST_GATEWAY_PORT_SEED ?? (process.pid % 1000));
const UPSTREAM_PORT = 26000 + (PORT_SEED * 10);
const GATEWAY_PORT = UPSTREAM_PORT + 1;
const UDP_PORT = UPSTREAM_PORT + 2;

@Controller('/users')
class UpstreamController {
    @Get('/profile')
    profile() {
        return { service: 'users', ok: true };
    }
}

class UdpPatternService {
    @Handle({ cmd: 'echo' }, Transport.UDP)
    echo(@Payload() payload: { msg: string }) {
        return { protocol: 'udp', echoed: payload.msg };
    }
}

describe('Gateway E2E', () => {
    @Module({
        imports: [LoggerModule],
        declarations: [UpstreamController],
        providers: [
            InMemoryServiceDiscovery,
            provideService(useRouter(),
                useHttpTransport({
                    listenOpts: { port: UPSTREAM_PORT, host: '127.0.0.1' },
                    serviceName: 'users-service',
                    asDefault: true
                }))
        ]
    })
    class UpstreamModule {}

    @Module({
        imports: [LoggerModule],
        declarations: [UdpPatternService],
        providers: [
            provideService(useRouter(),
                useUdpTransport({
                    listenOpts: { port: UDP_PORT, host: '127.0.0.1' },
                    serviceName: 'udp-service',
                    asDefault: true
                })),
            provideClient(
                withTimeout(),
                withUdpTransport({
                    host: '127.0.0.1',
                    port: UDP_PORT,
                    microservice: true,
                    asDefault: true
                }))
        ]
    })
    class UdpModule {}

    @Module({
        imports: [LoggerModule],
        providers: [
            InMemoryServiceDiscovery,
            provideClient(
                withTimeout(),
                withUdpTransport({
                    host: '127.0.0.1',
                    port: UDP_PORT,
                    microservice: true,
                    asDefault: true
                })),
            provideService(
                useRouter(),
                useGateway({
                    routes: [{
                        path: '/gateway/users',
                        service: 'users-service',
                        targetUrl: `http://127.0.0.1:${UPSTREAM_PORT}`,
                        stripPrefix: true,
                        targetPath: '/users'
                    }, {
                        path: '/limited',
                        service: 'users-service',
                        targetUrl: `http://127.0.0.1:${UPSTREAM_PORT}`,
                        stripPrefix: true,
                        targetPath: '/users/profile',
                        rateLimit: { limit: 1, windowMs: 10_000 }
                    }, {
                        path: '/gateway/udp',
                        service: 'udp-service',
                        transport: Transport.UDP,
                        pattern: { cmd: 'echo' } as any,
                        rewrite: {
                            body: (request: any) => ({
                                msg: request.query?.msg ?? request.body?.msg ?? ''
                            })
                        }
                    }],
                    rateLimit: false
                }),
                useHttpTransport({
                    listenOpts: { port: GATEWAY_PORT, host: '127.0.0.1' },
                    asDefault: true
                })
            )
        ]
    })
    class GatewayModule {}

    let upstreamCtx: ApplicationContext;
    let udpCtx: ApplicationContext;
    let gatewayCtx: ApplicationContext;

    before(async () => {
        upstreamCtx = await Application.run(UpstreamModule);
        udpCtx = await Application.run(UdpModule);
        gatewayCtx = await Application.run(GatewayModule);
    });

    after(async () => {
        if (gatewayCtx) await gatewayCtx.close();
        if (udpCtx) await udpCtx.close();
        if (upstreamCtx) await upstreamCtx.close();
    });

    function request(path: string): Promise<{ status: number; body: string }> {
        return new Promise((resolve, reject) => {
            const req = http.request({
                host: '127.0.0.1',
                port: GATEWAY_PORT,
                path,
                method: 'GET',
                headers: { accept: 'application/json' }
            }, res => {
                let body = '';
                res.setEncoding('utf8');
                res.on('data', chunk => body += chunk);
                res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
            });
            req.on('error', reject);
            req.end();
        });
    }

    function post(path: string, body: any): Promise<{ status: number; body: string }> {
        return new Promise((resolve, reject) => {
            const payload = JSON.stringify(body);
            const req = http.request({
                host: '127.0.0.1',
                port: GATEWAY_PORT,
                path,
                method: 'POST',
                headers: {
                    accept: 'application/json',
                    'content-type': 'application/json',
                    'content-length': Buffer.byteLength(payload)
                }
            }, res => {
                let responseBody = '';
                res.setEncoding('utf8');
                res.on('data', chunk => responseBody += chunk);
                res.on('end', () => resolve({ status: res.statusCode ?? 0, body: responseBody }));
            });
            req.on('error', reject);
            req.write(payload);
            req.end();
        });
    }

    it('forwards gateway requests to the upstream service', async () => {
        const response = await request('/gateway/users/profile');
        expect(response.status).toBe(200);
        expect(JSON.parse(response.body)).toEqual({ service: 'users', ok: true });
    });

    it('applies route-level rate limit', async () => {
        const first = await request('/limited');
        expect(first.status).toBe(200);

        const second = await request('/limited');
        expect(second.status).toBe(429);
    });

    it('forwards gateway requests to udp downstream services', async () => {
        const queryResponse = await request('/gateway/udp?msg=hello');
        expect(queryResponse.status).toBe(200);
        expect(JSON.parse(queryResponse.body)).toMatchObject({ protocol: 'udp', echoed: 'hello' });

        const bodyResponse = await post('/gateway/udp', { msg: 'world' });
        expect(bodyResponse.status).toBe(200);
        expect(JSON.parse(bodyResponse.body)).toMatchObject({ protocol: 'udp', echoed: 'world' });
    });
});
