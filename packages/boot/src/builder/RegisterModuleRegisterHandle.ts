import { AnnoationHandle, ModuleRegister } from '../core';
import { BootContext } from '../BootContext';
import { ProcessRunRootToken } from '../annotations/RunnableConfigure';
import { isFunction } from '@tsdi/ioc';


export class RegisterModuleRegisterHandle extends AnnoationHandle {

    async execute(ctx: BootContext, next: () => Promise<void>): Promise<void> {
        if (isFunction(ctx.targetReflect.getModuleRef)) {
            let injector = ctx.injector;
            if (ctx.annoation.baseURL) {
                injector.registerValue(ProcessRunRootToken, ctx.annoation.baseURL);
            }
            let regs = ctx.getContainer().getServices({ token: ModuleRegister, target: ctx.module, injector: injector });
            if (regs && regs.length) {
                await Promise.all(regs.map(reg => reg.register(ctx.annoation)));
            }
        }
        await next();
    }
}
