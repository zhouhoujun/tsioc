import { createContext, Injector, lang } from '@tsdi/ioc';
import expect = require('expect');
import { Module, Application, ConfigureService, ApplicationContext, ComponentScan } from '../src';
import { ConfiguraionManger, Settings } from './demo';

@ComponentScan()
export class MyStartupService implements ConfigureService {
    async configureService(ctx: ApplicationContext): Promise<void> {
        const defer = lang.defer<void>();
        setTimeout(() => {
            ctx.injector.setValue('MyStartup', 'start');
            defer.resolve();
        })

        return defer.promise;
    }
}

@ComponentScan({
    order: 0
})
export class MyStartupService1 implements ConfigureService {
    async configureService(ctx: ApplicationContext): Promise<void> {
        ctx.injector.setValue('MyStartup1', 'start');
    }
}


@ComponentScan({
    order: 1,
})
export class DeviceConnectionService implements ConfigureService {

    connention: any;
    async configureService(ctx: ApplicationContext): Promise<void> {
        await lang.delay(50);
        this.connention = { name: 'device_connect' };
    }

}

@ComponentScan({
    order: 2
})
export class DeviceInitService implements ConfigureService {

    connid!: string;
    id = 0;
    async configureService(ctx: ApplicationContext): Promise<void> {
        const connention = ctx.injector.get(DeviceConnectionService).connention;
        this.connid = connention.name + this.id++;
    }

}

@ComponentScan({
    order: 3
})
export class DeviceAService implements ConfigureService {

    data: any;
    async configureService(ctx: ApplicationContext): Promise<void> {
        const connid = ctx.injector.get(DeviceInitService).connid;
        this.data = { connid };
    }

}

@Module({
    providers: [
        DeviceConnectionService
    ]
})
class DeviceManageModule {

}

@Module({
    // imports:[
    //     DeviceManageModule
    // ],
    providers: [
        DeviceInitService,
        DeviceAService
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
        ConfiguraionManger,
        MyStartupService,
        MyStartupService1
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
        const a = injector.get(DeviceInitService);
        const b = injector.get(DeviceInitService);
        expect(a).toEqual(b);
    });

    it('has startup', async () => {
        const startups = ctx.runners.services.getAll().map(r => r.type);
        expect(startups).toEqual([MyStartupService1, DeviceConnectionService, DeviceInitService, DeviceAService, MyStartupService]);
        expect(ctx.injector.get('MyStartup')).toEqual('start');
    });


    it('has configed', async () => {
        const a = injector.get(DeviceAService);
        expect(a.data.connid).toEqual('device_connect0')
    });

    

    it('has bean setting', ()=> {
        const settings = ctx.get(Settings) as Record<string, any>;
        expect(settings).toBeDefined();
        expect(settings.id).toEqual(1);
        expect(settings.v).toEqual(1);
        const settings2 = ctx.get(Settings) as Record<string, any>;
        expect(settings2.id).toEqual(2);
        expect(settings2.v).toEqual(1);
    })

    it('bean provide cache in context', ()=> {
        const context = createContext(ctx);
        const settings = context.get(Settings) as Record<string, any>;
        expect(settings).toBeDefined();
        expect(settings.id).toEqual(3);
        expect(settings.v).toEqual(1);
        const settings2 = context.get(Settings) as Record<string, any>;
        expect(settings2.id).toEqual(3);
        expect(settings2.v).toEqual(1);
    })


    after(() => {
        ctx.destroy();
    })
});
