import { lang, ProviderType } from '@tsdi/ioc';
import { Application, ApplicationContext, Boot, Service } from '@tsdi/core';
import { UnitTestConfigure } from './UnitTestConfigure';
import { Assert } from './assert/assert';
import * as assert from 'assert';
import * as expect from 'expect';
import { ExpectToken } from './assert/expects';
import { Reporter, UNIT_REPORTES } from './reports/Reporter';

/**
 * unit test configure register.
 *
 * @export
 * @class UnitTestConfigureRegister
 * @extends {ConfigureRegister}
 */
@Boot()
export class UnitTestStartup implements Service {

    async configureService(ctx: ApplicationContext): Promise<void> {
        const config = ctx.getConfiguration() as UnitTestConfigure;
        const inj = ctx.injector;
        if (!inj.has(Assert)) {
            inj.setValue(Assert, assert);
        }
        if (!inj.has(ExpectToken)) {
            inj.setValue(ExpectToken, expect);
        }
        const reps = inj.get(Application).loadTypes.filter(l => lang.isBaseOf(l, Reporter));
        if (reps.length) {
            inj.inject(reps.map(r => ({ provide: UNIT_REPORTES, useExisting: r, multi: true } as ProviderType)))
        }
        if (config.reporters && config.reporters.length) {
            inj.inject(config.reporters.map(r => ({ provide: UNIT_REPORTES, useClass: r, multi: true } as ProviderType)));
        }
    }

    destroy(): void { }
}
