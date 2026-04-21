import { Token } from '@tsdi/ioc';
import { TestReport, SuiteDescribe, ICaseDescribe } from './interface';
import { Reporter, RealtimeReporter } from './Reporter';
import { ApplicationContext, HrtimeFormatter } from '@tsdi/core';
/**
 * default test report. implements {@link TestReport}
 *
 * @export
 * @class DefaultTestReport
 * @implements {TestReport}
 */
export declare class DefaultTestReport implements TestReport {
    private ctx;
    protected hrtime: HrtimeFormatter;
    suites: Map<Token, SuiteDescribe>;
    reports: Reporter[];
    getReports(): Reporter[];
    relRreports: RealtimeReporter[];
    getRealtimeReports(): RealtimeReporter[];
    constructor(ctx: ApplicationContext, hrtime: HrtimeFormatter);
    track(error: Error): void;
    addSuite(suit: Token, describe: SuiteDescribe): void;
    getSuite(suit: Token): SuiteDescribe;
    setSuiteCompleted(suit: Token): void;
    addCase(suit: Token, testCase: ICaseDescribe): void;
    getCase(suit: Token, test: string): ICaseDescribe;
    setCaseCompleted(testCase: ICaseDescribe): void;
    report(): Promise<void>;
}
