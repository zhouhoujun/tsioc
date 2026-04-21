import { Token } from '@tsdi/ioc';
import { SuiteDescribe, RealtimeReporter, ICaseDescribe } from '@tsdi/unit';
import { HrtimeFormatter } from '@tsdi/core';
type SuitesInput = SuiteDescribe[] | Map<Token, SuiteDescribe>;
/**
 * KarmaReporter for browser test environment.
 * 浏览器环境测试报告器
 */
export declare class KarmaReporter extends RealtimeReporter {
    private document;
    constructor(hrtime: HrtimeFormatter, document?: Object);
    track(error: Error): void;
    renderSuite(desc: SuiteDescribe): void;
    renderCase(desc: ICaseDescribe): void;
    protected renderToDom(desc: ICaseDescribe): void;
    render(suites: SuitesInput, total?: [number, number]): Promise<void>;
    protected renderSummaryToDom(successed: number, failed: number, used: [number, number] | undefined, fails: Record<string, string[]>): void;
}
export {};
