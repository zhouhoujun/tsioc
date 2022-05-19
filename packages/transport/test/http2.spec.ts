import { Injector, Injectable, lang, ArgumentError, MissingParameterError, tokenId, isArray } from '@tsdi/ioc';
import { catchError, lastValueFrom, Observable, of, throwError } from 'rxjs';
import {
    Application, RouteMapping, ApplicationContext, Handle, RequestBody, RequestParam, RequestPath, Module,
    TransportContext, LoggerModule, Middleware, Chain
} from '@tsdi/core';
import { ServerModule } from '@tsdi/platform-server';
import expect = require('expect');
import * as fs from 'node:fs';
import * as path from 'node:path';

import { Http, HttpClientOptions, HttpModule, HttpServer } from '../src';



@RouteMapping('/device')
class DeviceController {

    @RouteMapping('/init', 'POST')
    req(name: string) {
        console.log('DeviceController init:', name);
        return { name };
    }

    @RouteMapping('/usage', 'POST')
    age(id: string, @RequestBody('age', { pipe: 'int' }) year: number, @RequestBody({ pipe: 'date' }) createAt: Date) {
        console.log('usage:', id, year, createAt);
        return { id, year, createAt };
    }

    @RouteMapping('/usege/find', 'GET')
    agela(@RequestParam('age', { pipe: 'int' }) limit: number) {
        console.log('limit:', limit);
        return limit;
    }

    @RouteMapping('/:age/used', 'GET')
    resfulquery(@RequestPath('age', { pipe: 'int' }) age1: number) {
        console.log('age1:', age1);
        return age1;
    }


    @RouteMapping('/update', 'POST')
    async update(version: string) {
        // do smth.
        console.log('update version:', version);
        const defer = lang.defer();

        setTimeout(() => {
            defer.resolve(version);
        }, 10);

        return await defer.promise;
    }


    @RouteMapping('/status', 'GET')
    getLastStatus() {
        return of('working');
    }


    @Handle({ cmd: 'xxx' })
    async subMessage() {

    }

    @Handle(/dd./)
    async subMessage1() {

    }




}



@Handle('/hdevice')
class DeviceQueue implements Middleware {

    async invoke(ctx: TransportContext, next: () => Promise<void>): Promise<void> {

        console.log('device msg start.');
        ctx.setValue('device', 'device data')


        console.log('device msg start.');
        ctx.setValue('device', 'device data')
        await new Chain(ctx.resolve(DEVICE_MIDDLEWARES)).invoke(ctx);
        ctx.setValue('device', 'device next');

        const device = ctx.get('device');
        const deviceA_state = ctx.get('deviceA_state');
        const deviceB_state = ctx.get('deviceB_state');

        ctx.body = {
            device,
            deviceA_state,
            deviceB_state
        };

        console.log('device sub msg done.');
        return await next();
    }
}


@Injectable()
class DeviceStartupHandle implements Middleware {

    invoke(ctx: TransportContext, next: () => Promise<void>): Promise<void> {

        console.log('DeviceStartupHandle.', 'resp:', ctx.playload.type, 'req:', ctx.playload.type)
        if (ctx.playload.type === 'startup') {
            // todo sth.
            const ret = ctx.injector.get(MyService).dosth();
            ctx.setValue('deviceB_state', ret);
        }
        return next();
    }
}

@Injectable()
class DeviceAStartupHandle implements Middleware {

    invoke(ctx: TransportContext, next: () => Promise<void>): Promise<void> {
        console.log('DeviceAStartupHandle.', 'resp:', ctx.playload.type, 'req:', ctx.playload.type)
        if (ctx.playload.type === 'startup') {
            // todo sth.
            const ret = ctx.get(MyService).dosth();
            ctx.setValue('deviceA_state', ret);
        }
        return next();
    }
}

export const DEVICE_MIDDLEWARES = tokenId<Middleware[]>('DEVICE_MIDDLEWARES');

@Module({
    providers: [
        DeviceQueue,
        { provide: DEVICE_MIDDLEWARES, useClass: DeviceStartupHandle, multi: true },
        { provide: DEVICE_MIDDLEWARES, useClass: DeviceAStartupHandle, multi: true },

    ]
})
class DeviceManageModule {

}

@Injectable()
class MyService {
    dosth() {
        return 'startuped';
    }
}

@Module({
    providers: [
        MyService,
        DeviceAStartupHandle
    ]
})
class DeviceAModule {

}


const key = fs.readFileSync(path.join(__dirname, './localhost-privkey.pem'));
const cert = fs.readFileSync(path.join(__dirname, './localhost-cert.pem'));

@Module({
    imports: [
        ServerModule,
        LoggerModule,
        HttpModule.withOption({
            majorVersion: 2,
            options: {
                allowHTTP1: true,
                key,
                cert
            }
        }),
        DeviceManageModule,
        DeviceAModule
    ],
    providers: [
        // DeviceController,
        DeviceStartupHandle
    ],
    declarations: [
        DeviceController
    ],
    bootstrap: HttpServer
})
class MainApp {

}

describe('http2 server, Http', () => {
    let ctx: ApplicationContext;
    let injector: Injector;

    let client: Http;

    before(async () => {
        ctx = await Application.run(MainApp);
        injector = ctx.injector;
        client = injector.resolve(Http, {
            provide: HttpClientOptions,
            useValue: {
                key,
                cert
            }
        });
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

        const res: any = await lastValueFrom(client.get('https://geo.datav.aliyun.com/areas_v2/bound/510100_full.json'));

        expect(res).toBeDefined();
        expect(isArray(res.features)).toBeTruthy();

        const rep = await lastValueFrom(client.send<any>('/hdevice', { method: 'POST', observe: 'response', body: { type: 'startup' } }));

        const device = rep.body['device'];
        const aState = rep.body['deviceA_state'];
        const bState = rep.body['deviceB_state'];

        expect(device).toBe('device next');
        expect(aState).toBe('startuped');
        expect(bState).toBe('startuped');
    });

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
        expect(r.status).toEqual(500);
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
        expect(r.status).toEqual(500);
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
        expect(r.status).toEqual(500);
        // expect(r.error).toBeInstanceOf(ArgumentError);
    })


    it('response with Observable', async () => {
        const r = await lastValueFrom(client.get('/device/status', { observe: 'response', responseType: 'text' }));
        expect(r.status).toEqual(200);
        expect(r.body).toEqual('working');
    })


    after(() => {
        return ctx.destroy();
    })
});
