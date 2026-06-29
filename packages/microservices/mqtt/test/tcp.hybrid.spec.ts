import { Application, ApplicationContext } from '@tsdi/core';
import { Module } from '@tsdi/ioc';
import { LoggerModule } from '@tsdi/logger';
import { GET } from '@tsdi/common';
import { provideService, useRouter, RouteMapping } from '@tsdi/service';
import { provideClient } from '@tsdi/client';
import { useTcpTransport } from '../../tcp/src/server';
import { withTcpTransport, TcpClient } from '../../tcp/src/client';
import { MqttClient, withMqttTransport, useMqttTransport } from '../src';
import { DeviceController } from './controller';
import { catchError, lastValueFrom, of } from 'rxjs';
import expect = require('expect');

const TCP_PORT = 21421;

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
            useTcpTransport({ microservice: false as any, listenOpts: { port: TCP_PORT, host: '127.0.0.1' }, asDefault: true }),
            useMqttTransport({ url: 'mqtt://127.0.0.1:1883' })),
        provideClient(
            withTcpTransport({ connectOpts: { port: TCP_PORT, host: '127.0.0.1' }, microservice: false, asDefault: true }),
            withMqttTransport({ url: 'mqtt://127.0.0.1:1883' }))
    ]
})
class MqttTcpHybridModule { }

describe('Mqtt hybrid TCP server and Mqtt client', () => {
    let ctx: ApplicationContext;
    let tcpClient: TcpClient;
    let mqttClient: MqttClient;

    const sendTcp = (url: string, options: any = {}) => {
        return lastValueFrom(tcpClient.send(url, options).pipe(catchError(err => of(err))));
    };

    const sendProto = (pattern: any, options: any = {}) => {
        return lastValueFrom(mqttClient.send(pattern, options).pipe(catchError(err => of(err))));
    };

    before(async () => {
        ctx = await Application.run(MqttTcpHybridModule);
        tcpClient = ctx.get(TcpClient);
        mqttClient = ctx.get(MqttClient);
        await new Promise(r => setTimeout(r, 1000));
    });
    after(async () => { if (ctx) await ctx.destroy(); });

    it('resolves clients', () => { expect(tcpClient).toBeDefined(); expect(mqttClient).toBeDefined(); });
    it('serves JSON over TCP', async () => {
        const r: any = await sendTcp('/content/510100_full.json', { method: 'GET', responseType: 'json' });
        expect(r).toBeDefined(); expect(Array.isArray(r.features)).toBeTruthy();
    });
    it('queries devices', async () => {
        const r: any = await sendTcp('/device');
        expect(Array.isArray(r)).toBeTruthy(); expect(r.length).toBe(2);
    });
    it('queries with params', async () => {
        const r: any = await sendTcp('/device', { params: { name: '2' } });
        expect(r.length).toBe(1); expect(r[0].name).toBe('2');
    });
    it('supports observe body', async () => {
        const r: any = await sendTcp('/device', { observe: 'body' as any });
        expect(Array.isArray(r)).toBeTruthy(); expect(r.length).toBe(2);
    });
    it('supports observe response', async () => {
        const r: any = await sendTcp('/device', { observe: 'response' as any });
        expect(r.ok).toBeTruthy(); expect(Array.isArray(r.body)).toBeTruthy();
    });
    it('supports observe events', async () => {
        const r: any = await sendTcp('/device', { observe: 'events' as any });
        expect(r).toBeDefined();
    });
    it('returns 404', async () => {
        const r: any = await sendTcp('/device/init5', { method: 'POST', params: { name: 'test' } });
        expect(r.statusText ?? r.statusMessage).toBe('Not Found');
    });
    it('returns 400', async () => {
        const r: any = await sendTcp('/device/-1/used', { observe: 'response', params: { age: '20' } });
        expect(r.statusText ?? r.statusMessage).toBe('Bad Request');
    });
});
