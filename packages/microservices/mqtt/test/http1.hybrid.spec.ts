import { Application, ApplicationContext } from '@tsdi/core';
import { Module } from '@tsdi/ioc';
import { LoggerModule } from '@tsdi/logger';
import { GET } from '@tsdi/common';
import { provideService, useRouter, RouteMapping } from '@tsdi/service';
import { provideClient } from '@tsdi/client';
import { useHttpTransport } from '../../http/src/server';
import { withHttpTransport } from '../../http/src/client';
import { HttpClient } from '../../http/src/client/client';
import { MqttClient, withMqttTransport, useMqttTransport } from '../src';
import { DeviceController } from './controller';
import { catchError, lastValueFrom, of } from 'rxjs';
import expect = require('expect');

const HTTP_PORT = 21321;

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
            useMqttTransport({ url: 'mqtt://127.0.0.1:1883' })),
        provideClient(
            withHttpTransport({ url: `http://127.0.0.1:${HTTP_PORT}`, microservice: false, asDefault: true }),
            withMqttTransport({ url: 'mqtt://127.0.0.1:1883' }))
    ]
})
class MqttHttpHybridModule { }

describe('Mqtt hybrid HTTP server and Mqtt client', () => {
    let ctx: ApplicationContext;
    let httpClient: HttpClient;
    let mqttClient: MqttClient;

    const sendHttp = (url: string, options: any = {}) => {
        return lastValueFrom(httpClient.send(url, options).pipe(catchError(err => of(err))));
    };

    const sendProto = (pattern: any, options: any = {}) => {
        return lastValueFrom(mqttClient.send(pattern, options).pipe(catchError(err => of(err))));
    };

    before(async () => {
        ctx = await Application.run(MqttHttpHybridModule);
        httpClient = ctx.get(HttpClient);
        mqttClient = ctx.get(MqttClient);
        await new Promise(r => setTimeout(r, 1000));
    });
    after(async () => { if (ctx) await ctx.destroy(); });

    it('resolves clients', () => { expect(httpClient).toBeDefined(); expect(mqttClient).toBeDefined(); });
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
});
