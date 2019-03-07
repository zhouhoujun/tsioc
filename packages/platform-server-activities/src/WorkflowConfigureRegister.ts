import { ConfigureRegister, RunnableConfigure } from '@ts-ioc/bootstrap';
import { Singleton } from '@ts-ioc/ioc';
import { DebugLogAspect } from '@ts-ioc/logs';


@Singleton
export class WorkflowConfigureRegister extends ConfigureRegister<RunnableConfigure> {

    async register(config: RunnableConfigure): Promise<void> {
        if (config.debug) {
            this.container.register(DebugLogAspect);
        }
    }
}
