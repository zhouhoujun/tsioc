import { Injectable, lang, InjectUtil, Provider, token, toProviders } from '@tsdi/ioc';
import { Application, ApplicationContext, Start, Startup } from '@tsdi/core';
import * as assert from 'assert';
import { UnitTestConfigure } from './UnitTestConfigure';
import { Assert } from './assert/assert';
import { ExpectToken } from './assert/expects';
import { AbstractReporter, UNIT_REPORTES, CoverageReporter } from './reports/Reporter';

const expect = require('expect');


export const UNITTESTCONFIGURE = token<UnitTestConfigure>('UNITTESTCONFIGURE');

@Injectable()
export class UnitTestConfigureService {

    @Startup()
    async configureService(ctx: ApplicationContext): Promise<void> {
        const config = ctx.get(UNITTESTCONFIGURE);

        if (!ctx.has(Assert)) {
            InjectUtil.setValue(ctx, Assert, assert)
        }
        if (!ctx.has(ExpectToken)) {
            InjectUtil.setValue(ctx, ExpectToken, expect.default || expect)
        }
        // const reps = ctx.get(Application).loadTypes.filter(l => lang.isBaseOf(l, AbstractReporter));
        // if (reps.length) {
        //     InjectUtil.inject(ctx, reps.map(r => ({ provide: UNIT_REPORTES, useExisting: r, multi: true } as Provider)))
        // }
        
        if (config.reporters && config.reporters.length) {
            InjectUtil.inject(ctx , toProviders(UNIT_REPORTES, config.reporters, true))
        }

        if (config.coverage?.enabled) {
            this.configureCoverageReporters(ctx, config);
        }
    }

    protected configureCoverageReporters(ctx: ApplicationContext, config: UnitTestConfigure): void {
        const reporters = ctx.get(UNIT_REPORTES, []);
        const coverageOptions = config.coverage || { enabled: false };
        
        for (const reporter of reporters) {
            if (this.isCoverageReporter(reporter)) {
                reporter.setOptions(coverageOptions);
            }
        }
    }

    protected isCoverageReporter(reporter: any): reporter is CoverageReporter {
        return reporter instanceof CoverageReporter
    }
}
