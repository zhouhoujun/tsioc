import { Application, ApplicationContext } from '@tsdi/core';
import { Injectable, Injector, Module, isArray, isString, tokenId } from '@tsdi/ioc';
import { TransportErrorResponse } from '@tsdi/common';
import { ClientModule } from '@tsdi/common/client';
import { EndpointsModule, Handle, Payload, RequestPath, Subscribe } from '@tsdi/endpoints';
import { JsonEndpointModule } from '@tsdi/endpoints/json';
import { TCP_CLIENT_OPTS, TCP_SERV_INTERCEPTORS, TcpClient, TcpServer } from '../src';
import { ServerModule } from '@tsdi/platform-server';
import { ServerEndpointModule } from '@tsdi/platform-server/endpoints';
import { LoggerModule } from '@tsdi/logger';
import { catchError, lastValueFrom, of } from 'rxjs';
import expect = require('expect');
import path = require('path');
import del = require('del');
import { BigFileInterceptor } from './BigFileInterceptor';


const SENSORS = tokenId<string[]>('SENSORS');


@Injectable()
export class TcpService {

    constructor(private client: TcpClient) {

    }


    @Handle({ cmd: 'xxx' })
    async handleMessage(@Payload() message: string) {
        return message;
    }

    @Handle('sensor/message/**', 'tcp')
    async handleMessage1(@Payload() message: string) {
        return message;
    }

    @Subscribe('sensor/:id/start', 'tcp', {
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
            transport: 'tcp',
            clientOpts: {
                connectOpts: {
                    port: 2000
                }
            }
        }),
        EndpointsModule.forMicroservice({
            transport: 'tcp',
            serverOpts: {
                // timeout: 1000,
                listenOpts: {
                    port: 2000
                }
            }
        })
    ],
    declarations: [
        TcpService
    ],
    bootstrap: TcpServer
})
export class MicroTcpTestModule {

}



describe('TCP Micro Service', () => {
    let ctx: ApplicationContext;
    let injector: Injector;

    let client: TcpClient;

    before(async () => {
        ctx = await Application.run(MicroTcpTestModule, {
            providers: [
                { provide: TCP_SERV_INTERCEPTORS, useClass: BigFileInterceptor, multi: true },
                { provide: SENSORS, useValue: 'sensor01', multi: true },
                { provide: SENSORS, useValue: 'sensor02', multi: true },
            ]
        });
        injector = ctx.injector;
        client = injector.get(TcpClient);
    });


    it('fetch json', async () => {
        const res: any = await lastValueFrom(client.send('/content/510100_full.json')
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));

        // expect(res).toBeDefined();
        // expect(isArray(res.features)).toBeTruthy();
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

        // expect(res).toBeDefined();
        // expect(isArray(res.features)).toBeTruthy();
        expect(res instanceof TransportErrorResponse).toBeDefined();
        expect(res.statusMessage.indexOf('max size')).toBeGreaterThan(0);
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

    it('sensor/message/** message', async () => {
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