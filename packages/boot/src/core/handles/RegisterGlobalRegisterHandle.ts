
import { Singleton } from '@ts-ioc/ioc';
import { GlobalRegisterer } from '@ts-ioc/core';
import { AnnoationHandle, AnnoationContext } from './AnnoationHandle';
import { Next } from './Handle';

@Singleton
export class RegisterGlobalRegisterHandle extends AnnoationHandle {

    async execute(ctx: AnnoationContext, next: Next): Promise<void> {
        let container = ctx.getRaiseContainer();
        let regs = container.getServices(GlobalRegisterer);
        if (regs && regs.length) {
            regs.forEach(reg => {
                reg.register(container);
            })
        }

        await next();
    }
}
