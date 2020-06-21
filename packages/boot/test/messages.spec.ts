import { BootApplication, RootMessageQueueToken, DIModule, Message, MessageQueue, MessageContext, MessageHandle, IBootContext } from '../src';
import expect = require('expect');
import { ICoreInjector } from '@tsdi/core';

@Message('none')
class DeviceQueue extends MessageQueue {
    async execute(ctx: MessageContext, next?: () => Promise<void>): Promise<void> {
        await super.execute(ctx);
        console.log('device sub msg done.');
        ctx.setValue('device', DeviceQueue);
        return next();
    }
}

@Message({
    regIn: DeviceQueue
})
class DeviceStartQueue extends MessageQueue {

}

@Message(DeviceStartQueue)
class DeviceStartupHandle extends MessageHandle {

    async execute(ctx: MessageContext, next: () => Promise<void>): Promise<void> {
        if (ctx.event === 'startup') {
            // todo sth.
            ctx.setValue('state', 'startup');
        }
    }
}

@DIModule({
    providers: [
        DeviceStartupHandle
    ]
})
class ModuleA {

}

@DIModule({
    imports: [
        ModuleA
    ],
    providers: [
        DeviceQueue,
        DeviceStartQueue
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


    after(() => {
        ctx.destroy();
    })
});
