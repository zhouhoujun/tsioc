import { Injectable, Injector, Module, isArray, isString, tokenId } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { TransportErrorResponse } from '@tsdi/common';
import { ClientModule } from '@tsdi/common/client';
import { EndpointModule, Handle, Payload, RequestPath, Subscribe } from '@tsdi/endpoints';
import { UDP_SERV_INTERCEPTORS, UdpClient, UdpModule, UdpServer } from '../src';
import { ServerModule } from '@tsdi/platform-server';
import { ServerEndpointModule } from '@tsdi/platform-server/endpoints';
import { catchError, lastValueFrom, of } from 'rxjs';
import expect = require('expect');
import { BigFileInterceptor } from './BigFileInterceptor';


const SENSORS = tokenId<string[]>('SENSORS');


@Injectable()
export class UdpService {

    constructor(private client: UdpClient) {

    }


    @Handle({ cmd: 'xxx' })
    async handleMessage(@Payload() message: string) {
        return message;
    }

    @Handle('sensor.message/*')
    async handleMessage1(@Payload() message: string) {
        return message;
    }

    @Handle('sensor/message/*', 'udp')
    async handleMessage2(@Payload() message: string) {
        return message;
    }

    @Subscribe('sensor/submessage/*')
    async subMessage2(@Payload() message: string) {
        return message;
    }

    @Subscribe('sensor/:id/start', 'udp', {
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
            transport: 'udp',
            clientOpts: {
                // connectOpts: {
                //     port: 6379
                // },
                // timeout: 200
            }
        }),
        EndpointModule.register({
            microservice: true,
            transport: 'udp'
        })
    ],
    declarations: [
        UdpService
    ]
})
export class MicroTestModule {

}



describe('Udp Micro Service', () => {
    let ctx: ApplicationContext;
    let injector: Injector;

    let client: UdpClient;

    before(async () => {
        ctx = await Application.run(MicroTestModule, {
            providers: [
                { provide: UDP_SERV_INTERCEPTORS, useClass: BigFileInterceptor, multi: true },
                { provide: SENSORS, useValue: 'sensor01', multi: true },
                { provide: SENSORS, useValue: 'sensor02', multi: true },
            ]
        });
        injector = ctx.injector;
        client = injector.get(UdpClient);
    });


    it('fetch json', async () => {
        const res: any = await lastValueFrom(client.send('/content/510100_full.json')
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));


        expect(res).toBeInstanceOf(TransportErrorResponse);
        expect(res.statusMessage).toEqual('Not Found');
    })

    it('fetch big json', async () => {
        const res: any = await lastValueFrom(client.send('content/big.json')
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));


        expect(res).toBeInstanceOf(TransportErrorResponse);
        expect(res.statusMessage).toContain('Packet length 23.74mb great than max size');
    })

    it('fetch json 2', async () => {
        const res: any = await lastValueFrom(client.send('/content/test1/jsons/data1.json')
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));

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
