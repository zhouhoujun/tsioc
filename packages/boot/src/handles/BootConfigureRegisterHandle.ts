import { BootHandle } from './BootHandle';
import { BootContext } from '../BootContext';
import { Singleton } from '@tsdi/ioc';
import { ConfigureRegister } from '../annotations';


@Singleton
export class BootConfigureRegisterHandle extends BootHandle {
    async execute(ctx: BootContext, next: () => Promise<void>): Promise<void> {
        let regs = ctx.getRaiseContainer().getServices(ConfigureRegister, ctx.module);
        if (regs && regs.length) {
            await Promise.all(regs.map(reg => reg.register(ctx.annoation, ctx)));
        }
        await next();
    }
}
