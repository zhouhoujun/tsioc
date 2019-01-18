import { ConfigureRegister, RunnableConfigure } from '@ts-ioc/bootstrap';
import { DebugLogAspect } from '@ts-ioc/logs';
import { Singleton, IContainer, isArray } from '@ts-ioc/core';
import { UnitTestConfigure } from './UnitTest';

@Singleton
export class UnitTestConfigureRegister extends ConfigureRegister<RunnableConfigure> {
    constructor() {
        super();
    }
    async register(config: UnitTestConfigure, container: IContainer): Promise<void> {
        if (config.debug) {
            container.register(DebugLogAspect);
        }
        if (isArray(config.reporters) && config.reporters.length) {
            container.use(...config.reporters);
        }
    }
}
