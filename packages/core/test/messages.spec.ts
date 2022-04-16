import { Injector, Injectable, lang, ArgumentError, MissingParameterError, tokenId, chain } from '@tsdi/ioc';
import { defer, lastValueFrom, Observable, of } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';
import expect = require('expect');
import { Application, RouteMapping, ApplicationContext, Handle, RequestBody, RequestParam, RequestPath, Module, TransportContext, HttpClientModule, Middleware, HttpClient, Chain, Endpoint, HttpErrorResponse, HttpResponseBase, RequestBase, ResponseBase, ServerResponse, RouteMiddleware } from '../src';
import { TcpModule } from '@tsdi/transport';



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
        let defer = lang.defer();

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

// @RouteMapping('/map')
// class MapController {

//     @Inject() mapAdapter: MapAdapter;

//     @RouteMapping('/mark', 'POST')
//     drawMark(name: string, @Inject(CONTEXT) ctx: MessageContext ) {
//         ctx.body;
//         this.mapAdapter.drow(ctx.body);
//     }

// }

@Handle('/hdevice')
class DeviceQueue implements Middleware<RequestBase, ServerResponse> {

    intercept(req: RequestBase, next: Endpoint<RequestBase, ServerResponse>): Observable<ServerResponse> {
        const ctx = req.context;
        console.log('device msg start.');
        ctx.setValue('device', 'device data')
        return new Chain(req => {
            ctx.setValue('device', 'device next');
            return next.handle(req);
        }, ctx.resolve(DEVICE_MIDDLEWARES))
            .handle(req)
            .pipe(
                mergeMap(() => next.handle(req)),
                map(resp => {
                    const ctx = req.context;
                    const device = ctx.getValue('device');
                    const deviceA_state = ctx.getValue('deviceA_state');
                    const deviceB_state = ctx.getValue('deviceB_state');
                    resp.body = {
                        device,
                        deviceA_state,
                        deviceB_state
                    };
                    console.log('device sub msg done.');
                    return resp;
                })
            );
    }
}


@Injectable()
class DeviceStartupHandle implements Middleware<RequestBase, ServerResponse> {

    intercept(req: RequestBase, next: Endpoint<RequestBase, ServerResponse>): Observable<ServerResponse> {
        console.log('DeviceStartupHandle.', 'resp:', req.body.type, 'req:', req.body.type)
        if (req.body.type === 'startup') {
            // todo sth.
            let ret = req.context.injector.get(MyService).dosth();
            req.context.setValue('deviceB_state', ret);
        }
        return next.handle(req);
    }
}

@Injectable()
class DeviceAStartupHandle implements Middleware<RequestBase, ServerResponse> {

    intercept(req: RequestBase, next: Endpoint<RequestBase, ServerResponse>): Observable<ServerResponse> {
        console.log('DeviceAStartupHandle.', 'resp:', req.body.type, 'req:', req.body.type)
        if (req.body.type === 'startup') {
            // todo sth.
            let ret = req.context.injector.get(MyService).dosth();
            req.context.setValue('deviceA_state', ret);
        }
        return next.handle(req);
    }
}

export const DEVICE_MIDDLEWARES = tokenId<RouteMiddleware[]>('DEVICE_MIDDLEWARES');

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

@Module({
    imports: [
        TcpModule,
        HttpClientModule,
        DeviceManageModule,
        DeviceAModule
    ],
    providers: [
        // DeviceController,
        DeviceStartupHandle
    ],
    declarations: [
        DeviceController
    ]
})
class MainApp {

}

describe('app message queue', () => {
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
        // const a = injector.get(DeviceQueue);
        let device, aState, bState;

        const defer = lang.defer();
        const client = ctx.resolve(HttpClient);
        client.request<any>('POST', '/hdevice', { observe: 'response', body: { type: 'startup' } })
            .subscribe(rep => {
                device = rep.body['device'];
                aState = rep.body['deviceA_state'];
                bState = rep.body['deviceB_state'];
                defer.resolve()
            });
        await defer.promise;
        expect(device).toBe('device next');
        expect(aState).toBe('startuped');
        expect(bState).toBe('startuped');
    });

    it('post route response object', async () => {
        const a = await lastValueFrom(ctx.resolve(HttpClient).post<any>('/device/init', null, { observe: 'response', params: { name: 'test' } }));
        expect(a.status).toEqual(200);
        expect(a.ok).toBeTruthy();
        expect(a.body).toBeDefined();
        expect(a.body.name).toEqual('test');
    });

    it('post route response string', async () => {
        const b = await lastValueFrom(ctx.resolve(HttpClient).post('/device/update', null, { observe: 'response', params: { version: '1.0.0' } }));
        expect(b.status).toEqual(200);
        expect(b.ok).toBeTruthy();
        expect(b.body).toEqual('1.0.0');
    });

    it('route with request body pipe', async () => {
        const a = await lastValueFrom(ctx.resolve(HttpClient).post<any>('/device/usage', { id: 'test1', age: '50', createAt: '2021-10-01' }, { observe: 'response' }));
        // a.error && console.log(a.error);
        expect(a.status).toEqual(200);
        expect(a.ok).toBeTruthy();
        expect(a.body).toBeDefined();
        expect(a.body.year).toStrictEqual(50);
        expect(a.body.createAt).toEqual(new Date('2021-10-01'));
    })

    it('route with request body pipe throw missing argument err', async () => {
        const r = await lastValueFrom(ctx.resolve(HttpClient).post('/device/usage', {}, { observe: 'response' }));
        expect(r.status).toEqual(500);
        expect(r.error).toBeInstanceOf(MissingParameterError)
    })

    it('route with request body pipe throw argument err', async () => {
        const r = await lastValueFrom(ctx.resolve(HttpClient).post('/device/usage', { id: 'test1', age: 'test', createAt: '2021-10-01' }, { observe: 'response' }));
        expect(r.status).toEqual(500);
        expect(r.error).toBeInstanceOf(ArgumentError)
    })

    it('route with request param pipe', async () => {
        const a = await lastValueFrom(ctx.resolve(HttpClient).get('/device/usege/find', { observe: 'response', params: { age: '20' } }));
        expect(a.status).toEqual(200);
        expect(a.ok).toBeTruthy();
        expect(a.body).toStrictEqual(20);
    })

    it('route with request param pipe throw missing argument err', async () => {
        const r = await lastValueFrom(ctx.resolve(HttpClient).get('/device/usege/find', { observe: 'response', params: { age: '50' } }));
        expect(r.status).toEqual(500);
        expect(r.error).toBeInstanceOf(MissingParameterError)
    })

    it('route with request param pipe throw argument err', async () => {
        const r = await lastValueFrom(ctx.resolve(HttpClient).get('/device/usege/find', { observe: 'response', params: { age: 'test' } }));
        expect(r.status).toEqual(500);
        expect(r.error).toBeInstanceOf(ArgumentError)
    })

    it('route with request param pipe', async () => {
        const a = await lastValueFrom(ctx.resolve(HttpClient).get('/device/30/used', { observe: 'response', params: { age: '20' } }));
        expect(a.status).toEqual(200);
        expect(a.ok).toBeTruthy();
        expect(a.body).toStrictEqual(30);
    })

    it('route with request restful param pipe throw missing argument err', async () => {
        const r = await lastValueFrom(ctx.resolve(HttpClient).get('/device//used', { observe: 'response', params: { age: '20' } }));
        expect(r.status).toEqual(500);
        expect(r.error).toBeInstanceOf(MissingParameterError);
    })

    it('route with request restful param pipe throw argument err', async () => {
        const r = await lastValueFrom(ctx.resolve(HttpClient).get('/device/age1/used', { observe: 'response', params: { age: '20' } }));
        expect(r.status).toEqual(500);
        expect(r.error).toBeInstanceOf(ArgumentError);
    })


    it('response with Observable', async () => {
        const r = await lastValueFrom(ctx.resolve(HttpClient).get('/device/status', { observe: 'response' }));
        expect(r.status).toEqual(200);
        expect(r.body).toEqual('working');
    })


    after(() => {
        ctx.destroy();
    })
});
