import { ConfigureRegister, RunnableConfigure } from '@ts-ioc/bootstrap';
import { DebugLogAspect } from '@ts-ioc/logs';
import { Singleton, isArray } from '@ts-ioc/core';
import { UnitTestConfigure } from './UnitTest';

/**
 * unit test configure register.
 *
 * @export
 * @class UnitTestConfigureRegister
 * @extends {ConfigureRegister<RunnableConfigure>}
 */
@Singleton
export class UnitTestConfigureRegister extends ConfigureRegister<RunnableConfigure> {
    constructor() {
        super();
    }
    async register(config: UnitTestConfigure): Promise<void> {
        if (config.debug) {
            this.container.register(DebugLogAspect);
        }
        if (isArray(config.reporters) && config.reporters.length) {
            this.container.use(...config.reporters);
        }
    }
}
