# packaged @tsdi/transport

This repo is for distribution on `npm`. The source for this module is in the
[main repo](https://github.com/zhouhoujun/tsioc).

`@tsdi/transport`： application bootstrap, via `@tsdi/core`.

old packages:
[`@ts-ioc/core`](https://www.npmjs.com/package/@ts-ioc/core) 
[`tsioc`](https://www.npmjs.com/package/tsioc)
# Install

```shell

npm install @tsdi/transport

// in browser
npm install @tsdi/platform-browser

// in server
npm install @tsdi/platform-server
```

## add extends modules


## boot
DI Module manager, application bootstrap. base on AOP.

*  `@DIModule` DIModule decorator, use to define class as DI Module.
*  `@Boot` Boot decorator, use to define class as startup service for application.
*  `@Configure` Configure decorator, define this class as configure register when bootstrap application.
*  `@Handle`  Handle decorator, for class. use to define the class as handle register in global handle queue or parent.
*  `@RouteMapping` route mapping decorator, for class. use to define this class as message route.

[mvc boot simple](https://github.com/zhouhoujun/type-mvc/tree/master/packages/simples)


### use bootstrap


```ts
import { DIModule } from '@tsdi/core';
import { BootApplication } from '@tsdi/boot';



export class TestService {
    testFiled = 'test';
    test() {
        console.log('this is test');
    }
}

@DIModule({
    imports: [
        TestService
    ],
    exports: [
        TestService
    ]
})
export class ModuleCustom {

}

@DIModule({
    imports: [
        ModuleCustom
    ],
    providers: [
        { provide: 'mark', useFactory: () => 'marked' }
    ],
    exports: [
        ModuleCustom
    ]
})
export class ModuleA {

}

@Injectable()
export class ClassSevice extends Runner {

    constructor(readonly targetRef: TargetRef) {
        super()
    }

    get instance() {
        return this.targetRef.instance;
    }

    @Inject('mark')
    mark: string;

    state: string;

    async run(): Promise<any> {
        console.log('ClassSevice running.....');
        // console.log(refs.get(ClassSevice));

        // console.log(this.container);
    }

}

@Aspect()
export class Logger {

    @Around('execution(*.run)')
    log(jp: Joinpoint) {
        console.log(jp.fullName, jp.state, 'run........');
    }

    @Around('execution(*.test)')
    logTest() {
        console.log('test........');
    }
}

@Message()
export class SubMessageQueue extends MessageQueue {

}

@DIModule({
    imports: [
        AopModule,
        LogModule,
        Logger,
        ClassSevice,
        ModuleA,
        SubMessageQueue
    ],
    bootstrap: ClassSevice
})
export class ModuleB { }


@Boot()
export class SocketService extends StartupService {

    public tcpServer: net.Server;
    private context: ApplicationContext;
    private init_times = 0;

    async configureService(ctx: ApplicationContext): Promise<void> {
        console.log('SocketService init...')
        this.context = ctx;
        const tcpServer = this.tcpServer = new net.Server();
        tcpServer.listen(8801);
        this.init_times++;
        console.log('destroyed state', this.destroyed, 'init', this.init_times);
    }

    protected destroying() {
        console.log('SocketService destroying...');
        this.tcpServer.removeAllListeners();
        this.tcpServer.close();
    }

}

@DIModule({
    providers: [
        SocketService
    ]
})
export class StatupModule { }


@DIModule({
    imports: [
        AopModule,
        LogModule,
        Logger,
        ServerBootstrapModule,
        ServerLogsModule
    ],
    providers:[
        ClassSevice,
        StatupModule,
        SubMessageQueue
    ],
    bootstrap: ClassSevice
})
export class ServerMainModule { }

export const configurtion = {
    logConfig: <LogConfigure>{
        // adapter: 'console',
        // config: {
        //     level: 'trace'
        // },
        adapter: 'log4js',
        config: {
            appenders: <any>{
                focas: {
                    type: 'dateFile',
                    pattern: '-yyyyMMdd.log',
                    filename: 'log-caches/focas',
                    backups: 3,
                    alwaysIncludePattern: true,
                    category: 'focas'
                },
                console: { type: 'console' }
            },
            categories: {
                default: {
                    appenders: ['focas', 'console'],
                    level: 'info'
                },
                focas: {
                    appenders: ['focas', 'console'],
                    level: 'info'
                }
            },
            pm2: true
        }
    }
} as Configuration;


BootApplication.run(ServerMainModule)


```


* use @Bootstrap main to boot application

```ts

@Bootstrap({
    imports: [
        KoaModule
    ],
    bootstrap: MvcServerToken
})
class MvcApi {
    constructor() {
        console.log('boot application');
    }

    static main() {
        console.log('run mvc api...');
        // use your builder
        BootApplication.run(MvcApi);
    }
}


```

### message route

```ts

import { BootApplication, DIModule, Message, MessageQueue, MessageContext, Middleware,  RouteMapping, ApplicationContext, Handle } from '../src';
import expect = require('expect');
import { Injector, Injectable, lang } from '@tsdi/ioc';

@RouteMapping('/device')
class DeviceController {

    @RouteMapping('/init', 'post')
    req(name: string) {
        return { name };
    }

    @RouteMapping('/update', 'post')
    async update(version: string) {
        // do smth.
        console.log('update version:', version);
        await lang.delay(50);
        return version;
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

@Handle('/hdevice')
class DeviceQueue extends MessageQueue {
    async execute(ctx: MessageContext, next?: () => Promise<void>): Promise<void> {
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
class DeviceStartupHandle extends Middleware {

    async execute(ctx: MessageContext, next: () => Promise<void>): Promise<void> {
        console.log('DeviceStartupHandle.')
        if (ctx.event === 'startup') {
            // todo sth.
            let ret = ctx.injector.get(MyService).dosth();
            ctx.setValue('deviceB_state', ret);
        }
    }
}

@Handle(DeviceStartQueue)
class DeviceAStartupHandle extends Middleware {

    async execute(ctx: MessageContext, next: () => Promise<void>): Promise<void> {
        console.log('DeviceAStartupHandle.')
        if (ctx.event === 'startup') {
            // todo sth.
            let ret = ctx.injector.get(MyService).dosth();
            ctx.setValue('deviceA_state', ret);
        }
        return next()
    }
}

@DIModule({
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

@DIModule({
    providers: [
        MyService,
        DeviceAStartupHandle
    ]
})
class DeviceAModule {

}

@DIModule({
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
        ctx = await BootApplication.run(MainApp);
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
        await ctx.getMessager().send('/hdevice', { event: 'startup' });
        expect(device).toBe('device next');
        expect(aState).toBe('startuped');
        expect(bState).toBe('startuped');
    });

    it('route response', async () => {
        const a = await ctx.getMessager().send('/device/init', { method: 'post', query: { name: 'test' } });
        expect(a.status).toEqual(200);
        expect(a.body).toBeDefined();
        expect(a.body.name).toEqual('test');

        const b = await ctx.getMessager().send('/device/update', { method: 'post', query: { version: '1.0.0' } });
        expect(b.status).toEqual(200);
        expect(b.body).toEqual('1.0.0');
    });

    after(() => {
        ctx.destroy();
    })
});

```


## Documentation
Documentation is available on the
* [@tsdi/ioc document](https://github.com/zhouhoujun/tsioc/tree/master/packages/ioc).
* [@tsdi/aop document](https://github.com/zhouhoujun/tsioc/tree/master/packages/aop).
* [@tsdi/core document](https://github.com/zhouhoujun/tsioc/tree/master/packages/core).
* [@tsdi/boot document](https://github.com/zhouhoujun/tsioc/tree/master/packages/boot).
* [@tsdi/components document](https://github.com/zhouhoujun/tsioc/tree/master/packages/components).
* [@tsdi/compiler document](https://github.com/zhouhoujun/tsioc/tree/master/packages/compiler).
* [@tsdi/activities document](https://github.com/zhouhoujun/tsioc/tree/master/packages/activities).
* [@tsdi/pack document](https://github.com/zhouhoujun/tsioc/tree/master/packages/pack).
* [@tsdi/typeorm-adapter document](https://github.com/zhouhoujun/tsioc/tree/master/packages/typeorm-adapter).
* [@tsdi/unit document](https://github.com/zhouhoujun/tsioc/tree/master/packages/unit).
* [@tsdi/unit-console document](https://github.com/zhouhoujun/tsioc/tree/master/packages/unit-console).
* [@tsdi/cli document](https://github.com/zhouhoujun/tsioc/tree/master/packages/cli).



### packages
[@tsdi/cli](https://www.npmjs.com/package/@tsdi/cli)
[@tsdi/ioc](https://www.npmjs.com/package/@tsdi/ioc)
[@tsdi/aop](https://www.npmjs.com/package/@tsdi/aop)
[@tsdi/core](https://www.npmjs.com/package/@tsdi/core)
[@tsdi/boot](https://www.npmjs.com/package/@tsdi/boot)
[@tsdi/components](https://www.npmjs.com/package/@tsdi/components)
[@tsdi/compiler](https://www.npmjs.com/package/@tsdi/compiler)
[@tsdi/activities](https://www.npmjs.com/package/@tsdi/activities)
[@tsdi/pack](https://www.npmjs.com/package/@tsdi/pack)
[@tsdi/typeorm-adapter](https://www.npmjs.com/package/@tsdi/typeorm-adapter)
[@tsdi/unit](https://www.npmjs.com/package/@tsdi/unit)
[@tsdi/unit-console](https://www.npmjs.com/package/@tsdi/unit-console)

## License

MIT © [Houjun](https://github.com/zhouhoujun/)