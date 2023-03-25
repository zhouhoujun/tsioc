import { ApplicationContext, ApplicationExit } from '@tsdi/core';
import { Static } from '@tsdi/ioc';

@Static()
export class ServerApplicationExit extends ApplicationExit {

    constructor(readonly context: ApplicationContext) {
        super()
    }

    override register(): void {
        const usedsignls = this.context.payload.signls;
        if (!usedsignls?.length) return;

        const logger = this.context.getLogger();
        const cleanup = async (signal: string) => {
            try {
                usedsignls.forEach(si => process.removeListener(si, cleanup));
                await this.context.destroy();
                process.kill(process.pid, signal)
            } catch (err) {
                logger?.error(err);
                process.exit(1)
            }
        }
        usedsignls.forEach(signl => {
            process.on(signl, cleanup)
        });
    }

}
