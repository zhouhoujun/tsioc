import { Injectable, lang, Operator, Provider, tokenId } from '@tsdi/ioc';
import { Application, ApplicationContext, Start, Startup } from '@tsdi/core';
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
@Injectable()
export class UnitTestConfigureService {

    @Startup()
    async configureService(ctx: ApplicationContext): Promise<void> {
        const config = ctx.get(UNITTESTCONFIGURE);
        
        if (!ctx.has(Assert)) {
            ctx.setValue(Assert, assert)
        }
        if (!ctx.has(ExpectToken)) {
            ctx.setValue(ExpectToken, expect)
        }
        const reps = ctx.get(Application).loadTypes.filter(l => lang.isBaseOf(l, AbstractReporter));
        if (reps.length) {
            Operator.inject(ctx, reps.map(r => ({ provide: UNIT_REPORTES, useExisting: r, multi: true } as Provider)))
        }
        if (config.reporters && config.reporters.length) {
            Operator.inject(ctx, config.reporters.map(r => ({ provide: UNIT_REPORTES, useClass: r, multi: true } as Provider)))
        }
    }
}
