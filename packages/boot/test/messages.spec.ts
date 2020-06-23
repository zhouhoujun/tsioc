import { BootApplication, RootMessageQueueToken, DIModule, Message, MessageQueue, MessageContext, MessageHandle, IBootContext } from '../src';
import expect = require('expect');
import { ICoreInjector } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';

@Message('none')
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

@Message({
    parent: DeviceQueue
})
class DeviceStartQueue extends MessageQueue {

}

@Message(DeviceStartQueue)
class DeviceStartupHandle extends MessageHandle {

    async execute(ctx: MessageContext, next: () => Promise<void>): Promise<void> {
        console.log('DeviceStartupHandle.')
        if (ctx.event === 'startup') {
            // todo sth.
            let ret = ctx.injector.get(MyService).dosth();
            ctx.setValue('deviceB_state', ret);
        }
    }
}

@Message(DeviceStartQueue)
class DeviceAStartupHandle extends MessageHandle {

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
        DeviceStartupHandle
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
        const a = injector.get(DeviceQueue);
        const b = injector.get(DeviceQueue);
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
        await a.send({ event: 'startup' });
        expect(device).toBe('device data');
        expect(aState).toBe('startuped');
        expect(bState).toBe('startuped');
    });

    after(() => {
        ctx.destroy();
    })
});
