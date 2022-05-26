import { Injectable, lang, tokenId } from '@tsdi/ioc';
import { of } from 'rxjs'; import {
    RouteMapping, Handle, RequestBody, RequestParam, RequestPath, Module,
    TransportContext, Middleware, Chain
} from '@tsdi/core';


@RouteMapping('/device')
export class DeviceController {

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
export class DeviceQueue implements Middleware {

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
export class DeviceStartupHandle implements Middleware {

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
export class DeviceAStartupHandle implements Middleware {

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
export class DeviceManageModule {

}

@Injectable()
export class MyService {
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
export class DeviceAModule {

}
