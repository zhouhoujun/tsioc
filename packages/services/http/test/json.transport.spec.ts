import { Injector, Module, isArray } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { ClientModule } from '@tsdi/common/client';
import { EndpointModule } from '@tsdi/endpoints';
import { ServerModule } from '@tsdi/platform-server';
import { ServerEndpointModule } from '@tsdi/platform-server/endpoints';
import { WsModule } from '@tsdi/ws';

import expect = require('expect');
import { catchError, lastValueFrom, of } from 'rxjs';

import { Http, HttpModule } from '../src';
import { DeviceAModule, DeviceAStartupHandle, DeviceController, DeviceManageModule, DeviceQueue, DeviceStartupHandle, DEVICE_MIDDLEWARES } from './demo';






@Module({
    baseURL: __dirname,
    imports: [
        ServerModule,
        LoggerModule,
        ServerEndpointModule,
        HttpModule,
        WsModule,
        ClientModule.register([
            {
                transport: 'ws'
            },
            {
                transport: 'http',
                clientOpts: {
                    connectOpts: {
                        port: 3200
                    }
                }
            }
        ]),
        EndpointModule.register([
            {
                microservice: true,
                transport: 'ws',
                serverOpts: {
                    heybird: true
                }
            },
            {
                transport: 'http',
                serverOpts: {
                    majorVersion: 1,
                    middlewares: [],
                    listenOpts: {
                        port: 3200
                    }
                }
            }
        ]),
        DeviceManageModule,
        DeviceAModule
    ],
    providers: [
        DeviceStartupHandle
    ],
    declarations: [
        DeviceController
    ]
})
class MainApp {

}

describe('http server json transport, Http', () => {
    let ctx: ApplicationContext;
    let injector: Injector;

    let client: Http;

    before(async () => {
        const uri1 = new URL('redis://192.168.20.56:3200/pathname');
        const uri2 = new URL('tcp://192.168.20.56:3200/users?name=z');

        ctx = await Application.run(MainApp);
        injector = ctx.injector;
        client = injector.resolve(Http);
    });

    it('make sure singleton', async () => {
        // ctx.send('msg://decice/init', { body: {mac: 'xxx-xx-xx-xxxx'}, query: {name:'xxx'} })
        // console.log(ctx.getMessager());
        const a = injector.get(DeviceQueue);
        const b = injector.get(DeviceQueue);
        expect(a).toBeInstanceOf(DeviceQueue);
        expect(a).toEqual(b);
    });

    it('has registered', async () => {
        const a = injector.get(DEVICE_MIDDLEWARES);
        expect(a[0]).toBeInstanceOf(DeviceStartupHandle);
        expect(a[1]).toBeInstanceOf(DeviceAStartupHandle);
    });

    it('msg work', async () => {

        const res = await lastValueFrom(client.send<any>('/hdevice', { method: 'POST', observe: 'response', body: { type: 'startup' } }));

        const device = res.body['device'];
        const aState = res.body['deviceA_state'];
        const bState = res.body['deviceB_state'];

        expect(device).toBe('device next');
        expect(aState).toBe('startuped');
        expect(bState).toBe('startuped');
    });

    it('query all', async () => {
        const a = await lastValueFrom(client.get<any[]>('/device')
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
        const a = await lastValueFrom(client.get<any[]>('/device', { params: { name: '2' } })
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));

        expect(isArray(a)).toBeTruthy();
        expect(a.length).toEqual(1);
        expect(a[0].name).toEqual('2');
    });

    it('post not found', async () => {
        const a = await lastValueFrom(client.post<any>('/device/init5', null, { observe: 'response', params: { name: 'test' } })
            .pipe(
                catchError(err => {
                    console.log(err);
                    return of(err)
                })
            ));
        expect(a.status).toEqual(404);
    });

    it('get not found', async () => {
        const a = await lastValueFrom(client.get<any>('/device/init5', { observe: 'response', params: { name: 'test' } })
            .pipe(
                catchError(err => {
                    console.log(err);
                    return of(err)
                })
            ));
        expect(a.status).toEqual(404);
    });

    it('bad request', async () => {
        const a = await lastValueFrom(client.get('/device/-1/used', { observe: 'response', params: { age: '20' } })
            .pipe(
                catchError(err => {
                    console.log(err);
                    return of(err)
                })
            ));
        expect(a.status).toEqual(400);
    })

    it('post route response object', async () => {

        const a = await lastValueFrom(client.post<any>('/device/init', null, { observe: 'response', params: { name: 'test' } }));
        expect(a.status).toEqual(200);
        expect(a.ok).toBeTruthy();
        expect(a.body).toBeDefined();
        expect(a.body.name).toEqual('test');
    });

    it('post route response string', async () => {

        const b = await lastValueFrom(client.post('/device/update', null, { observe: 'response', responseType: 'text', params: { version: '1.0.0' } })
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));
        expect(b.status).toEqual(200);
        expect(b.ok).toBeTruthy();
        expect(b.body).toEqual('1.0.0');
    });

    it('route with request body pipe', async () => {
        const a = await lastValueFrom(client.post<any>('/device/usage', { id: 'test1', age: '50', createAt: '2021-10-01' }, { observe: 'response' }));
        // a.error && console.log(a.error);
        expect(a.status).toEqual(200);
        expect(a.ok).toBeTruthy();
        expect(a.body).toBeDefined();
        expect(a.body.year).toStrictEqual(50);
        expect(new Date(a.body.createAt)).toEqual(new Date('2021-10-01'));
    })

    it('route with request body pipe throw missing argument err', async () => {
        const r = await lastValueFrom(client.post('/device/usage', {}, { observe: 'response' })
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));
        expect(r.status).toEqual(400);
        // expect(r.error).toBeInstanceOf(MissingParameterError)
    })

    it('route with request body pipe throw argument err', async () => {
        const r = await lastValueFrom(client.post('/device/usage', { id: 'test1', age: 'test', createAt: '2021-10-01' }, { observe: 'response' })
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));
        expect(r.status).toEqual(400);
        // expect(r.error).toBeInstanceOf(ArgumentError)
    })

    it('route with request param pipe', async () => {
        const a = await lastValueFrom(client.get('/device/usege/find', { observe: 'response', params: { age: '20' } }));
        expect(a.status).toEqual(200);
        expect(a.ok).toBeTruthy();
        expect(a.body).toStrictEqual(20);
    })

    it('route with request param pipe throw missing argument err', async () => {
        const r = await lastValueFrom(client.get('/device/usege/find', { observe: 'response' })
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));
        expect(r.status).toEqual(400);
        // expect(r.error).toBeInstanceOf(MissingParameterError)
    })

    it('route with request param pipe throw argument err', async () => {
        const r = await lastValueFrom(client.get('/device/usege/find', { observe: 'response', params: { age: 'test' } })
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));
        expect(r.status).toEqual(400);
        // expect(r.error).toBeInstanceOf(ArgumentError)
    })

    it('route with request param pipe', async () => {
        const a = await lastValueFrom(client.get('/device/30/used', { observe: 'response', params: { age: '20' } }));
        expect(a.status).toEqual(200);
        expect(a.ok).toBeTruthy();
        expect(a.body).toStrictEqual(30);
    })

    it('route with request restful param pipe throw missing argument err', async () => {
        const r = await lastValueFrom(client.get('/device//used', { observe: 'response', params: { age: '20' } })
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));
        expect(r.status).toEqual(400);
        // expect(r.error).toBeInstanceOf(MissingParameterError);
    })

    it('route with request restful param pipe throw argument err', async () => {
        const r = await lastValueFrom(client.get('/device/age1/used', { observe: 'response', params: { age: '20' } })
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));
        expect(r.status).toEqual(400);
        // expect(r.error).toBeInstanceOf(ArgumentError);
    })


    it('response with Observable', async () => {
        const r = await lastValueFrom(client.get('/device/status', { observe: 'response', responseType: 'text' })
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));
        expect(r.status).toEqual(200);
        expect(r.body).toEqual('working');
    })

    it('redirect', async () => {
        const result = 'reload';
        const r = await lastValueFrom(client.get('/device/status', { observe: 'response', params: { redirect: 'reload' }, responseType: 'text' }).pipe(
            catchError((err, ct) => {
                ctx.getLogger().error(err);
                return of(err);
            })));
        expect(r.status).toEqual(200);
        expect(r.body).toEqual(result);
    })

    after(() => {
        return ctx?.destroy();
    })
});