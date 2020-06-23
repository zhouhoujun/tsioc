import { BootApplication, DIModule, IBootContext, StartupService, Boot } from '../src';
import expect = require('expect');
import { ICoreInjector } from '@tsdi/core';
import { Singleton, PromiseUtil } from '@tsdi/ioc';

@Singleton
export class MyStartupService extends StartupService {
    async configureService(ctx: IBootContext): Promise<void> {
        let defer = PromiseUtil.defer<void>();
        setTimeout(() => {
            ctx.setValue('MyStartup', 'start');
            defer.resolve();
        })

        return defer.promise;
    }
}

@Boot({
    before: 'all'
})
export class MyStartupService1 extends StartupService {
    async configureService(ctx: IBootContext): Promise<void> {
        ctx.setValue('MyStartup1', 'start');
    }
}


@Boot()
export class DeviceConnectionService extends StartupService {

    connention: any;
    async configureService(ctx: IBootContext): Promise<void> {
        const cfg = ctx.getConfiguration();
        let defer = PromiseUtil.defer<void>();
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

    connid: string;
    id = 0;
    async configureService(ctx: IBootContext): Promise<void> {
        const cfg = ctx.getConfiguration();
        const injector = ctx.injector;
        let connention = injector.get(DeviceConnectionService).connention;
        this.connid = connention.name + this.id++;
    }

}

@Boot({
    after: DeviceInitService
})
export class DeviceAService extends StartupService {

    data: any;
    async configureService(ctx: IBootContext): Promise<void> {
        const cfg = ctx.getConfiguration();
        const injector = ctx.injector;
        let connid = injector.get(DeviceInitService).connid;
        this.data = { connid };
    }

}

@DIModule({
    providers: [
        DeviceConnectionService
    ]
})
class DeviceManageModule {

}

@DIModule({
    providers: [
        DeviceInitService,
        DeviceAService
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
        MyStartupService,
        MyStartupService1
    ]
})
class MainApp {

}

describe('app message queue', () => {
    let ctx: IBootContext;
    let injector: ICoreInjector;

    before(async () => {
        ctx = await BootApplication.run(MainApp);
        injector = ctx.injector;
    });

    it('make sure singleton', async () => {
        const a = injector.get(DeviceInitService);
        const b = injector.get(DeviceInitService);
        expect(a).toEqual(b);
    });

    it('has startup', async () => {
        const startups = ctx.getStarupTokens();
        expect(startups).toEqual([MyStartupService1, DeviceConnectionService, DeviceInitService, DeviceAService, MyStartupService]);
        expect(ctx.getValue('MyStartup')).toEqual('start');
    });


    it('has configed', async () => {
        const a = injector.get(DeviceAService);
        expect(a.data.connid).toEqual('device_connect0')
    });

    after(() => {
        ctx.destroy();
    })
});
