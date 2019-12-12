import { AnnoationHandle, ModuleRegister } from '../core';
import { BootContext } from '../BootContext';
import { ProcessRunRootToken } from '../annotations/RunnableConfigure';


export class RegisterModuleRegisterHandle extends AnnoationHandle {

    async execute(ctx: BootContext, next: () => Promise<void>): Promise<void> {
        if (ctx.regFor === RegFor.child) {
            let container = ctx.getContainer();
            if (ctx.annoation.baseURL) {
                container.bindProvider(ProcessRunRootToken, ctx.annoation.baseURL);
            }
            let regs = container.getServices({ token: ModuleRegister, target: ctx.module });
            if (regs && regs.length) {
                await Promise.all(regs.map(reg => reg.register(ctx.annoation)));
            }
        }
        await next();
    }
}
