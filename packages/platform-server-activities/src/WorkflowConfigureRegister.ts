import { ConfigureRegister, RunnableConfigure } from '@ts-ioc/bootstrap';
import { IContainer, Singleton } from '@ts-ioc/core';
import { DebugLogAspect } from '@ts-ioc/logs';


@Singleton
export class WorkflowConfigureRegister extends ConfigureRegister<RunnableConfigure> {

    async register(config: RunnableConfigure, container: IContainer): Promise<void> {
        console.log(config);
        if (config.debug) {
            container.register(DebugLogAspect);
        }
    }
}
