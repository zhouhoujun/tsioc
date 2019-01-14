import { IConfigureRegister, ConfigureRegisterToken, RunnableConfigure } from '@ts-ioc/bootstrap';
import { Workflow } from '@ts-ioc/activities';
import { IContainer, Refs } from '@ts-ioc/core';
import { DebugLogAspect } from '@ts-ioc/logs';


@Refs(Workflow, ConfigureRegisterToken)
export class WorkflowConfigureRegister implements IConfigureRegister<RunnableConfigure> {

    async register(config: RunnableConfigure, container: IContainer): Promise<void> {
        console.log(config);
        if (config.debug) {
            container.register(DebugLogAspect);
        }
    }
}
