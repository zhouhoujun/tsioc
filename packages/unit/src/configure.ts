import { lang, ProviderType, tokenId } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import * as assert from 'assert';
import * as expect from 'expect';
import { UnitTestConfigure } from './UnitTestConfigure';
import { Assert } from './assert/assert';
import { ExpectToken } from './assert/expects';
import { AbstractReporter, UNIT_REPORTES } from './reports/Reporter';


export const UNITTESTCONFIGURE = tokenId<UnitTestConfigure>('UNITTESTCONFIGURE');
/**
 * unit test configure register.
 *
 * @export
 * @class UnitTestConfigureRegister
 * @extends {ConfigureRegister}
 */
@ComponentScan()
export class UnitTestConfigureService implements ConfigureService {

    async configureService(ctx: ApplicationContext): Promise<void> {
        const config = ctx.get(UNITTESTCONFIGURE);
        const inj = ctx.injector;
        if (!inj.has(Assert)) {
            inj.setValue(Assert, assert)
        }
        if (!inj.has(ExpectToken)) {
            inj.setValue(ExpectToken, expect)
        }
        const reps = inj.get(Application).loadTypes.filter(l => lang.isBaseOf(l, AbstractReporter));
        if (reps.length) {
            inj.inject(reps.map(r => ({ provide: UNIT_REPORTES, useExisting: r, multi: true } as ProviderType)))
        }
        if (config.reporters && config.reporters.length) {
            inj.inject(config.reporters.map(r => ({ provide: UNIT_REPORTES, useClass: r, multi: true } as ProviderType)))
        }
    }

    destroy(): void { }
}
