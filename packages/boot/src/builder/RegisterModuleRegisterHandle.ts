import { isFunction } from '@tsdi/ioc';
import { AnnoationHandle } from './AnnoationHandle';
import { ModuleRegister } from '../modules/ModuleRegister';
import { BootContext } from '../BootContext';
import { ProcessRunRootToken } from '../annotations/RunnableConfigure';



export class RegisterModuleRegisterHandle extends AnnoationHandle {

    async execute(ctx: BootContext, next: () => Promise<void>): Promise<void> {
        if (isFunction(ctx.targetReflect.getModuleRef)) {
            let injector = ctx.injector;
            if (ctx.annoation.baseURL) {
                injector.registerValue(ProcessRunRootToken, ctx.annoation.baseURL);
            }
            let regs = ctx.getContainer().getServices(injector, { token: ModuleRegister, target: ctx.type });
            if (regs && regs.length) {
                await Promise.all(regs.map(reg => reg.register(ctx.annoation)));
            }
        }
        await next();
    }
}
