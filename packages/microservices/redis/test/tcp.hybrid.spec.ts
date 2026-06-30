import { Application, ApplicationContext } from '@tsdi/core';
import { Module } from '@tsdi/ioc';
import { LoggerModule } from '@tsdi/logger';
import { GET, BadRequestException, Transport, normalize } from '@tsdi/common';
import { provideService, useInterceptors, useRouter, RouteMapping, RequestBody, RequestParam, RequestPath, RedirectResult } from '@tsdi/service';
import { provideClient } from '@tsdi/client';
import { useTcpTransport, withTcpTransport, TcpClient } from '../../tcp';
import { RedisClient, withRedisTransport, useRedisTransport } from '../src';
import { DeviceController } from './controller';
import { BigFileInterceptor } from './BigFileInterceptor';
import { catchError, lastValueFrom, of } from 'rxjs';
import Redis from 'ioredis';
import expect = require('expect');

@RouteMapping('/content')
class ContentController {
    @RouteMapping('/510100_full.json', GET)
    json() {
        return { features: ['feature-a', 'feature-b'] };
    }
}

@RouteMapping({ route: '/content', transport: Transport.Redis })
class RedisContentController {
    @RouteMapping('/510100_full.json', GET)
    json() {
        return { features: ['feature-a', 'feature-b'] };
    }

    @RouteMapping('/big.json', GET)
    big() {
        throw Object.assign(new Error('great than max size'), {
            statusCode: 500,
            statusMessage: 'great than max size'
        });
    }
}

@RouteMapping({ route: '/device', transport: Transport.Redis })
class RedisDeviceController {
    @RouteMapping('/usage', 'POST')
    age(@RequestBody() id: string, @RequestBody('age', { pipe: 'int' }) year: number, @RequestBody({ pipe: 'date' }) createAt: Date) {
        return { id, year, createAt };
    }

    @RouteMapping('/usege/find', 'GET')
    agela(@RequestParam('age', { pipe: 'int' }) limit: number) {
        return limit;
    }

    @RouteMapping('/:age/used', 'GET')
    resfulquery(@RequestPath('age', { pipe: 'int' }) age1: number) {
        if (age1 <= 0) {
            throw new BadRequestException();
        }
        return age1;
    }

    @RouteMapping('/status', 'GET')
    getLastStatus(@RequestParam('redirect', { nullable: true }) redirect: string) {
        if (redirect === 'reload') {
            return new RedirectResult('/device/reload');
        }
        return of('working');
    }
}

const TCP_PORT = 21411;
const REDIS_URL = 'redis://127.0.0.1:6379';
const REDIS_BRIDGE_CHANNEL = 'hybrid.route.bridge';

@Module({
    imports: [LoggerModule],
    declarations: [DeviceController, ContentController, RedisContentController, RedisDeviceController],
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
            useRedisTransport({ url: REDIS_URL, channels: [REDIS_BRIDGE_CHANNEL] })
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

describe('Redis hybrid TCP server and Redis client', () => {
    let ctx: ApplicationContext;
    let tcpClient: TcpClient;
    let redisClient: RedisClient;
    let publisher: Redis;
    let subscriber: Redis;

    const sendTcp = (url: string, options: any = {}) => {
        return lastValueFrom(tcpClient.send(url, options).pipe(catchError(err => of(err))));
    };

    const sendRedis = (pattern: any, options: any = {}) => {
        return lastValueFrom(redisClient.send(pattern, options).pipe(catchError(err => of(err))));
    };

    const sendRedisRoute = async (url: string, options: any = {}) => {
        const normalizedUrl = normalize(url);
        const topic = normalizedUrl.replace(/\//g, '.');
        const responseChannel = `${REDIS_BRIDGE_CHANNEL}:response:${Date.now()}-${Math.random()}`;
        return new Promise<any>(async (resolve, reject) => {
            const timeout = options.timeout ?? 5000;
            const timer = setTimeout(() => {
                subscriber.off('message', onMessage);
                reject(new Error('Timeout'));
            }, timeout);
            const onMessage = (_channel: string, payload: string) => {
                if (_channel !== responseChannel) {
                    return;
                }
                clearTimeout(timer);
                subscriber.off('message', onMessage);
                void subscriber.unsubscribe(responseChannel);
                resolve(JSON.parse(payload));
            };

            await subscriber.subscribe(responseChannel);
            subscriber.on('message', onMessage);
            await publisher.publish(REDIS_BRIDGE_CHANNEL, JSON.stringify({
                url: topic,
                topic,
                method: options.method ?? 'GET',
                params: options.params,
                query: options.query,
                body: options.body,
                payload: options.payload,
                responseChannel
            }));
        });
    };

    before(async () => {
        ctx = await Application.run(RedisTcpHybridModule);
        tcpClient = ctx.get(TcpClient);
        redisClient = ctx.get(RedisClient);
        publisher = new Redis(REDIS_URL);
        subscriber = new Redis(REDIS_URL);
        await new Promise(resolve => setTimeout(resolve, 1000));
    });

    after(async () => {
        if (subscriber) {
            await subscriber.quit();
        }
        if (publisher) {
            await publisher.quit();
        }
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
        const result: any = await sendRedisRoute('/content/510100_full.json', { method: 'GET' });
        expect(result.ok).toBe(true);
        expect(Array.isArray((result.body ?? result.payload).features)).toBeTruthy();
    });

    it('returns large content error over Redis', async () => {
        const result: any = await sendRedisRoute('/content/big.json', { method: 'GET', timeout: 15000 });
        expect(result.ok).toBe(false);
        expect(result.statusCode ?? result.status).toBeGreaterThanOrEqual(400);
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

    it('returns bad request for invalid path parameter over Redis routing', async () => {
        const result: any = await sendRedisRoute('/device/-1/used', { method: 'GET' });
        expect(result.statusCode ?? result.status).toBe(400);
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

    it('returns missing-parameter error for missing body over Redis routing', async () => {
        const result: any = await sendRedisRoute('/device/usage', { method: 'POST' });
        expect(result.statusCode ?? result.status).toBe(400);
        expect(result.statusMessage).toContain('required parameters were missing');
    });

    it('returns pipe error for invalid body over Redis routing', async () => {
        const result: any = await sendRedisRoute('/device/usage', {
            method: 'POST',
            body: { id: 'test1', age: 'test', createAt: '2021-10-01' }
        });
        expect(result.statusCode ?? result.status).toBe(400);
        expect(result.statusMessage).toContain('InvalidPipeArgument');
    });

    it('applies request param pipes over Redis routing', async () => {
        const result: any = await sendRedisRoute('/device/usege/find', { method: 'GET', query: { age: '20' } });
        expect(result.ok).toBe(true);
        expect(result.body ?? result.payload).toBe(20);
    });

    it('returns missing-parameter error for missing query param over Redis routing', async () => {
        const result: any = await sendRedisRoute('/device/usege/find', { method: 'GET' });
        expect(result.statusCode ?? result.status).toBe(400);
        expect(result.statusMessage).toContain('required parameters were missing');
    });

    it('returns pipe error for invalid query param over Redis routing', async () => {
        const result: any = await sendRedisRoute('/device/usege/find', { method: 'GET', query: { age: 'test' } });
        expect(result.statusCode ?? result.status).toBe(400);
        expect(result.statusMessage).toContain('InvalidPipeArgument');
    });

    it('applies path param pipes over Redis routing', async () => {
        const result: any = await sendRedisRoute('/device/30/used', { method: 'GET' });
        expect(result.ok).toBe(true);
        expect(result.body ?? result.payload).toBe(30);
    });

    it('returns not found for missing path segment over Redis routing', async () => {
        const result: any = await sendRedisRoute('/device//used', { method: 'GET' });
        expect(result.statusCode ?? result.status).toBe(404);
    });

    it('returns not found for invalid path pipe over Redis routing', async () => {
        const result: any = await sendRedisRoute('/device/age1/used', { method: 'GET' });
        expect(result.statusCode ?? result.status).toBe(400);
    });

    it('returns text response from observable route', async () => {
        const result: any = await sendTcp('/device/status', {
            observe: 'response',
            responseType: 'text'
        });
        expect(result.ok).toBeTruthy();
        expect(result.body).toBe('working');
    });

    it('returns redirect envelope over Redis routing', async () => {
        const result: any = await sendRedisRoute('/device/status', {
            method: 'GET',
            query: { redirect: 'reload' }
        });
        expect(result.statusCode ?? result.status).toBe(302);
        expect(result.statusMessage).toBe('OK');
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
