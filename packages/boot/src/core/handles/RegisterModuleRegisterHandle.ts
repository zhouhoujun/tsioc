import { Next } from './Handle';
import { AnnoationHandle, AnnoationContext } from './AnnoationHandle';
import { Singleton } from '@tsdi/ioc';
import { ModuleRegister } from '../modules';

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
