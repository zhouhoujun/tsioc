import { Application, ApplicationContext } from '@tsdi/core';
import { Module } from '@tsdi/ioc';
import { LoggerModule } from '@tsdi/logger';
import { GET, ErrorResponse } from '@tsdi/common';
import { provideService, useInterceptors, useRouter, RouteMapping } from '@tsdi/service';
import { provideClient } from '@tsdi/client';
import { useTcpTransport } from '../../tcp/src/server';
import { withTcpTransport } from '../../tcp/src/client';
import { TcpClient } from '../../tcp/src/client/client';
import { RedisClient, withRedisTransport, useRedisTransport } from '../src';
import { DeviceController } from './controller';
import { BigFileInterceptor } from './BigFileInterceptor';
import { catchError, lastValueFrom, of } from 'rxjs';
import expect = require('expect');

@RouteMapping('/content')
class ContentController {
    @RouteMapping('/510100_full.json', GET)
    json() {
        return { features: ['feature-a', 'feature-b'] };
    }
}

const TCP_PORT = 21411;
const REDIS_URL = 'redis://127.0.0.1:6379';

@Module({
    imports: [LoggerModule],
    declarations: [DeviceController, ContentController],
    providers: [
        provideService(
            useRouter(),
            useRouter({ microservice: true }),
            useInterceptors(BigFileInterceptor),
            useTcpTransport({
                microservice: false as any,
                listenOpts: { port: TCP_PORT, host: '127.0.0.1' },
                asDefault: true
            }),
            useRedisTransport({ url: REDIS_URL })
        ),
        provideClient(
            withTcpTransport({
                connectOpts: { port: TCP_PORT, host: '127.0.0.1' },
                microservice: false,
                asDefault: true
            }),
            withRedisTransport({ url: REDIS_URL, asDefault: true })
        )
    ]
})
class RedisTcpHybridModule { }

if (process.env.TSIO_TEST_REDIS) describe('Redis hybrid TCP server and Redis client', () => {
    let ctx: ApplicationContext;
    let tcpClient: TcpClient;
    let redisClient: RedisClient;

    const sendTcp = (url: string, options: any = {}) => {
        return lastValueFrom(tcpClient.send(url, options).pipe(catchError(err => of(err))));
    };

    const sendRedis = (pattern: any, options: any = {}) => {
        return lastValueFrom(redisClient.send(pattern, options).pipe(catchError(err => of(err))));
    };

    before(async () => {
        ctx = await Application.run(RedisTcpHybridModule);
        tcpClient = ctx.get(TcpClient);
        redisClient = ctx.get(RedisClient);
        await new Promise(resolve => setTimeout(resolve, 1000));
    });

    after(async () => {
        if (ctx) {
            await ctx.destroy();
        }
    });

    it('resolves TCP and Redis clients', () => {
        expect(tcpClient).toBeDefined();
        expect(redisClient).toBeDefined();
    });

    it('serves JSON content over TCP', async () => {
        const result: any = await sendTcp('/content/510100_full.json', { method: 'GET', responseType: 'json' });
        expect(result).toBeDefined();
        expect(Array.isArray(result.features)).toBeTruthy();
    });

    it('serves JSON content over Redis', async () => {
        const result: any = await sendRedis('content/510100_full.json');
        expect(result).toBeDefined();
        expect(Array.isArray(result.features)).toBeTruthy();
    });

    it('returns large content error over Redis', async () => {
        const result: any = await sendRedis('content/big.json');
        expect(result).toBeInstanceOf(ErrorResponse);
        expect(result.statusMessage).toContain('great than max size');
    });

    it('queries all devices over TCP', async () => {
        const result: any = await sendTcp('/device');
        expect(Array.isArray(result)).toBeTruthy();
        expect(result.length).toBe(2);
        expect(result[0].name).toBe('1');
    });

    it('queries devices with params over TCP', async () => {
        const result: any = await sendTcp('/device', { params: { name: '2' } });
        expect(Array.isArray(result)).toBeTruthy();
        expect(result.length).toBe(1);
        expect(result[0].name).toBe('2');
    });

    it('returns not found for missing route', async () => {
        const result: any = await sendTcp('/device/init5', { method: 'POST', params: { name: 'test' } });
        expect(result.statusText ?? result.statusMessage).toBe('Not Found');
    });

    it('returns bad request for invalid path parameter', async () => {
        const result: any = await sendTcp('/device/-1/used', { observe: 'response', params: { age: '20' } });
        expect(result.statusText ?? result.statusMessage).toBe('Bad Request');
    });

    it('returns object response for POST route', async () => {
        const result: any = await sendTcp('/device/init', {
            observe: 'response',
            method: 'POST',
            params: { name: 'test' }
        });
        expect(result.ok).toBeTruthy();
        expect(result.body.name).toBe('test');
    });

    it('returns text response for async route', async () => {
        const result: any = await sendTcp('/device/update', {
            observe: 'response',
            responseType: 'text',
            method: 'POST',
            params: { version: '1.0.0' }
        });
        expect(result.ok).toBeTruthy();
        expect(result.body).toBe('1.0.0');
    });

    it('applies request body pipes over TCP', async () => {
        const result: any = await sendTcp('/device/usage', {
            observe: 'response',
            method: 'POST',
            body: { id: 'test1', age: '50', createAt: '2021-10-01' }
        });
        expect(result.ok).toBeTruthy();
        expect(result.body.year).toBe(50);
        expect(new Date(result.body.createAt)).toEqual(new Date('2021-10-01'));
    });

    it('returns bad request for missing body', async () => {
        const result: any = await sendTcp('/device/usage', { observe: 'response', method: 'POST' });
        expect(result.statusText ?? result.statusMessage).toBe('Bad Request');
    });

    it('returns bad request for invalid body pipe', async () => {
        const result: any = await sendTcp('/device/usage', {
            observe: 'response',
            method: 'POST',
            body: { id: 'test1', age: 'test', createAt: '2021-10-01' }
        });
        expect(result.statusText ?? result.statusMessage).toBe('Bad Request');
    });

    it('applies request param pipes over TCP', async () => {
        const result: any = await sendTcp('/device/usege/find', { observe: 'response', params: { age: '20' } });
        expect(result.ok).toBeTruthy();
        expect(result.body).toBe(20);
    });

    it('returns bad request for missing query param', async () => {
        const result: any = await sendTcp('/device/usege/find', { observe: 'response' });
        expect(result.statusText ?? result.statusMessage).toBe('Bad Request');
    });

    it('returns bad request for invalid query param pipe', async () => {
        const result: any = await sendTcp('/device/usege/find', { observe: 'response', params: { age: 'test' } });
        expect(result.statusText ?? result.statusMessage).toBe('Bad Request');
    });

    it('applies path param pipes over TCP', async () => {
        const result: any = await sendTcp('/device/30/used', { observe: 'response', params: { age: '20' } });
        expect(result.ok).toBeTruthy();
        expect(result.body).toBe(30);
    });

    it('returns not found for missing path segment', async () => {
        const result: any = await sendTcp('/device//used', { observe: 'response', params: { age: '20' } });
        expect(result.statusText ?? result.statusMessage).toBe('Not Found');
    });

    it('returns bad request for invalid path pipe', async () => {
        const result: any = await sendTcp('/device/age1/used', { observe: 'response', params: { age: '20' } });
        expect(result.statusText ?? result.statusMessage).toBe('Bad Request');
    });

    it('returns text response from observable route', async () => {
        const result: any = await sendTcp('/device/status', {
            observe: 'response',
            responseType: 'text'
        });
        expect(result.ok).toBeTruthy();
        expect(result.body).toBe('working');
    });

    it('returns not supported for redirect', async () => {
        const result: any = await sendTcp('/device/status', {
            observe: 'response',
            params: { redirect: 'reload' },
            responseType: 'text'
        });
        expect(result.statusText ?? result.statusMessage).toBe('Not Supported');
    });

    it('handles Redis object pattern messages', async () => {
        const result: any = await sendRedis({ cmd: 'xxx' }, {
            observe: 'response',
            payload: { message: 'reload2' },
            responseType: 'text'
        });
        expect(result.ok).toBeTruthy();
        expect(result.body ?? result.payload).toBe('reload2');
    });

    it('handles Redis wildcard messages', async () => {
        const result: any = await sendRedis('dd/status', {
            observe: 'response',
            payload: { message: 'reload' },
            responseType: 'text'
        });
        expect(result.ok).toBeTruthy();
        expect(result.body ?? result.payload).toBe('reload');
    });
});
