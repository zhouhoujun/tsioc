import { DebugLogAspect } from '@tsdi/logs';
import { Singleton, isArray } from '@tsdi/ioc';
import { ConfigureRegister } from '@tsdi/boot';
import { UnitTestConfigure } from './UnitTestConfigure';
import { Assert, ExpectToken } from './assert';
import * as assert from 'assert';
import * as expect from 'expect';
import { UnitTestContext } from './UnitTestContext';

/**
 * unit test configure register.
 *
 * @export
 * @class UnitTestConfigureRegister
 * @extends {ConfigureRegister}
 */
@Singleton
export class UnitTestConfigureRegister extends ConfigureRegister {
    constructor() {
        super();
    }
    async register(config: UnitTestConfigure, ctx: UnitTestContext): Promise<void> {
        if (config.debug) {
            ctx.injector.registerType(DebugLogAspect);
        }
        if (!ctx.injector.has(Assert)) {
            ctx.injector.set(Assert, () => assert);
        }
        if (!ctx.injector.has(ExpectToken)) {
            ctx.injector.set(ExpectToken, () => expect);
        }
        if (isArray(config.reporters) && config.reporters.length) {
            ctx.getContainer().use(ctx.injector, ...config.reporters);
        }
    }
}
