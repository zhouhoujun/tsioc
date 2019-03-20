import { Next } from './Handle';
import { AnnoationHandle, AnnoationContext } from './AnnoationHandle';
import { Singleton } from '@ts-ioc/ioc';
import { ModuleRegister, RegScope } from '../modules';

@Singleton
export class RegisterModuleRegisterHandle extends AnnoationHandle {

    async execute(ctx: AnnoationContext, next: Next): Promise<void> {
        if (ctx.regScope === RegScope.child) {
            let regs = ctx.getModuleContainer().getServices(ModuleRegister);
            if (regs && regs.length) {
                await Promise.all(regs.map(reg => reg.register(ctx.annoation)));
            }
        }
        await next();
    }
}
