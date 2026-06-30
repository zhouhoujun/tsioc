import { Application, ApplicationContext } from '@tsdi/core';
import { Module } from '@tsdi/ioc';
import { LoggerModule } from '@tsdi/logger';
import { GET } from '@tsdi/common';
import { provideService, useRouter, RouteMapping } from '@tsdi/service';
import { provideClient } from '@tsdi/client';
import { useHttpTransport, withHttpTransport, HttpClient } from '../../http';
import { WsClient, withWsTransport, useWsTransport } from '../src';
import { DeviceController } from './controller';
import { catchError, lastValueFrom, of } from 'rxjs';
import expect = require('expect');

const HTTP_PORT = 21324;

@RouteMapping('/content')
class ContentController {
    @RouteMapping('/510100_full.json', GET)
    json() { return { features: ['feature-a', 'feature-b'] }; }
}

@Module({
    imports: [LoggerModule],
    declarations: [DeviceController, ContentController],
    providers: [
        provideService(useRouter(), useRouter({ microservice: true }),
            useHttpTransport({ microservice: false as any, listenOpts: { port: HTTP_PORT, host: '127.0.0.1' } }),
            useWsTransport({ listenOpts: { port: 11600, host: '127.0.0.1' } })),
        provideClient(
            withHttpTransport({ url: `http://127.0.0.1:${HTTP_PORT}`, microservice: false, asDefault: true }),
            withWsTransport({ url: 'ws://127.0.0.1:11600', asDefault: true }))
    ]
})
class WsHttpHybridModule { }

describe('WS hybrid HTTP server and Ws client', () => {
    let ctx: ApplicationContext;
    let httpClient: HttpClient;
    let wsClient: WsClient;

    const sendHttp = (url: string, options: any = {}) => {
        return lastValueFrom(httpClient.send(url, options).pipe(catchError(err => of(err))));
    };

    const sendProto = (pattern: any, options: any = {}) => {
        return lastValueFrom(wsClient.send(pattern, options).pipe(catchError(err => of(err))));
    };

    before(async () => {
        ctx = await Application.run(WsHttpHybridModule);
        httpClient = ctx.get(HttpClient);
        wsClient = ctx.get(WsClient);
        await new Promise(r => setTimeout(r, 1000));
    });
    after(async () => { if (ctx) await ctx.destroy(); });

    it('resolves clients', () => { expect(httpClient).toBeDefined(); expect(wsClient).toBeDefined(); });
    it('serves JSON over HTTP', async () => {
        const r: any = await sendHttp('/content/510100_full.json', { method: 'GET', responseType: 'json' });
        expect(r).toBeDefined(); expect(Array.isArray(r.features)).toBeTruthy();
    });
    it('queries devices', async () => {
        const r: any = await sendHttp('/device');
        expect(Array.isArray(r)).toBeTruthy(); expect(r.length).toBe(2);
    });
    it('queries with params', async () => {
        const r: any = await sendHttp('/device', { params: { name: '2' } });
        expect(r.length).toBe(1); expect(r[0].name).toBe('2');
    });
    it('supports observe body', async () => {
        const r: any = await sendHttp('/device', { observe: 'body' as any });
        expect(Array.isArray(r)).toBeTruthy(); expect(r.length).toBe(2);
    });
    it('supports observe response', async () => {
        const r: any = await sendHttp('/device', { observe: 'response' as any });
        expect(r.ok).toBeTruthy(); expect(Array.isArray(r.body)).toBeTruthy();
    });
    it('supports observe events', async () => {
        const r: any = await sendHttp('/device', { observe: 'events' as any });
        expect(r).toBeDefined();
    });
    it('returns 404', async () => {
        const r: any = await sendHttp('/device/init5', { method: 'POST', observe: 'response', params: { name: 'test' } });
        expect(r.status ?? r.statusCode).toBe(404);
    });
    it('returns 400', async () => {
        const r: any = await sendHttp('/device/-1/used', { observe: 'response', params: { age: '20' } });
        expect(r.status ?? r.statusCode).toBe(400);
    });
    it('handles cmd messages', async () => {
        const r: any = await sendProto({ cmd: 'xxx' }, { observe: 'response', payload: { message: 'reload2' }, responseType: 'text' });
        expect(r.ok).toBeTruthy(); expect(r.body ?? r.payload).toBe('reload2');
    });
});
