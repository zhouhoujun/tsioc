import { isArray } from '@tsdi/ioc';
import { ApplicationContext, Configure, Boot, IStartupService } from '@tsdi/core';
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
@Boot()
export class UnitTestStartup implements IStartupService {
    
    async configureService(ctx: ApplicationContext): Promise<void> {
        const config = ctx.getConfiguration() as UnitTestConfigure;
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

    destroy(): void {

    }

}
