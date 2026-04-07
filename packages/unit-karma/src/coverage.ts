import { Token, Module, Inject } from '@tsdi/ioc';
import { SuiteDescribe, RealtimeReporter, ICaseDescribe } from '@tsdi/unit';
import { ServerModule } from '@tsdi/platform-server';
import { HrtimeFormatter } from '@tsdi/core';

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

@Module({
    imports: [
        ServerModule
    ]
})
export class CoverageReporter extends RealtimeReporter {

    constructor(@Inject() hrtime: HrtimeFormatter) {
        super();
        this.hrtime = hrtime;
    }

    private coverageData: Map<string, { lines: number; functions: number; branches: number; statements: number }> = new Map();
    private options: CoverageOptions = {};

    setOptions(options: CoverageOptions) {
        this.options = options;
    }

    override track(error: Error): void {
        console.error(error.stack || error.message);
        throw error;
    }

    override renderSuite(desc: SuiteDescribe): void {
    }

    override renderCase(desc: ICaseDescribe): void {
        if (desc.error) {
            const key = desc.key || desc.title;
            this.coverageData.set(key, {
                lines: 0,
                functions: 0,
                branches: 0,
                statements: 0
            });
        }
    }

    override async render(suites: Map<Token, SuiteDescribe>): Promise<void> {
        if (!this.options?.enabled) {
            return;
        }

        let totalCases = 0;
        let passedCases = 0;
        let failedCases = 0;

        const sus = Array.from(suites.values());
        sus.forEach(suite => {
            suite.cases.forEach(caseDesc => {
                totalCases++;
                if (caseDesc.error) {
                    failedCases++;
                } else {
                    passedCases++;
                }
            });
        });

        const coveragePercent = totalCases > 0 ? (passedCases / totalCases) * 100 : 0;

        const reporters = this.options.reporters || ['text-summary'];

        for (const reporterType of reporters) {
            await this.renderReport(reporterType, coveragePercent, totalCases, passedCases, failedCases);
        }

        if (this.options.threshold) {
            this.checkThreshold(coveragePercent);
        }
    }

    protected async renderReport(
        type: CoverageReporterType,
        coverage: number,
        total: number,
        passed: number,
        failed: number
    ): Promise<void> {
        switch (type) {
            case 'text':
                this.renderTextReport(coverage, total, passed, failed);
                break;
            case 'text-summary':
                this.renderSummaryReport(coverage, total, passed, failed);
                break;
            case 'json':
                this.renderJsonReport(coverage, total, passed, failed);
                break;
            case 'html':
                await this.renderHtmlReport(coverage, total, passed, failed);
                break;
            case 'lcov':
                this.renderLcovReport(coverage, total, passed, failed);
                break;
            case 'cobertura':
                this.renderCoberturaReport(coverage, total, passed, failed);
                break;
        }
    }

    protected renderTextReport(coverage: number, total: number, passed: number, failed: number): void {
        console.log('\nCoverage Report:');
        console.log('----------------');
        console.log(`Total test cases: ${total}`);
        console.log(`Passed: ${passed}`);
        console.log(`Failed: ${failed}`);
        console.log(`Coverage: ${coverage.toFixed(2)}%`);
        
        if (this.coverageData.size > 0) {
            console.log('\nCoverage Details:');
            this.coverageData.forEach((data, key) => {
                console.log(`  ${key}: ${JSON.stringify(data)}`);
            });
        }
    }

    protected renderSummaryReport(coverage: number, total: number, passed: number, failed: number): void {
        console.log('\nCoverage Summary:');
        console.log(`Coverage: ${coverage.toFixed(2)}% (${passed}/${total} tests passed)`);
    }

    protected renderJsonReport(coverage: number, total: number, passed: number, failed: number): void {
        const report = {
            coverage: coverage,
            total: total,
            passed: passed,
            failed: failed,
            timestamp: new Date().toISOString(),
            details: Array.from(this.coverageData.entries()).map(([key, data]) => ({ key, ...data }))
        };
        console.log('\nCoverage JSON:');
        console.log(JSON.stringify(report, null, 2));
    }

    protected async renderHtmlReport(coverage: number, total: number, passed: number, failed: number): Promise<void> {
        const outputDir = this.options?.outputDir || 'coverage';
        
        if (typeof window !== 'undefined' && window.document) {
            const coverageContainer = window.document.getElementById('coverage-report');
            if (coverageContainer) {
                coverageContainer.innerHTML = `
                    <div class="coverage-summary">
                        <h2>Coverage Report</h2>
                        <div class="coverage-percent">${coverage.toFixed(2)}%</div>
                        <div class="coverage-details">
                            <span class="total">Total: ${total}</span>
                            <span class="passed">Passed: ${passed}</span>
                            <span class="failed">Failed: ${failed}</span>
                        </div>
                    </div>
                `;
            }
        } else {
            console.log(`\nHTML coverage report would be generated in: ${outputDir}/`);
            console.log(`Coverage: ${coverage.toFixed(2)}%`);
        }
    }

    protected renderLcovReport(coverage: number, total: number, passed: number, failed: number): void {
        const outputDir = this.options?.outputDir || 'coverage';
        console.log(`\nLCOV coverage report would be generated in: ${outputDir}/lcov.info`);
        console.log(`Coverage: ${coverage.toFixed(2)}%`);
    }

    protected renderCoberturaReport(coverage: number, total: number, passed: number, failed: number): void {
        const outputDir = this.options?.outputDir || 'coverage';
        console.log(`\nCobertura XML coverage report would be generated in: ${outputDir}/cobertura.xml`);
        console.log(`Coverage: ${coverage.toFixed(2)}%`);
    }

    protected checkThreshold(coverage: number): void {
        const threshold = this.options.threshold;
        if (!threshold) return;
        
        let failedThresholds: string[] = [];

        if (threshold.lines && coverage < threshold.lines) {
            failedThresholds.push(`lines: ${coverage.toFixed(2)}% < ${threshold.lines}%`);
        }

        if (failedThresholds.length > 0) {
            console.error('\nCoverage threshold failed:');
            failedThresholds.forEach(msg => console.error(`  ${msg}`));
            process.exit(1);
        }
    }
}