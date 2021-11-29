import { Injector, lang } from '@tsdi/ioc';
import { Module, Application, StartupService, ApplicationContext, ComponentScan } from '../src';
import expect = require('expect');

@ComponentScan()
export class MyStartupService implements StartupService {
    async configureService(ctx: ApplicationContext): Promise<void> {
        let defer = lang.defer<void>();
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
export class MyStartupService1 implements StartupService {
    async configureService(ctx: ApplicationContext): Promise<void> {
        ctx.injector.setValue('MyStartup1', 'start');
    }
}


@ComponentScan({
    order: 1,
})
export class DeviceConnectionService implements StartupService {

    connention: any;
    async configureService(ctx: ApplicationContext): Promise<void> {
        let defer = lang.defer<void>();
        setTimeout(() => {
            this.connention = { name: 'device_connect' };
            console.log(this.connention);
            defer.resolve();
        }, 50);
        return defer.promise;
    }

}

@ComponentScan({
    order: 2
})
export class DeviceInitService implements StartupService {

    connid!: string;
    id = 0;
    async configureService(ctx: ApplicationContext): Promise<void> {
        console.log(ctx.services.getAll().map(i=> i.type))
        let connention = ctx.injector.get(DeviceConnectionService).connention;
        this.connid = connention.name + this.id++;
    }

}

@ComponentScan({
    order: 3
})
export class DeviceAService implements StartupService {

    data: any;
    async configureService(ctx: ApplicationContext): Promise<void> {
        let connid = ctx.injector.get(DeviceInitService).connid;
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
        const startups = ctx.services.getAll().map(r => r.type);
        expect(startups).toEqual([MyStartupService1, DeviceConnectionService, DeviceInitService, DeviceAService, MyStartupService]);
        expect(ctx.injector.get('MyStartup')).toEqual('start');
    });


    it('has configed', async () => {
        const a = injector.get(DeviceAService);
        expect(a.data.connid).toEqual('device_connect0')
    });

    after(() => {
        ctx.destroy();
    })
});
