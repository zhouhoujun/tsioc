import { Injectable, Injector, Module, isString, token } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { ErrorResponse, TransferSide, Transport, withJsonPacket } from '@tsdi/common';
import { TransportPacketModule } from '@tsdi/common/transport';
import { provideClient, withClientInterceptors, withClientTransfers } from '@tsdi/common/client';
import { Handle, Payload, provideService, RequestPath, Subscribe, withBodyparser, withInterceptors, withJson, withLogger, withRouter, withTransfers } from '@tsdi/endpoints';
import { TCP_SERV_INTERCEPTORS, TcpClient, withTcpClientTransport, withTcpTransport } from '../src';
import { ServerModule } from '@tsdi/platform-server';
import { ServerEndpointModule } from '@tsdi/platform-server/endpoints';
import { LoggerModule } from '@tsdi/logger';
import { catchError, lastValueFrom, of } from 'rxjs';
import expect = require('expect');
import path = require('path');
import { BigFileInterceptor } from './BigFileInterceptor';


const SENSORS = token<string[]>('SENSORS');


@Injectable()
export class TcpService {

    constructor(private client: TcpClient) {

    }


    @Handle({ cmd: 'xxx' })
    async handleMessage(@Payload() message: string) {
        return message;
    }

    @Handle('sensor/message/**', Transport.TCP)
    async handleMessage1(@Payload() message: string) {
        return message;
    }

    @Subscribe('sensor/:id/start', Transport.TCP, {
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
        // TransportPacketModule,
        // provideClient({
        //     transport: 'tcp',
        //     microservice: true,
        //     config: {
        //         transportOptions: {
        //             maxSize: 1024 * 1024 * 20
        //         },
        //         connectOpts: {
        //             port: 2000
        //         },
        //     }
        // }),
        // provideService({
        //     transport: 'tcp',
        //     microservice: true,
        //     config: {
        //         transportOptions: {
        //             maxSize: 1024 * 1024 * 20
        //         },
        //         // timeout: 1000,
        //         detailError: false,
        //         listenOpts: {
        //             port: 2000
        //         }
        //     }
        // })
    ],
    providers: [
        provideClient(
            withClientInterceptors(),
            withClientTransfers(
                withJsonPacket()
            ),
            withTcpClientTransport({
                microservice: true,
                connectOpts: {
                    port: 2000
                }
            })
        ),
        provideService(
            withInterceptors(BigFileInterceptor),
            withJson(),
            withBodyparser(),
            // withContent(),
            // withRouter(),
            withRouter(),
            withLogger(),
            withTransfers(
                withJsonPacket()
            ),
            withTcpTransport({
                microservice: true,
                listenOpts: {
                    port: 2000
                }
            })
        ),
    ],
    declarations: [
        TcpService
    ]
})
export class MicroTcpTestModule {

}



describe('TCP Micro Service', () => {
    let ctx: ApplicationContext;

    let client: TcpClient;

    before(async () => {
        ctx = await Application.run(MicroTcpTestModule, {
            providers: [
                { provide: TCP_SERV_INTERCEPTORS, useClass: BigFileInterceptor, multi: true },
                { provide: SENSORS, useValue: 'sensor01', multi: true },
                { provide: SENSORS, useValue: 'sensor02', multi: true },
            ]
        });
        client = ctx.get(TcpClient);
    });


    it('fetch json', async () => {
        const res: any = await lastValueFrom(client.send('/content/510100_full.json')
            .pipe(
                catchError((err, ct) => {
                    //  ctx.getLogger().error(err);
                    return of(err);
                })));

        // expect(res).toBeDefined();
        // expect(isArray(res.features)).toBeTruthy();
        expect(res instanceof ErrorResponse).toBeDefined();
        expect(res.statusMessage).toEqual('Not Found');
    })

    it('fetch big json', async () => {
        const res: any = await lastValueFrom(client.send('content/big.json')
            .pipe(
                catchError((err, ct) => {
                    //  ctx.getLogger().error(err);
                    return of(err);
                })));

        // expect(res).toBeDefined();
        // expect(isArray(res.features)).toBeTruthy();
        expect(res instanceof ErrorResponse).toBeDefined();
        expect(res.statusMessage).toContain('Packet length 23.74MB great than max size');
    })

    it('cmd message', async () => {
        const a = await lastValueFrom(client.send({ cmd: 'xxx' }, {
            payload: {
                message: 'ble'
            }
        })
            .pipe(
                catchError((err, ct) => {
                    //  ctx.getLogger().error(err);
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
                    //  ctx.getLogger().error(err);
                    return of(err);
                })));

        expect(a).toBeInstanceOf(ErrorResponse);
        // expect(a.status).toEqual(404);
        expect(a.statusText).toEqual('Not Found')
    });

    it('sensor/message/** message', async () => {
        const a = await lastValueFrom(client.send('sensor/message/update', {
            payload: {
                message: 'ble'
            }
        })
            .pipe(
                catchError((err, ct) => {
                    //  ctx.getLogger().error(err);
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
                    //  ctx.getLogger().error(err);
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
                    //  ctx.getLogger().error(err);
                    return of(err);
                })));

        expect(a).toBeInstanceOf(ErrorResponse);
        // expect(a.status).toEqual(404);        
        expect(a.statusText).toEqual('Not Found')
    });



    after(() => {
        return ctx.destroy();
    })

});
