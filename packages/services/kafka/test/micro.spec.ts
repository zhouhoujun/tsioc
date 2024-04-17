import { Application, ApplicationContext } from '@tsdi/core';
import { Injectable, Injector, Module, isArray, isString, tokenId } from '@tsdi/ioc';
import { TransportErrorResponse } from '@tsdi/common';
import { EndpointModule, Handle, Payload, RequestPath, Subscribe } from '@tsdi/endpoints';
import { ServerModule } from '@tsdi/platform-server';
import { ServerEndpointModule } from '@tsdi/platform-server/endpoints';
import { LoggerModule } from '@tsdi/logger';
import { catchError, lastValueFrom, of } from 'rxjs';
import expect = require('expect');
import { KAFKA_SERV_INTERCEPTORS, KafkaClient, KafkaModule, KafkaServer } from '../src';
import { BigFileInterceptor } from './BigFileInterceptor';
import { ClientModule } from '@tsdi/common/client';


const SENSORS = tokenId<string[]>('SENSORS');


@Injectable()
export class KafkaService {

    constructor(private client: KafkaClient) {

    }


    @Handle({ cmd: 'xxx' })
    async handleMessage(@Payload() message: string) {
        return message;
    }

    @Handle('sensor.message.*')
    async handleMessage1(@Payload() message: string) {
        return message;
    }

    @Handle('sensor/message/*', 'kafka')
    async handleMessage2(@Payload() message: string) {
        return message;
    }

    @Subscribe('sensor/submessage/*', 'kafka')
    async subMessage2(@Payload() message: string) {
        return message;
    }

    @Subscribe('sensor/:id/start', 'kafka', {
        paths: {
            id: SENSORS
        }
    })
    async subsMessage(@RequestPath() id: string, @Payload() message: string) {
        //todo start sensor
        // this.client.send('');
        return message;
    }
}


@Module({
    baseURL: __dirname,
    imports: [
        ServerModule,
        LoggerModule,
        ServerEndpointModule,
        ClientModule.register({
            transport: 'kafka',
            clientOpts: {
                // connectOpts: {
                //     port: 6379
                // },
                timeout: 300
            }
        }),
        EndpointModule.register({
            microservice: true,
            transport: 'kafka'
        }),
        // KafkaMicroServiceModule.withOption({
        //     serverOpts: {
        //         // timeout: 1000,
        //         // connectOpts: {
        //         //     port: 2000
        //         // }
        //     }
        // })
    ],
    declarations: [
        KafkaService
    ]
})
export class MicroTestModule {

}



describe('Kafka Micro Service', () => {
    let ctx: ApplicationContext;
    let injector: Injector;

    let client: KafkaClient;

    before(async () => {
        ctx = await Application.run(MicroTestModule, {
            providers: [
                { provide: KAFKA_SERV_INTERCEPTORS, useClass: BigFileInterceptor, multi: true },
                { provide: SENSORS, useValue: 'sensor01', multi: true },
                { provide: SENSORS, useValue: 'sensor02', multi: true },
            ]
        });
        injector = ctx.injector;
        client = injector.get(KafkaClient);
    });

    it('fetch json', async () => {
        const res: any = await lastValueFrom(client.send('content/510100_full.json')
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));

        // expect(res).toBeDefined();
        // expect(isArray(res.features)).toBeTruthy();
        expect(res).toBeInstanceOf(TransportErrorResponse);
        expect(res.statusMessage).toEqual('Not Found');
    })

    it('fetch big json', async () => {
        const res: any = await lastValueFrom(client.send('content/big.json', { timeout: 5000 })
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));

        // expect(res).toBeDefined();
        // expect(isArray(res.features)).toBeTruthy();
        expect(res).toBeInstanceOf(TransportErrorResponse);
        expect(res.statusMessage).toContain('Packet length 23.74mb great than max size');
    })

    it('fetch json 2', async () => {
        const res: any = await lastValueFrom(client.send('content/test1/jsons/data1.json')
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));

        // expect(res).toBeDefined();
        // expect(res.test).toEqual('ok');
        expect(res).toBeInstanceOf(TransportErrorResponse);
        expect(res.statusMessage).toEqual('Not Found');
    })

    it('cmd message', async () => {
        const a = await lastValueFrom(client.send({ cmd: 'xxx' }, {
            payload: {
                message: 'ble'
            }
        })
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));

        expect(isString(a)).toBeTruthy();
        expect(a).toEqual('ble');
    });

    it('sensor.message not found', async () => {
        const a = await lastValueFrom(client.send('sensor.message', {
            payload: {
                message: 'ble'
            }
        })
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));

        expect(a).toBeInstanceOf(TransportErrorResponse);
        expect(a.statusMessage.indexOf('reply has not registered.')).toBeGreaterThan(1);
    });

    it('sensor.message.* message', async () => {
        const a = await lastValueFrom(client.send('sensor.message.update', {
            payload: {
                message: 'ble'
            }
        })
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));

        expect(isString(a)).toBeTruthy();
        expect(a).toEqual('ble');
    });

    it('sensor/message not found', async () => {
        const a = await lastValueFrom(client.send('sensor/message', {
            payload: {
                message: 'ble'
            }
        })
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));

        expect(a).toBeInstanceOf(TransportErrorResponse);
        expect(a.statusMessage.indexOf('reply has not registered.')).toBeGreaterThan(1);
    });

    it('sensor/message/* message', async () => {
        const a = await lastValueFrom(client.send('sensor/message/update', {
            payload: {
                message: 'ble'
            }
        })
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));

        expect(isString(a)).toBeTruthy();
        expect(a).toEqual('ble');
    });

    it('sensor/submessage/* message', async () => {
        const a = await lastValueFrom(client.send('sensor/submessage/update', {
            payload: {
                message: 'ble'
            }
        })
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));

        expect(isString(a)).toBeTruthy();
        expect(a).toEqual('ble');
    });

    it('Subscribe sensor message', async () => {
        const a = await lastValueFrom(client.send('sensor/sensor01/start', {
            payload: {
                message: 'ble'
            }
        })
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));

        expect(isString(a)).toBeTruthy();
        expect(a).toEqual('ble');
    });

    it('Subscribe sensor message not found', async () => {
        const a = await lastValueFrom(client.send('sensor/sensor03/start', {
            payload: {
                message: 'ble'
            }
        })
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));

        expect(a).toBeInstanceOf(TransportErrorResponse);
        expect(a.statusMessage.indexOf('reply has not registered.')).toBeGreaterThan(1);
    });



    after(() => {
        return ctx?.destroy();
    })

});
