import { Application, ApplicationContext } from '@tsdi/core';
import { Module } from '@tsdi/ioc';
import { LoggerModule } from '@tsdi/logger';
import { GET } from '@tsdi/common';
import { provideService, withServiceRouter, RouteMapping } from '@tsdi/service';
import { provideClient } from '@tsdi/client';
import { withHttpTransport } from '../../http/src/server';
import { withHttpClientTransport } from '../../http/src/client';
import { HttpClient } from '../../http/src/client/client';
import { KafkaClient, withKafkaClientTransport, withKafkaTransport } from '../src';
import { DeviceController } from './controller';
import { catchError, lastValueFrom, of } from 'rxjs';
import expect = require('expect');

@RouteMapping('/content')
class ContentController {
    @RouteMapping('/510100_full.json', GET)
    json() {
        return { features: ['feature-a', 'feature-b'] };
    }
}

const HTTP_PORT = 21310;

@Module({
    imports: [LoggerModule],
    declarations: [DeviceController, ContentController],
    providers: [
        provideService(
            withServiceRouter(),
            withServiceRouter({ microservice: true }),
            withHttpTransport({
                microservice: false as any,
                listenOpts: { port: HTTP_PORT, host: '127.0.0.1' }
            }),
            withKafkaTransport()
        ),
        provideClient(
            withHttpClientTransport({
                url: `http://127.0.0.1:${HTTP_PORT}`,
                microservice: false,
                asDefault: true
            }),
            withKafkaClientTransport({ asDefault: true })
        )
    ]
})
class KafkaHttpHybridModule { }

if (process.env.TSIO_TEST_KAFKA) describe('Kafka hybrid HTTP server and Kafka client', () => {
    let ctx: ApplicationContext;
    let httpClient: HttpClient;
    let kafkaClient: KafkaClient;

    const sendHttp = (url: string, options: any = {}) => {
        return lastValueFrom(httpClient.send(url, options).pipe(catchError(err => of(err))));
    };

    const sendKafka = (pattern: any, options: any = {}) => {
        return lastValueFrom(kafkaClient.send(pattern, options).pipe(catchError(err => of(err))));
    };

    before(async () => {
        ctx = await Application.run(KafkaHttpHybridModule);
        httpClient = ctx.get(HttpClient);
        kafkaClient = ctx.get(KafkaClient);
        await new Promise(resolve => setTimeout(resolve, 1000));
    });

    after(async () => {
        if (ctx) {
            await ctx.destroy();
        }
    });

    it('resolves HTTP and Kafka clients', () => {
        expect(httpClient).toBeDefined();
        expect(kafkaClient).toBeDefined();
    });

    it('serves JSON content over HTTP', async () => {
        const result: any = await sendHttp('/content/510100_full.json', { method: 'GET', responseType: 'json' });
        expect(result).toBeDefined();
        expect(Array.isArray(result.features)).toBeTruthy();
    });

    it('queries all devices over HTTP', async () => {
        const result: any = await sendHttp('/device');
        expect(Array.isArray(result)).toBeTruthy();
        expect(result.length).toBe(2);
        expect(result[0].name).toBe('1');
    });

    it('queries devices with params over HTTP', async () => {
        const result: any = await sendHttp('/device', { params: { name: '2' } });
        expect(Array.isArray(result)).toBeTruthy();
        expect(result.length).toBe(1);
        expect(result[0].name).toBe('2');
    });

    it('returns not found for missing route', async () => {
        const result: any = await sendHttp('/device/init5', {
            method: 'POST',
            observe: 'response',
            params: { name: 'test' }
        });
        expect(result.status ?? result.statusCode).toBe(404);
    });

    it('returns bad request for invalid path parameter', async () => {
        const result: any = await sendHttp('/device/-1/used', {
            observe: 'response',
            params: { age: '20' }
        });
        expect(result.status ?? result.statusCode).toBe(400);
    });

    it('returns object response for POST route', async () => {
        const result: any = await sendHttp('/device/init', {
            observe: 'response',
            method: 'POST',
            params: { name: 'test' }
        });
        expect(result.ok).toBeTruthy();
        expect(result.body.name).toBe('test');
    });

    it('applies request body pipes over HTTP', async () => {
        const result: any = await sendHttp('/device/usage', {
            observe: 'response',
            method: 'POST',
            body: { id: 'test1', age: '50', createAt: '2021-10-01' }
        });
        expect(result.ok).toBeTruthy();
        expect(result.body.year).toBe(50);
        expect(new Date(result.body.createAt)).toEqual(new Date('2021-10-01'));
    });

    it('returns text response from observable route', async () => {
        const result: any = await sendHttp('/device/status', {
            observe: 'response',
            responseType: 'text'
        });
        expect(result.ok).toBeTruthy();
        expect(result.body).toBe('working');
    });

    it('handles Kafka object pattern messages', async () => {
        const result: any = await sendKafka({ cmd: 'xxx' }, {
            observe: 'response',
            payload: { message: 'reload2' },
            responseType: 'text'
        });
        expect(result.ok).toBeTruthy();
        expect(result.body ?? result.payload).toBe('reload2');
    });

    it('handles Kafka subscribe messages', async () => {
        const result: any = await sendKafka('topic-device', {
            observe: 'response',
            payload: { message: 'load' },
            responseType: 'text'
        });
        expect(result.ok).toBeTruthy();
        expect(result.body ?? result.payload).toBe('load');
    });

    it('handles Kafka wildcard messages', async () => {
        const result: any = await sendKafka('dd/status', {
            observe: 'response',
            payload: { message: 'reload' },
            responseType: 'text'
        });
        expect(result.ok).toBeTruthy();
        expect(result.body ?? result.payload).toBe('reload');
    });
});
