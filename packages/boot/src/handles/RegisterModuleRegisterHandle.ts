import { Singleton } from '@tsdi/ioc';
import { AnnoationHandle, AnnoationContext, Next, ModuleRegister, RegScope } from '../core';

@Singleton
export class RegisterModuleRegisterHandle extends AnnoationHandle {

    async execute(ctx: AnnoationContext, next: Next): Promise<void> {
        if (ctx.regScope === RegScope.child) {
            let regs = ctx.getRaiseContainer().getServices(ModuleRegister, ctx.type);
            if (regs && regs.length) {
                await Promise.all(regs.map(reg => reg.register(ctx.annoation)));
            }
        }
        await next();
    }
}
