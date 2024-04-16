import { Application, ApplicationContext } from '@tsdi/core';
import { Injector, Module, isArray } from '@tsdi/ioc';
import { LoggerModule } from '@tsdi/logger';
import { ClientModule } from '@tsdi/common/client';
import { BodyparserInterceptor, ContentInterceptor, EndpointModule, JsonInterceptor } from '@tsdi/endpoints';
import { ServerModule } from '@tsdi/platform-server';
import { ServerEndpointModule } from '@tsdi/platform-server/endpoints';
import expect = require('expect');
import { catchError, lastValueFrom, of } from 'rxjs';
import { TcpClient, TcpModule } from '@tsdi/tcp';
import { WsModule, WsClient, WsServer } from '../src';
import { DeviceController } from './controller';
import { BigFileInterceptor } from './BigFileInterceptor';
import { TransportErrorResponse } from '@tsdi/common';


@Module({
    baseURL: __dirname,
    imports: [
        ServerModule,
        LoggerModule,
        ServerEndpointModule,
        TcpModule,
        WsModule,
        ClientModule.register([
            {
                transport: 'ws'
            },
            {
                transport: 'tcp',
                clientOpts: {
                    connectOpts: {
                        port: 2000
                    }
                }
            }
        ]),
        EndpointModule.register([
            {
                transport: 'tcp',
                serverOpts: {
                    listenOpts: {
                        port: 2000
                    },
                    interceptors: [
                        BigFileInterceptor,
                        ContentInterceptor,
                        JsonInterceptor,
                        BodyparserInterceptor
                    ]
                }
            },
            {
                microservice: true,
                transport: 'ws',
                serverOpts: {
                    interceptors: [
                        BigFileInterceptor,
                        ContentInterceptor,
                        JsonInterceptor,
                        BodyparserInterceptor
                    ]
                }
            }
        ]),
    ],
    declarations: [
        DeviceController
    ]
})
export class WsTestModule {

}


describe('Ws hybrid Tcp Server & Ws Client & TcpClient', () => {
    let ctx: ApplicationContext;
    let injector: Injector;

    let client: TcpClient;
    let wsClient: WsClient

    before(async () => {
        ctx = await Application.run(WsTestModule);
        injector = ctx.injector;
        wsClient = injector.get(WsClient);
        client = injector.get(TcpClient);
    });



    it('fetch json', async () => {
        const res: any = await lastValueFrom(client.send('510100_full.json', { method: 'GET' })
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));

        expect(res).toBeDefined();
        expect(isArray(res.features)).toBeTruthy();
    })

    it('ws client fetch json', async () => {
        const res: any = await lastValueFrom(wsClient.send('content/510100_full.json')
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));

        expect(res).toBeDefined();
        expect(isArray(res.features)).toBeTruthy();
    })

    it('ws client fetch big json', async () => {
        const res: any = await lastValueFrom(wsClient.send('content/big.json')
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));

        expect(res).toBeDefined();
        expect(isArray(res.features)).toBeTruthy();
    })

    it('query all', async () => {
        const a = await lastValueFrom(client.send<any[]>('/device')
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));

        expect(isArray(a)).toBeTruthy();
        expect(a.length).toEqual(2);
        expect(a[0].name).toEqual('1');
    });

    it('query with params ', async () => {
        const a = await lastValueFrom(client.send<any[]>('/device', { params: { name: '2' } })
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));

        expect(isArray(a)).toBeTruthy();
        expect(a.length).toEqual(1);
        expect(a[0].name).toEqual('2');
    });

    it('not found', async () => {
        const a = await lastValueFrom(client.send('/device/init5', { method: 'POST', params: { name: 'test' } })
            .pipe(
                catchError(err => {
                    console.log(err);
                    return of(err)
                })
            ));
        expect(a.status).toEqual(404);
    });

    it('bad request', async () => {
        const a = await lastValueFrom(client.send('/device/-1/used', { observe: 'response', params: { age: '20' } })
            .pipe(
                catchError(err => {
                    console.log(err);
                    return of(err)
                })
            ));
        expect((a as TransportErrorResponse).statusText).toEqual('Bad Request');
    })

    it('post route response object', async () => {
        const a = await lastValueFrom(client.send<any>('/device/init', { observe: 'response', method: 'POST', params: { name: 'test' } }));
        expect(a.ok).toBeTruthy();
        expect(a.body).toBeDefined();
        expect(a.body.name).toEqual('test');
    });

    it('post route response string', async () => {
        const b = await lastValueFrom(client.send('/device/update', { observe: 'response', responseType: 'text', method: 'POST', params: { version: '1.0.0' } })
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));
        expect(b.ok).toBeTruthy();
        expect(b.body).toEqual('1.0.0');
    });

    it('route with request body pipe', async () => {
        const a = await lastValueFrom(client.send<any>('/device/usage', { observe: 'response', method: 'POST', body: { id: 'test1', age: '50', createAt: '2021-10-01' } }));
        // a.error && console.log(a.error);
        expect(a.ok).toBeTruthy();
        expect(a.body).toBeDefined();
        expect(a.body.year).toStrictEqual(50);
        expect(new Date(a.body.createAt)).toEqual(new Date('2021-10-01'));
    })

    it('route with request body pipe throw missing argument err', async () => {
        const r = await lastValueFrom(client.send('/device/usage', { observe: 'response', method: 'POST' })
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));
        expect((r as TransportErrorResponse).statusText).toEqual('Bad Request');
    })

    it('route with request body pipe throw argument err', async () => {
        const r = await lastValueFrom(client.send('/device/usage', { observe: 'response', method: 'POST', body: { id: 'test1', age: 'test', createAt: '2021-10-01' } })
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));
        expect((r as TransportErrorResponse).statusText).toEqual('Bad Request');
    })

    it('route with request param pipe', async () => {
        const a = await lastValueFrom(client.send('/device/usege/find', { observe: 'response', params: { age: '20' } }));
        expect(a.ok).toBeTruthy();
        expect(a.body).toStrictEqual(20);
    })

    it('route with request param pipe throw missing argument err', async () => {
        const r = await lastValueFrom(client.send('/device/usege/find', { observe: 'response' })
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));
        expect((r as TransportErrorResponse).statusText).toEqual('Bad Request');
    })

    it('route with request param pipe throw argument err', async () => {
        const r = await lastValueFrom(client.send('/device/usege/find', { observe: 'response', params: { age: 'test' } })
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));

        expect((r as TransportErrorResponse).statusText).toEqual('Bad Request');
    })

    it('route with request param pipe', async () => {
        const a = await lastValueFrom(client.send('/device/30/used', { observe: 'response', params: { age: '20' } }));
        expect(a.ok).toBeTruthy();
        expect(a.body).toStrictEqual(30);
    })

    it('route with request restful param pipe throw missing argument err', async () => {
        const r = await lastValueFrom(client.send('/device//used', { observe: 'response', params: { age: '20' } })
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));

        expect((r as TransportErrorResponse).statusText).toEqual('Bad Request');
    })

    it('route with request restful param pipe throw argument err', async () => {
        const r = await lastValueFrom(client.send('/device/age1/used', { observe: 'response', params: { age: '20' } })
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));

        expect((r as TransportErrorResponse).statusText).toEqual('Bad Request');
    })


    it('response with Observable', async () => {
        const r = await lastValueFrom(client.send('/device/status', { observe: 'response', responseType: 'text' })
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));
        expect(r.ok).toBeTruthy();
        expect(r.body).toEqual('working');
    })

    it('redirect', async () => {
        const result = 'reload';
        const r = await lastValueFrom(client.send('/device/status', { observe: 'response', params: { redirect: 'reload' }, responseType: 'text' }));
        expect(r.ok).toBeTruthy();
        expect(r.body).toEqual(result);
    })

    it('xxx micro message', async () => {
        const result = 'reload2';
        const r = await lastValueFrom(wsClient.send({ cmd: 'xxx' }, { observe: 'response', payload: { message: result }, responseType: 'text' }).pipe(
            catchError((err, ct) => {
                ctx.getLogger().error(err);
                return of(err);
            })));
        expect(r.ok).toBeTruthy();
        expect(r.body).toEqual(result);
    })

    it('dd micro message', async () => {
        const result = 'reload';
        const r = await lastValueFrom(wsClient.send('/dd/status', { observe: 'response', payload: { message: result }, responseType: 'text' }).pipe(
            catchError((err, ct) => {
                ctx.getLogger().error(err);
                return of(err);
            })));
        expect(r.ok).toBeTruthy();
        expect(r.body).toEqual(result);
    })

    after(() => {
        return ctx.destroy();
    })
});
