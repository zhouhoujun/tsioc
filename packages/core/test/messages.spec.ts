import { Injector, Injectable, lang, ArgumentError, MissingParameterError } from '@tsdi/ioc';
import { lastValueFrom, of } from 'rxjs';
import expect = require('expect');
import { Application, Context, RouteMapping, ApplicationContext, Handle, RequestBody, RequestParam, RequestPath, Middleware, Module, Middlewares, TransportModule } from '../src';


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

@Handle({ route: '/hdevice' })
class DeviceQueue extends Middlewares {
    override async handle(ctx: Context, next?: () => Promise<void>): Promise<void> {
        console.log('device msg start.');
        ctx.setValue('device', 'device data')
        await super.handle(ctx, async () => {
            ctx.setValue('device', 'device next');
        });
        console.log('device sub msg done.');
    }
}

@Handle({
    parent: DeviceQueue
})
class DeviceStartQueue extends Middlewares {

}

@Handle(DeviceStartQueue)
class DeviceStartupHandle extends Middleware {

    override async handle(ctx: Context, next: () => Promise<void>): Promise<void> {
        console.log('DeviceStartupHandle.', 'resp:', ctx.type, 'req:', ctx.request.type)
        if (ctx.type === 'startup') {
            // todo sth.
            let ret = ctx.injector.get(MyService).dosth();
            ctx.setValue('deviceB_state', ret);
        }
    }
}

@Handle(DeviceStartQueue)
class DeviceAStartupHandle implements Middleware {

    async handle(ctx: Context, next: () => Promise<void>): Promise<void> {
        console.log('DeviceAStartupHandle.', 'resp:', ctx.type, 'req:', ctx.request.type)
        if (ctx.type === 'startup') {
            // todo sth.
            let ret = ctx.injector.get(MyService).dosth();
            ctx.setValue('deviceA_state', ret);
        }
        return next()
    }
}

@Module({
    providers: [
        DeviceQueue,
        DeviceStartQueue
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
        TransportModule,
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
        // ctx.send('msg:://decice/init', { body: {mac: 'xxx-xx-xx-xxxx'}, query: {name:'xxx'} })
        // console.log(ctx.getMessager());
        const a = injector.get(DeviceQueue);
        const b = injector.get(DeviceQueue);
        expect(a).toBeInstanceOf(DeviceQueue);
        expect(a).toEqual(b);
    });

    it('has registered', async () => {
        const a = injector.get(DeviceQueue);
        expect(a.has(DeviceStartQueue)).toBeTruthy();
        expect(injector.get(DeviceStartQueue).has(DeviceStartupHandle)).toBeTruthy();
    });


    it('msg work', async () => {
        const a = injector.get(DeviceQueue);
        let device, aState, bState;

        const defer = lang.defer();
        ctx.send('/hdevice', { type: 'startup' })
        .subscribe((rep)=> {
            device = ctx.getValue('device');
            aState = ctx.getValue('deviceA_state');
            bState = ctx.getValue('deviceB_state');
            defer.resolve();
        });
        await defer.promise;
        expect(device).toBe('device next');
        expect(aState).toBe('startuped');
        expect(bState).toBe('startuped');
    });

    it('post route response object', async () => {
        const a = await lastValueFrom(ctx.send('/device/init', { method: 'POST', query: { name: 'test' } }));
        expect(a.status).toEqual(200);
        expect(a.ok).toBeTruthy();
        expect(a.body).toBeDefined();
        expect(a.body.name).toEqual('test');
    });

    it('post route response string', async () => {
        const b = await lastValueFrom(ctx.send('/device/update', { method: 'POST', query: { version: '1.0.0' } }));
        expect(b.status).toEqual(200);
        expect(b.ok).toBeTruthy();
        expect(b.body).toEqual('1.0.0');
    });

    it('route with request body pipe', async () => {
        const a = await lastValueFrom(ctx.send('/device/usage', { method: 'POST', body: { id: 'test1', age: '50', createAt: '2021-10-01' } }));
        a.error && console.log(a.error);
        expect(a.status).toEqual(200);
        expect(a.ok).toBeTruthy();
        expect(a.body).toBeDefined();
        expect(a.body.year).toStrictEqual(50);
        expect(a.body.createAt).toEqual(new Date('2021-10-01'));
    })

    it('route with request body pipe throw missing argument err', async () => {
        const r = await lastValueFrom(ctx.send('/device/usage', { method: 'POST', body: {} }));
        expect(r.status).toEqual(500);
        expect(r.error).toBeInstanceOf(MissingParameterError)
    })

    it('route with request body pipe throw argument err', async () => {
        const r = await lastValueFrom(ctx.send('/device/usage', { method: 'POST', body: { id: 'test1', age: 'test', createAt: '2021-10-01' } }));
        expect(r.status).toEqual(500);
        expect(r.error).toBeInstanceOf(ArgumentError)
    })

    it('route with request param pipe', async () => {
        const a = await lastValueFrom(ctx.send('/device/usege/find', { method: 'GET', query: { age: '20' } }));
        expect(a.status).toEqual(200);
        expect(a.ok).toBeTruthy();
        expect(a.body).toStrictEqual(20);
    })

    it('route with request param pipe throw missing argument err', async () => {
        const r = await lastValueFrom(ctx.send('/device/usege/find', { method: 'GET', body: { age: '50' } }));
        expect(r.status).toEqual(500);
        expect(r.error).toBeInstanceOf(MissingParameterError)
    })

    it('route with request param pipe throw argument err', async () => {
        const r = await lastValueFrom(ctx.send('/device/usege/find', { method: 'GET', query: { age: 'test' } }));
        expect(r.status).toEqual(500);
        expect(r.error).toBeInstanceOf(ArgumentError)
    })

    it('route with request param pipe', async () => {
        const a = await lastValueFrom(ctx.send('/device/30/used', { method: 'GET', query: { age: '20' } }));
        expect(a.status).toEqual(200);
        expect(a.ok).toBeTruthy();
        expect(a.body).toStrictEqual(30);
    })

    it('route with request restful param pipe throw missing argument err', async () => {
        const r = await lastValueFrom(ctx.send('/device//used', { method: 'GET', body: { age: '20' } }));
        expect(r.status).toEqual(500);
        expect(r.error).toBeInstanceOf(MissingParameterError);
    })

    it('route with request restful param pipe throw argument err', async () => {
        const r = await lastValueFrom(ctx.send('/device/age1/used', { method: 'GET', body: { age: '20' } }));
        expect(r.status).toEqual(500);
        expect(r.error).toBeInstanceOf(ArgumentError);
    })


    it('response with Observable', async () => {
        const r = await lastValueFrom(ctx.send('/device/status', { method: 'GET'}));
        expect(r.status).toEqual(200);
        expect(r.body).toEqual('working');
    })


    after(() => {
        ctx.destroy();
    })
});
