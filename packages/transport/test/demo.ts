import { Injectable, Module, lang, tokenId } from '@tsdi/ioc';
import { BadRequestExecption } from '@tsdi/common';
import {
    RouteMapping, Handle, RequestBody, RequestParam, RequestPath, RedirectResult,
    Middleware, AssetContext, compose, NEXT, Get, Payload
} from '@tsdi/transport';
import { of } from 'rxjs'; 


@RouteMapping('/device')
export class DeviceController {

    @Get('/')
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
        if(age1<=0){
            throw new BadRequestExecption();
        }
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
    getLastStatus(@RequestParam('redirect', { nullable: true }) redirect: string) {
        if (redirect === 'reload') {
            return new RedirectResult('/device/reload');
        }
        return of('working');
    }

    @RouteMapping('/reload', 'GET')
    redirect() {
        return 'reload';
    }

    @Handle({ cmd: 'xxx' }, 'tcp')
    async subMessage(@Payload() message: string) {
        return message;
    }

    @Handle('dd/*')
    async subMessage1(@Payload() message: string) {
        return message;
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
    route:'/hdevice'
})
export class DeviceQueue implements Middleware {

    async invoke(ctx: AssetContext, next: () => Promise<void>): Promise<void> {

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
export class DeviceStartupHandle implements Middleware {

    invoke(ctx: AssetContext, next: () => Promise<void>): Promise<void> {

        console.log('DeviceStartupHandle.', 'resp:', ctx.payload.type, 'req:', ctx.payload.body.type)
        if (ctx.payload.body.type === 'startup') {
            // todo sth.
            const ret = ctx.injector.get(MyService).dosth();
            ctx.setValue('deviceB_state', ret);
        }
        return next();
    }
}

@Injectable()
export class DeviceAStartupHandle implements Middleware {

    invoke(ctx: AssetContext, next: () => Promise<void>): Promise<void> {
        console.log('DeviceAStartupHandle.', 'resp:', ctx.payload.type, 'req:', ctx.payload.body.type)
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
