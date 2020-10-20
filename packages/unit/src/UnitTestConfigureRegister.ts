import { DebugLogAspect } from '@tsdi/logs';
import { Singleton, isArray } from '@tsdi/ioc';
import { ConfigureRegister } from '@tsdi/boot';
import { UnitTestConfigure } from './UnitTestConfigure';
import { Assert } from './assert/assert';
import * as assert from 'assert';
import * as expect from 'expect';
import { UnitTestContext } from './UnitTestContext';
import { ExpectToken } from './assert/expects';

/**
 * unit test configure register.
 *
 * @export
 * @class UnitTestConfigureRegister
 * @extends {ConfigureRegister}
 */
@Singleton()
export class UnitTestConfigureRegister extends ConfigureRegister {

    async register(config: UnitTestConfigure, ctx: UnitTestContext): Promise<void> {

        if (!ctx.injector.has(Assert)) {
            ctx.injector.setValue(Assert, assert);
        }
        if (!ctx.injector.has(ExpectToken)) {
            ctx.injector.setValue(ExpectToken, expect);
        }
        if (isArray(config.reporters) && config.reporters.length) {
            ctx.injector.use(...config.reporters);
        }
    }
}
