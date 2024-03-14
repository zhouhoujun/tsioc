import { Module, isString } from '@tsdi/ioc';
import { LoggerModule } from '@tsdi/logger';
import { Application, ApplicationContext } from '@tsdi/core';
import { ClientModule } from '@tsdi/common/client';
import { EndpointModule, SetupServices } from '@tsdi/endpoints';
import { AssetTransportModule, Bodyparser, Content, Json } from '@tsdi/endpoints/assets';
import { ServerModule } from '@tsdi/platform-server';
import { ServerEndpointModule } from '@tsdi/platform-server/endpoints';
import { WsClient, WsClientOpts, WsModule } from '@tsdi/ws';
import expect = require('expect');
import { catchError, lastValueFrom, of } from 'rxjs';
import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';
import { Http, HttpModule, HttpServer } from '../src';
import { SENSORS, WsService } from './demo';
import { TransportErrorResponse } from '@tsdi/common';



const key = fs.readFileSync(path.join(__dirname, '../../../../cert/localhost-privkey.pem'));
const cert = fs.readFileSync(path.join(__dirname, '../../../../cert/localhost-cert.pem'));

@Module({
    imports: [
        ServerModule,
        LoggerModule,
        ServerEndpointModule,
        AssetTransportModule,
        HttpModule,
        WsModule,
        ClientModule.register([
            {
                transport: 'ws',
                clientOpts: {
                    url: 'wss://localhost:3200',
                    // host: 'localhost:3200',
                    connectOpts: {
                        ca: cert
                    }
                } as WsClientOpts      
            },
            {
                transport: 'http',
                clientOpts: {
                    authority: 'https://localhost:3200',
                    connectOpts: {
                        ca: cert
                    }
                }
            }
        ]),
        EndpointModule.register([
            {
                microservice: true,
                bootstrap: false,
                transport: 'ws',
                serverOpts: {
                    heybird: true,
                    interceptors:[
                        Content,
                        Json,
                        Bodyparser
                    ]
                }
            },
            {
                transport: 'http',
                bootstrap: false,
                serverOpts: {
                    middlewares: [

                    ],
                    majorVersion: 2,
                    serverOpts: {
                        allowHTTP1: true,
                        key,
                        cert
                    },
                    listenOpts: {
                        port: 3200
                    }
                }
            }
        ])
    ],

    providers: [
        { provide: SENSORS, useValue: 'sensor01', multi: true },
        { provide: SENSORS, useValue: 'sensor02', multi: true },
    ],
    declarations: [
        WsService
    ]

})
class ModuleB {

}

describe('middleware', () => {

    let ctx: ApplicationContext;
    let client: WsClient;

    before(async () => {
        ctx = await Application.run(ModuleB);
        const runable = ctx.runners.getRef(HttpServer);

        runable.getInstance().use((ctx, next) => {
            console.log('ctx.url:', ctx.url);
            if (ctx.url.startsWith('/test')) {
                console.log('message queue test: ' + ctx.query);
            }

            ctx.body = ctx.query.hi;
            console.log(ctx.body, ctx.query);
            return next();
        }, 0);

        //run services
        // await ctx.runners.run([WsServer, HttpServer]);
        //or
        await ctx.get(SetupServices).run();

        client = ctx.injector.get(WsClient);

    })

    it('use in http server.', async () => {

        const http = ctx.injector.get(Http);

        // has no parent.
        const rep = await lastValueFrom(http.get('test', { observe: 'response', responseType: 'text', params: { hi: 'hello' } })
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));
        expect(rep.body).toEqual('hello');
        expect(rep.status).toEqual(200);
    });

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

    after(async () => {
        await ctx.destroy();
    })

});

