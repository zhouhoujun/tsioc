import { AnnoationHandle, AnnoationContext, ModuleRegister, RegScope } from '../core';


export class RegisterModuleRegisterHandle extends AnnoationHandle {

    async execute(ctx: AnnoationContext, next: () => Promise<void>): Promise<void> {
        if (ctx.regScope === RegScope.child) {
            let regs = ctx.getRaiseContainer().getServices(ModuleRegister, ctx.module);
            if (regs && regs.length) {
                await Promise.all(regs.map(reg => reg.register(ctx.annoation)));
            }
        }
        await next();
    }
}
