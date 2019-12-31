import { Singleton } from '@tsdi/ioc';
import { DebugLogAspect } from '@tsdi/logs';
import { ConfigureRegister, RunnableConfigure } from '@tsdi/boot';
import { ActivityContext } from '@tsdi/activities';


@Singleton
export class WorkflowConfigureRegister extends ConfigureRegister {

    async register(config: RunnableConfigure, ctx: ActivityContext): Promise<void> {
        if (config.debug) {
            ctx.injector.register(DebugLogAspect);
        }
    }
}
