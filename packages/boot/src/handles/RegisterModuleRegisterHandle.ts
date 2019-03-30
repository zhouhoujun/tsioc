import { Singleton } from '@tsdi/ioc';
import { AnnoationHandle, AnnoationContext, Next, ModuleRegister } from '../core';

@Singleton
export class RegisterModuleRegisterHandle extends AnnoationHandle {

    async execute(ctx: AnnoationContext, next: Next): Promise<void> {
        let regs = ctx.getRaiseContainer().getServices(ModuleRegister, ctx.type);
        if (regs && regs.length) {
            await Promise.all(regs.map(reg => reg.register(ctx.annoation)));
        }
        await next();
    }
}
