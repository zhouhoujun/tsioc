import { AnnoationHandle, ModuleRegister, RegFor } from '../core';
import { BootContext } from '../BootContext';
import { ProcessRunRootToken } from '../annotations';


export class RegisterModuleRegisterHandle extends AnnoationHandle {

    async execute(ctx: BootContext, next: () => Promise<void>): Promise<void> {
        if (ctx.regScope === RegFor.child) {
            let container = ctx.getRaiseContainer();
            if (ctx.annoation.baseURL) {
                container.bindProvider(ProcessRunRootToken, ctx.annoation.baseURL);
            }
            let regs = container.getServices(ModuleRegister, ctx.module);
            if (regs && regs.length) {
                await Promise.all(regs.map(reg => reg.register(ctx.annoation)));
            }
        }
        await next();
    }
}
