import { Injector, lang } from '@tsdi/ioc';
import { Module, Application, StartupService, Boot, ApplicationContext } from '../src';
import expect = require('expect');

@Boot()
export class MyStartupService extends StartupService {
    override async configureService(ctx: ApplicationContext): Promise<void> {
        let defer = lang.defer<void>();
        setTimeout(() => {
            ctx.injector.setValue('MyStartup', 'start');
            defer.resolve();
        })

        return defer.promise;
    }
}

@Boot({
    before: 'all'
})
export class MyStartupService1 extends StartupService {
    override async configureService(ctx: ApplicationContext): Promise<void> {
        ctx.injector.setValue('MyStartup1', 'start');
    }
}


@Boot()
export class DeviceConnectionService extends StartupService {

    connention: any;
    override async configureService(ctx: ApplicationContext): Promise<void> {
        let defer = lang.defer<void>();
        setTimeout(() => {
            this.connention = { name: 'device_connect' };
            defer.resolve();
        }, 50);
        return defer.promise;
    }

}

@Boot({
    deps: [DeviceConnectionService]
})
export class DeviceInitService extends StartupService {

    connid!: string;
    id = 0;
    override async configureService(ctx: ApplicationContext): Promise<void> {
        let connention = ctx.injector.get(DeviceConnectionService).connention;
        this.connid = connention.name + this.id++;
    }

}

@Boot({
    after: DeviceInitService
})
export class DeviceAService extends StartupService {

    data: any;
    override async configureService(ctx: ApplicationContext): Promise<void> {
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
