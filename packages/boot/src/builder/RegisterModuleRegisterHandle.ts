import { AnnoationHandle, ModuleRegister, RegScope } from '../core';
import { BootContext, ProcessRunRootToken } from '../BootContext';


export class RegisterModuleRegisterHandle extends AnnoationHandle {

    async execute(ctx: BootContext, next: () => Promise<void>): Promise<void> {
        if (ctx.annoation && ctx.annoation.baseURL) {
            ctx.baseURL = ctx.annoation.baseURL;
        }
        if (ctx.regScope === RegScope.child) {
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
