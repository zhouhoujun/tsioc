import { Singleton, isArray } from '@tsdi/ioc';
import { ConfigureRegister, IBootContext } from '@tsdi/boot';
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

    async register(config: UnitTestConfigure, ctx: IBootContext): Promise<void> {

        if (!ctx.root.has(Assert)) {
            ctx.root.setValue(Assert, assert);
        }
        if (!ctx.root.has(ExpectToken)) {
            ctx.root.setValue(ExpectToken, expect);
        }
        if (isArray(config.reporters) && config.reporters.length) {
            ctx.root.use(...config.reporters);
        }
    }
}
