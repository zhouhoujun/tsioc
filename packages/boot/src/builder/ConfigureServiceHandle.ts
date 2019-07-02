import { BootHandle } from './BootHandle';
import { BootContext } from '../BootContext';
import { StartupService } from '../annotations';

export class ConfigureServiceHandle extends BootHandle {
    async execute(ctx: BootContext, next: () => Promise<void>): Promise<void> {
        let regs = ctx.getRaiseContainer().getServices(StartupService);
        if (regs && regs.length) {
            await Promise.all(regs.map(reg => reg.configureService(ctx)));
        }
        await next();
    }
}
