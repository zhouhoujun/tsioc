import { Application, MessageQueue, Context, RouteMapping, ApplicationContext, Handle, RequestBody, RequestParam, ArgumentError, RequestPath, AbstractMiddleware, Module } from '../src';
import expect = require('expect');
import { Injector, Injectable, lang, MissingParameterError } from '@tsdi/ioc';

@RouteMapping('/device')
class DeviceController {

    @RouteMapping('/init', 'post')
    req(name: string) {
        console.log('DeviceController init:', name);
        return { name };
    }

    @RouteMapping('/usage', 'post')
    age(id: string, @RequestBody('age', { pipe: 'int' }) year: number, @RequestBody({ pipe: 'date' }) createAt: Date) {
        console.log('usage:', id, year, createAt);
        return { id, year, createAt };
    }

    @RouteMapping('/usege/find', 'get')
    agela(@RequestParam('age', { pipe: 'int' }) limit: number) {
        console.log('limit:', limit);
        return limit;
    }

    @RouteMapping('/:age/used', 'get')
    resfulquery(@RequestPath('age', { pipe: 'int' }) age1: number) {
        console.log('age1:', age1);
        return age1;
    }


    @RouteMapping('/update', 'post')
    async update(version: string) {
        // do smth.
        console.log('update version:', version);
        let defer = lang.defer();

        setTimeout(() => {
            defer.resolve(version);
        }, 10);

        return await defer.promise;
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

//     @RouteMapping('/mark', 'post')
//     drawMark(name: string, @Inject(CONTEXT) ctx: MessageContext ) {
//         ctx.body;
//         this.mapAdapter.drow(ctx.body);
//     }

// }

@Handle({ route: '/hdevice' })
class DeviceQueue extends MessageQueue {
    override async execute(ctx: Context, next?: () => Promise<void>): Promise<void> {
        console.log('device msg start.');
        ctx.setValue('device', 'device data')
        await super.execute(ctx, async () => {
            ctx.setValue('device', 'device next');
        });
        console.log('device sub msg done.');
    }
}

@Handle({
    parent: DeviceQueue
})
class DeviceStartQueue extends MessageQueue {

}

@Handle(DeviceStartQueue)
class DeviceStartupHandle extends AbstractMiddleware {

    override async execute(ctx: Context, next: () => Promise<void>): Promise<void> {
        console.log('DeviceStartupHandle.', 'resp:', ctx.type, 'req:', ctx.request.type)
        if (ctx.type === 'startup') {
            // todo sth.
            let ret = ctx.injector.get(MyService).dosth();
            ctx.setValue('deviceB_state', ret);
        }
    }
}

@Handle(DeviceStartQueue)
class DeviceAStartupHandle extends AbstractMiddleware {

    override async execute(ctx: Context, next: () => Promise<void>): Promise<void> {
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
        DeviceManageModule,
        DeviceAModule
    ],
    providers: [
        DeviceController,
        DeviceStartupHandle
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
        // ctx.getMessager().send('msg:://decice/init', { body: {mac: 'xxx-xx-xx-xxxx'}, query: {name:'xxx'} })
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
        a.done(ctx => {
            device = ctx.getValue('device');
            aState = ctx.getValue('deviceA_state');
            bState = ctx.getValue('deviceB_state');
        })
        await ctx.getMessager().send('/hdevice', { type: 'startup' });
        expect(device).toBe('device next');
        expect(aState).toBe('startuped');
        expect(bState).toBe('startuped');
    });

    it('post route response object', async () => {
        const a = await ctx.getMessager().send('/device/init', { method: 'post', query: { name: 'test' } });
        expect(a.status).toEqual(200);
        expect(a.ok).toBeTruthy();
        expect(a.body).toBeDefined();
        expect(a.body.name).toEqual('test');
    });

    it('post route response string', async () => {
        const b = await ctx.getMessager().send('/device/update', { method: 'post', query: { version: '1.0.0' } });
        expect(b.status).toEqual(200);
        expect(b.ok).toBeTruthy();
        expect(b.body).toEqual('1.0.0');
    });

    it('route with request body pipe', async () => {
        const a = await ctx.getMessager().send('/device/usage', { method: 'post', body: { id: 'test1', age: '50', createAt: '2021-10-01' } });
        a.error && console.log(a.error);
        expect(a.status).toEqual(200);
        expect(a.ok).toBeTruthy();
        expect(a.body).toBeDefined();
        expect(a.body.year).toStrictEqual(50);
        expect(a.body.createAt).toEqual(new Date('2021-10-01'));
    })

    it('route with request body pipe throw missing argument err', async () => {
        const r = await ctx.getMessager().send('/device/usage', { method: 'post', body: {} });
        expect(r.status).toEqual(500);
        expect(r.error).toBeInstanceOf(MissingParameterError)
    })

    it('route with request body pipe throw argument err', async () => {
        const r = await ctx.getMessager().send('/device/usage', { method: 'post', body: { id: 'test1', age: 'test', createAt: '2021-10-01' } });
        expect(r.status).toEqual(500);
        expect(r.error).toBeInstanceOf(ArgumentError)
    })

    it('route with request param pipe', async () => {
        const a = await ctx.getMessager().send('/device/usege/find', { method: 'get', query: { age: '20' } });
        expect(a.status).toEqual(200);
        expect(a.ok).toBeTruthy();
        expect(a.body).toStrictEqual(20);
    })

    it('route with request param pipe throw missing argument err', async () => {
        const r = await ctx.getMessager().send('/device/usege/find', { method: 'get', body: { age: '50' } });
        expect(r.status).toEqual(500);
        expect(r.error).toBeInstanceOf(MissingParameterError)
    })

    it('route with request param pipe throw argument err', async () => {
        const r = await ctx.getMessager().send('/device/usege/find', { method: 'get', query: { age: 'test' } });
        expect(r.status).toEqual(500);
        expect(r.error).toBeInstanceOf(ArgumentError)
    })

    it('route with request param pipe', async () => {
        const a = await ctx.getMessager().send('/device/30/used', { method: 'get', query: { age: '20' } });
        expect(a.status).toEqual(200);
        expect(a.ok).toBeTruthy();
        expect(a.body).toStrictEqual(30);
    })

    it('route with request restful param pipe throw missing argument err', async () => {
        const r = await ctx.getMessager().send('/device//used', { method: 'get', body: { age: '20' } });
        expect(r.status).toEqual(500);
        expect(r.error).toBeInstanceOf(MissingParameterError);
    })

    it('route with request restful param pipe throw argument err', async () => {
        const r = await ctx.getMessager().send('/device/age1/used', { method: 'get', body: { age: '20' } });
        expect(r.status).toEqual(500);
        expect(r.error).toBeInstanceOf(ArgumentError);
    })




    after(() => {
        ctx.destroy();
    })
});
