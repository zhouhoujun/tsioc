import { Injector } from '@tsdi/ioc';
import { SuiteDescribe, CoverageSummary, UnitTestConfigure, CoverageReporter } from '@tsdi/unit';
import { HrtimeFormatter } from '@tsdi/core';
import * as chalk from 'chalk';
export type CoverageReporterType = 'text' | 'text-summary' | 'json' | 'html' | 'lcov' | 'cobertura';
export interface CoverageOptions {
    enabled?: boolean;
    reporters?: CoverageReporterType[];
    include?: string[];
    exclude?: string[];
    outputDir?: string;
    threshold?: {
        lines?: number;
        functions?: number;
        branches?: number;
        statements?: number;
    };
}
export declare class V8CoverageReporter extends CoverageReporter {
    private injector;
    private config;
    constructor(hrtime: HrtimeFormatter, injector: Injector, config: UnitTestConfigure);
    private coverageCollector;
    private get options();
    setOptions(options: CoverageOptions): void;
    track(error: Error): void;
    render(suites: SuiteDescribe[], total: [number, number]): Promise<void>;
    protected renderReport(type: CoverageReporterType): Promise<void>;
    protected renderTextReport(): void;
    protected renderSummaryReport(): void;
    protected pctStr(pct: number): string;
    protected formatCoverage(data: {
        total: number;
        covered: number;
        percentage: number;
    }): string;
    protected getCoverageColor(percentage: number): chalk.Chalk;
    protected getRelativePath(filePath: string): string;
    protected renderJsonReport(): void;
    protected renderHtmlReport(): Promise<void>;
    protected renderLcovReport(): void;
    protected renderCoberturaReport(): void;
    protected checkThreshold(summary: CoverageSummary): void;
}
