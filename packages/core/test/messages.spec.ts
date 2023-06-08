import { Injector, Injectable, lang, tokenId, isArray, Module } from '@tsdi/ioc';
import { catchError, lastValueFrom, of } from 'rxjs';
import { ServerModule } from '@tsdi/platform-server';
import expect = require('expect');
import * as fs from 'fs';
import * as path from 'path';
import {
    Application, RouteMapping, ApplicationContext, Handle, RequestBody, RequestParam, RequestPath,
    Middleware,
    EndpointContext,
    POST,
    GET,
    compose,
    NEXT
} from '../src';
import { LoggerModule } from '@tsdi/logs';
import { Http, HttpContext, HttpServerModule, HttpServer, HttpModule } from '@tsdi/transport-http';


@RouteMapping('/device')
class DeviceController {

    @RouteMapping('/', 'GET')
    list(@RequestParam({ nullable: true }) name: string) {
        return name ? [{ name: '1' }, { name: '2' }].filter(i => i.name === name) : [{ name: '1' }, { name: '2' }];
    }

    @RouteMapping('/init', 'POST')
    req(name: string) {
        console.log('DeviceController init:', name);
        return { name };
    }

    @RouteMapping('/usage', 'POST')
    age(@RequestBody() id: string, @RequestBody('age', { pipe: 'int' }) year: number, @RequestBody({ pipe: 'date' }) createAt: Date) {
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

    @Handle('dd*')
    async subMessage1() {

    }




}

// @RouteMapping('/map')
// class MapController {

//     @Inject() mapAdapter: MapAdapter;

//     @RouteMapping('/mark', 'POST')
//     drawMark(name: string, @Inject(CONTEXT) ctx: MessageContext ) {
//         ctx.body;
//         this.mapAdapter.drow(ctx.body);
//     }

// }

@Handle({
    route: '/hdevice'
})
class DeviceQueue implements Middleware {

    async invoke(ctx: HttpContext, next: () => Promise<void>): Promise<void> {

        console.log('device msg start.');
        ctx.setValue('device', 'device data')


        console.log('device msg start.');
        ctx.setValue('device', 'device data')
        await compose(ctx.get(DEVICE_MIDDLEWARES))(ctx, NEXT);
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

    invoke(ctx: EndpointContext, next: () => Promise<void>): Promise<void> {

        console.log('DeviceStartupHandle.', 'resp:', ctx.payload.type, 'req:', ctx.payload.type)
        if (ctx.payload.body.type === 'startup') {
            // todo sth.
            const ret = ctx.injector.get(MyService).dosth();
            ctx.setValue('deviceB_state', ret);
        }
        return next();
    }
}

@Injectable()
class DeviceAStartupHandle implements Middleware {

    invoke(ctx: EndpointContext, next: () => Promise<void>): Promise<void> {
        console.log('DeviceAStartupHandle.', 'resp:', ctx.payload.type, 'req:', ctx.payload.type)
        if (ctx.payload.body.type === 'startup') {
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
    baseURL: __dirname,
    imports: [
        ServerModule,
        LoggerModule,
        HttpModule,
        HttpServerModule.withOption({
            serverOpts: {
                majorVersion: 1,
                // allowHTTP1: true,
                // key,
                // cert
            }
        }),
        // TcpModule,
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

describe('app route mapping', () => {
    let ctx: ApplicationContext;
    let injector: Injector;

    before(async () => {
        ctx = await Application.run(MainApp);
        injector = ctx.injector;
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

        const client = ctx.resolve(Http);

        const res: any = await lastValueFrom(client.send('510100_full.json', { method: GET }));

        expect(res).toBeDefined();
        expect(isArray(res.features)).toBeTruthy();

        const rep = await lastValueFrom(client.send('/hdevice', { observe: 'response', method: POST, body: { type: 'startup' } })
            .pipe(catchError((err, cau) => {
                console.log(err);
                return of(err);
            })));

        const device = rep.body['device'];
        const aState = rep.body['deviceA_state'];
        const bState = rep.body['deviceB_state'];

        expect(device).toBe('device next');
        expect(aState).toBe('startuped');
        expect(bState).toBe('startuped');
    });

    it('query all', async () => {
        const a = await lastValueFrom(ctx.resolve(Http).get<any[]>('/device')
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
        const a = await lastValueFrom(ctx.resolve(Http).get<any[]>('/device', { params: { name: '2' } })
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));

        expect(isArray(a)).toBeTruthy();
        expect(a.length).toEqual(1);
        expect(a[0].name).toEqual('2');
    });

    it('post route response object', async () => {
        const a = await lastValueFrom(ctx.resolve(Http).send('/device/init', { observe: 'response', method: POST, params: { name: 'test' } }));
        expect(a.status).toEqual(200);
        expect(a.ok).toBeTruthy();
        expect(a.body).toBeDefined();
        expect(a.body.name).toEqual('test');
    });

    it('post route response string', async () => {
        const b = await lastValueFrom(ctx.resolve(Http).send('/device/update', { observe: 'response', method: POST, responseType: 'text', params: { version: '1.0.0' } })
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
        const a = await lastValueFrom(ctx.resolve(Http).send('/device/usage', { observe: 'response', method: POST, payload: { id: 'test1', age: '50', createAt: '2021-10-01' } })
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));
        // a.error && console.log(a.error);
        expect(a.status).toEqual(200);
        expect(a.ok).toBeTruthy();
        expect(a.body).toBeDefined();
        expect(a.body.year).toStrictEqual(50);
        expect(new Date(a.body.createAt)).toEqual(new Date('2021-10-01'));
    })

    it('route with request body pipe throw missing argument err', async () => {

        const r = await lastValueFrom(ctx.resolve(Http).send('/device/usage', { observe: 'response', method: POST, payload: {} })
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));
        expect(r.status).toEqual(400);
    })

    it('route with request body pipe throw argument err', async () => {
        const r = await lastValueFrom(ctx.resolve(Http).send('/device/usage', { observe: 'response', method: POST, payload: { id: 'test1', age: 'test', createAt: '2021-10-01' } })
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));
        expect(r.status).toEqual(400);
    })

    it('route with request param pipe', async () => {
        const a = await lastValueFrom(ctx.resolve(Http).send('/device/usege/find', { observe: 'response', method: GET, params: { age: '20' } }));
        expect(a.status).toEqual(200);
        expect(a.ok).toBeTruthy();
        expect(a.body).toStrictEqual(20);
    })

    it('route with request param pipe throw missing argument err', async () => {
        const r = await lastValueFrom(ctx.resolve(Http).send('/device/usege/find', { observe: 'response', method: GET })
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));
        expect(r.status).toEqual(400);
    })

    it('route with request param pipe throw argument err', async () => {
        const r = await lastValueFrom(ctx.resolve(Http).send('/device/usege/find', { observe: 'response', method: GET, params: { age: 'test' } })
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));
        expect(r.status).toEqual(400);
    })

    it('route with request param pipe', async () => {
        const a = await lastValueFrom(ctx.resolve(Http).send('/device/30/used', { observe: 'response', method: GET, params: { age: '20' } }));
        expect(a.status).toEqual(200);
        expect(a.ok).toBeTruthy();
        expect(a.body).toStrictEqual(30);
    })

    it('route with request restful param pipe throw missing argument err', async () => {
        const r = await lastValueFrom(ctx.resolve(Http).send('/device//used', { observe: 'response', method: GET, params: { age: '20' } })
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));
        expect(r.status).toEqual(400);
    })

    it('route with request restful param pipe throw argument err', async () => {
        const r = await lastValueFrom(ctx.resolve(Http).send('/device/age1/used', { observe: 'response', method: GET, params: { age: '20' } })
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));
        expect(r.status).toEqual(400);
    })


    it('response with Observable', async () => {
        const r = await lastValueFrom(ctx.resolve(Http).send('/device/status', { observe: 'response', method: GET, responseType: 'text' }));
        expect(r.status).toEqual(200);
        expect(r.body).toEqual('working');
    })


    after(() => {
        return ctx.close();
    })
});
