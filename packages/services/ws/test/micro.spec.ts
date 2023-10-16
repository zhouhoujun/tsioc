import { Application, ApplicationContext } from '@tsdi/core';
import { Injectable, Injector, Module, isArray, isString, tokenId } from '@tsdi/ioc';
import { LoggerModule } from '@tsdi/logger';
import { TransportErrorResponse } from '@tsdi/common';
import { ClientModule } from '@tsdi/common/client';
import { Handle, EndpointsModule, Payload, RequestPath, Session, Subscribe } from '@tsdi/endpoints';
import { JsonTransportModule } from '@tsdi/endpoints/json';
import { Bodyparser, Content, Json } from '@tsdi/endpoints/assets';
import { ServerModule } from '@tsdi/platform-server';
import { ServerEndpointModule } from '@tsdi/platform-server/endpoints';
import { catchError, lastValueFrom, of } from 'rxjs';
import expect = require('expect');
import { WS_SERV_INTERCEPTORS, WsClient, WsModule, WsServer } from '../src';
import { BigFileInterceptor } from './BigFileInterceptor';

const SENSORS = tokenId<string[]>('SENSORS');


@Injectable()
export class WsService {

    constructor() {

    }


    @Handle({ cmd: 'xxx' })
    async handleMessage(@Payload() message: string) {
        return message;
    }

    @Handle('sensor.message/*')
    async handleMessage1(@Payload() message: string) {
        return message;
    }

    @Handle('sensor/message/*', 'ws')
    async handleMessage2(@Payload() message: string) {
        return message;
    }

    @Subscribe('sensor/submessage/*')
    async subMessage2(@Payload() message: string) {
        return message;
    }

    @Subscribe('sensor/:id/start', 'ws', {
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
        JsonTransportModule,
        ServerEndpointModule,
        WsModule,
        ClientModule.register([
            {
                transport: 'ws',
                client: 'ws1',
                clientOpts: {
                    // connectOpts: {
                    //     port: 6379
                    // },
                    // timeout: 200
                }
            },
            {
                transport: 'ws',
                client: 'ws2',
                clientOpts: {
                }
            }
        ]),
        EndpointsModule.register({
            transport: 'ws',
            microservice: true
        })
    ],
    declarations: [
        WsService
    ],
    // bootstrap: WsServer
})
export class MicroTestModule {

}



describe('Ws Micro Service', () => {
    let ctx: ApplicationContext;
    let injector: Injector;

    let client: WsClient;
    let client2: WsClient;

    before(async () => {
        ctx = await Application.run(MicroTestModule, {
            providers: [
                { provide: WS_SERV_INTERCEPTORS, useClass: BigFileInterceptor, multi: true },
                { provide: SENSORS, useValue: 'sensor01', multi: true },
                { provide: SENSORS, useValue: 'sensor02', multi: true },
            ]
        });
        injector = ctx.injector;
        // client = injector.get(WsClient);
        client = injector.get('ws1');
        client2 = injector.get('ws2');
    });


    it('fetch json', async () => {
        const res: any = await lastValueFrom(client.send('/content/510100_full.json')
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));

        expect(res instanceof TransportErrorResponse).toBeDefined();
        expect(res.statusMessage).toEqual('Not Found');
    })

    it('fetch big json', async () => {
        const res: any = await lastValueFrom(client.send('content/big.json')
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));

        expect(res instanceof TransportErrorResponse).toBeDefined();
        expect(res.statusMessage.indexOf('max size')).toBeGreaterThan(0);
    })

    it('fetch json 2', async () => {
        const res: any = await lastValueFrom(client.send('/content/test1/jsons/data1.json')
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));

        expect(res instanceof TransportErrorResponse).toBeDefined();
        expect(res.statusMessage).toEqual('Not Found');
    })

    it('cmd message', async () => {
        const a = await lastValueFrom(client.send({ cmd: 'xxx' }, {
            payload: {
                message: 'ble'
            },
            responseType: 'text'
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
        expect(a.status).toEqual(404);
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
        expect(a.status).toEqual(404);
    });

    it('client2 sensor.message/+ message', async () => {
        const a = await lastValueFrom(client2.send('sensor.message/update', {
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

    it('client2 sensor/message not found', async () => {
        const a = await lastValueFrom(client2.send('sensor/message', {
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
        expect(a.status).toEqual(404);
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
        expect(a.status).toEqual(404);
    });



    after(() => {
        return ctx.destroy();
    })

});
