import { ApplicationContext } from '@tsdi/core';
import { UnitTestConfigure } from './UnitTestConfigure';
import { CoverageReporter } from './reports/Reporter';
export declare const UNITTESTCONFIGURE: import("@tsdi/ioc").InjectToken<UnitTestConfigure>;
export declare class UnitTestConfigureService {
    configureService(ctx: ApplicationContext): Promise<void>;
    protected configureCoverageReporters(ctx: ApplicationContext, config: UnitTestConfigure): void;
    protected isCoverageReporter(reporter: any): reporter is CoverageReporter;
}
