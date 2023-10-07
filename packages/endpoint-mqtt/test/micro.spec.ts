import { Application, ApplicationContext } from '@tsdi/core';
import { Injectable, Injector, Module, isArray, isString, tokenId } from '@tsdi/ioc';
import { TransportErrorResponse } from '@tsdi/common';
import { ClientModule } from '@tsdi/common/client';
import { EndpointsModule, Handle, Payload, RequestPath, Subscribe } from '@tsdi/endpoints';
import { JsonEndpointModule } from '@tsdi/endpoints/json';
import { MQTT_SERV_INTERCEPTORS, MqttClient, MqttServer } from '../src';
import { ServerModule } from '@tsdi/platform-server';
import { ServerEndpointModule } from '@tsdi/platform-server/endpoints';
import { LoggerModule } from '@tsdi/logger';
import { catchError, lastValueFrom, of } from 'rxjs';
import expect = require('expect');
import { BigFileInterceptor } from './BigFileInterceptor';


const SENSORS = tokenId<string[]>('SENSORS');


@Injectable()
export class MqttService {

    constructor(private client: MqttClient) {

    }


    @Handle({ cmd: 'xxx' })
    async handleMessage(@Payload() message: string) {
        return message;
    }

    @Handle('sensor.message/+')
    async handleMessage1(@Payload() message: string) {
        return message;
    }

    @Handle('sensor/message/+', 'mqtt')
    async handleMessage2(@Payload() message: string) {
        return message;
    }

    @Subscribe('sensor/submessage/+')
    async subMessage2(@Payload() message: string) {
        return message;
    }

    @Subscribe('sensor/:id/start', 'mqtt', {
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
        JsonEndpointModule,
        ServerEndpointModule,
        ClientModule.forClient({
            transport: 'mqtt',
            clientOpts: {
                // connectOpts: {
                //     port: 6379
                // },
                timeout: 200
            }
        }),
        EndpointsModule.forMicroservice({
            transport: 'mqtt'
        })
    ],
    declarations: [
        MqttService
    ],
    bootstrap: MqttServer
})
export class MicroTestModule {

}



describe('Mqtt Micro Service', () => {
    let ctx: ApplicationContext;
    let injector: Injector;

    let client: MqttClient;

    before(async () => {
        ctx = await Application.run(MicroTestModule, {
            providers: [
                { provide: MQTT_SERV_INTERCEPTORS, useClass: BigFileInterceptor, multi: true },
                { provide: SENSORS, useValue: 'sensor01', multi: true },
                { provide: SENSORS, useValue: 'sensor02', multi: true }
            ]
        });
        injector = ctx.injector;
        client = injector.get(MqttClient);
    });


    // it('fetch json', async () => {
    //     const res: any = await lastValueFrom(client.send('/content/510100_full.json')
    //         .pipe(
    //             catchError((err, ct) => {
    //                 ctx.getLogger().error(err);
    //                 return of(err);
    //             })));

    //     expect(res).toBeDefined();
    //     expect(isArray(res.features)).toBeTruthy();
    // })

    // it('fetch big json', async () => {
    //     const res: any = await lastValueFrom(client.send('/content/big.json', { timeout: 5000 })
    //         .pipe(
    //             catchError((err, ct) => {
    //                 ctx.getLogger().error(err);
    //                 return of(err);
    //             })));

    //     expect(res).toBeDefined();
    //     expect(isArray(res.features)).toBeTruthy();
    // })

    // it('fetch json 2', async () => {
    //     const res: any = await lastValueFrom(client.send('/content/test1/jsons/data1.json')
    //         .pipe(
    //             catchError((err, ct) => {
    //                 ctx.getLogger().error(err);
    //                 return of(err);
    //             })));

    //     expect(res).toBeDefined();
    //     expect(res.test).toEqual('ok');
    // })

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
        expect(a.statusMessage).toEqual('Timeout has occurred');
    });

    it('sensor.message/+ message', async () => {
        const a = await lastValueFrom(client.send('sensor.message/update', {
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
        expect(a.statusMessage).toEqual('Timeout has occurred');
    });

    it('sensor/message/+ message', async () => {
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

    it('sensor/submessage/+ message', async () => {
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
        expect(a.statusMessage).toEqual('Timeout has occurred');
    });



    after(() => {
        return ctx.destroy();
    })

});
