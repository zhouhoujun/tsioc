import { Singleton } from '@tsdi/ioc';
import { DebugLogAspect } from '@tsdi/logs';
import { ConfigureRegister, RunnableConfigure } from '@tsdi/boot';


@Singleton
export class WorkflowConfigureRegister extends ConfigureRegister {

    async register(config: RunnableConfigure): Promise<void> {
        if (config.debug) {
            this.container.register(DebugLogAspect);
        }
    }
}
