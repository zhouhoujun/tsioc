import { ApplicationContext, Start } from '@tsdi/core';
import { Static } from '@tsdi/ioc';

@Static()
export class ApplicationExit {

    constructor() { }

    @Start()
    register(context: ApplicationContext): void {
        const usedsignls = context.payload.signls;
        if (!usedsignls?.length) return;

        const logger = context.getLogger();
        const cleanup = async (signal: string) => {
            try {
                usedsignls.forEach(si => process.removeListener(si, cleanup));
                logger?.info('Application', process.pid, 'close');
                await context.destroy();
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
