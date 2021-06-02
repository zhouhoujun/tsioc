import { isArray } from '@tsdi/ioc';
import { ConfigureRegister, ApplicationContext, Configure } from '@tsdi/boot';
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
@Configure()
export class UnitTestConfigureRegister extends ConfigureRegister {

    async register(config: UnitTestConfigure, ctx: ApplicationContext): Promise<void> {
        const inj = ctx.injector;
        if (!inj.has(Assert)) {
            inj.setValue(Assert, assert);
        }
        if (!inj.has(ExpectToken)) {
            inj.setValue(ExpectToken, expect);
        }
        if (isArray(config.reporters) && config.reporters.length) {
            inj.register(config.reporters);
        }
    }
}
