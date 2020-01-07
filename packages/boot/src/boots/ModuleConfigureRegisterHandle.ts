import { BootHandle } from './BootHandle';
import { BootContext } from '../BootContext';
import { ConfigureRegister } from '../annotations/ConfigureRegister';
import { ConfigureManager } from '../annotations/ConfigureManager';


export class ModuleConfigureRegisterHandle extends BootHandle {
    async execute(ctx: BootContext, next: () => Promise<void>): Promise<void> {
        let regs = ctx.getContainer().getServices(ctx.injector, { token: ConfigureRegister, target: ctx.type });
        if (regs && regs.length) {
            let config = ctx.configuration;
            if (!config) {
                let mgr = ctx.injector.resolve(ConfigureManager);
                config = await mgr.getConfig();
            }
            await Promise.all(regs.map(reg => reg.register(config, ctx)));
        }
        await next();
    }
}
