import { Singleton, isArray } from '@tsdi/ioc';
import { ConfigureRegister, ApplicationContext } from '@tsdi/boot';
import { UnitTestConfigure } from './UnitTestConfigure';
import { Assert } from './assert/assert';
import * as assert from 'assert';
import * as expect from 'expect';
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

    async register(config: UnitTestConfigure, ctx: ApplicationContext): Promise<void> {

        if (!ctx.has(Assert)) {
            ctx.setValue(Assert, assert);
        }
        if (!ctx.has(ExpectToken)) {
            ctx.setValue(ExpectToken, expect);
        }
        if (isArray(config.reporters) && config.reporters.length) {
            ctx.register(config.reporters);
        }
    }
}
