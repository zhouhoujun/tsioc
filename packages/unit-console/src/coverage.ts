import { Token, Module, Inject, Injector } from '@tsdi/ioc';
import { SuiteDescribe, RealtimeReporter, ICaseDescribe, CoverageSummary, FileCoverageData, UNITTESTCONFIGURE, UnitTestConfigure } from '@tsdi/unit';
import { ServerModule } from '@tsdi/platform-server';
import { ServerLog4Module } from '@tsdi/platform-server/log4js';
import { HrtimeFormatter } from '@tsdi/core';
import * as path from 'path';
import { V8CoverageCollector } from './V8CoverageCollector';
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

@Module({
    imports: [
        ServerModule,
        ServerLog4Module
    ],
    providers: [
        V8CoverageCollector
    ]
})
export class CoverageReporter extends RealtimeReporter {

    constructor(
        @Inject() hrtime: HrtimeFormatter, 
        @Inject() private injector: Injector,
        @Inject(UNITTESTCONFIGURE) private config: UnitTestConfigure
    ) {
        super();
        this.hrtime = hrtime;
    }

    private coverageCollector: V8CoverageCollector | null = null;

    private get options(): CoverageOptions {
        return this.config?.coverage || {};
    }

    setOptions(options: CoverageOptions) {
        if (this.config) {
            this.config.coverage = { ...this.config.coverage, ...options };
        }
    }

    override track(error: Error): void {
        console.log(chalk.red(error.stack || error.message));
        throw error;
    }

    override renderSuite(desc: SuiteDescribe): void {
    }

    override renderCase(desc: ICaseDescribe): void {
    }

    override async render(suites: Map<Token, SuiteDescribe>): Promise<void> {
        if (!this.options?.enabled) {
            return;
        }

        try {
            this.coverageCollector = this.injector.get(V8CoverageCollector);
            await this.coverageCollector.collect();
        } catch (e) {
            console.log(chalk.yellow('Warning: Could not collect coverage data'));
        }

        const reporters = this.options.reporters || ['text-summary'];

        for (const reporterType of reporters) {
            await this.renderReport(reporterType);
        }

        if (this.options.threshold && this.coverageCollector) {
            this.checkThreshold(this.coverageCollector.getSummary());
        }
    }

    protected async renderReport(type: CoverageReporterType): Promise<void> {
        switch (type) {
            case 'text':
                this.renderTextReport();
                break;
            case 'text-summary':
                this.renderSummaryReport();
                break;
            case 'json':
                this.renderJsonReport();
                break;
            case 'html':
                await this.renderHtmlReport();
                break;
            case 'lcov':
                this.renderLcovReport();
                break;
            case 'cobertura':
                this.renderCoberturaReport();
                break;
        }
    }

    protected renderTextReport(): void {
        if (!this.coverageCollector) return;

        const summary = this.coverageCollector.getSummary();
        const fileCoverages = this.coverageCollector.getAllFileCoverages();

        console.log('');
        console.log(chalk.bold('Coverage Report:'));

        console.log(chalk.gray('─'.repeat(100)));
        console.log(chalk.bold(
            'File'.padEnd(50) +
            'Statements'.padStart(12) +
            'Branches'.padStart(12) +
            'Functions'.padStart(12) +
            'Lines'.padStart(12)
        ));
        console.log(chalk.gray('─'.repeat(100)));

        fileCoverages.forEach((file, filePath) => {
            const relPath = this.getRelativePath(filePath);
            const displayName = relPath.length > 48 ? '...' + relPath.slice(-45) : relPath;

            console.log(
                displayName.padEnd(50) +
                this.formatCoverage(file.summary.statements).padStart(12) +
                this.formatCoverage(file.summary.branches).padStart(12) +
                this.formatCoverage(file.summary.functions).padStart(12) +
                this.formatCoverage(file.summary.lines).padStart(12)
            );
        });

        console.log(chalk.gray('─'.repeat(100)));
        console.log(chalk.bold(
            'All files'.padEnd(50) +
            this.formatCoverage(summary.statements).padStart(12) +
            this.formatCoverage(summary.branches).padStart(12) +
            this.formatCoverage(summary.functions).padStart(12) +
            this.formatCoverage(summary.lines).padStart(12)
        ));
        console.log('');
    }

    protected renderSummaryReport(): void {
        if (!this.coverageCollector) {
            console.log(chalk.yellow('No coverage data collected. Run with NODE_V8_COVERAGE=.nyc_output'));
            return;
        }

        const summary = this.coverageCollector.getSummary();

        console.log('');
        console.log(chalk.bold('Coverage Summary:'));

        console.log(chalk.gray('─'.repeat(50)));
        console.log(chalk.bold(
            ''.padEnd(15) +
            'Covered'.padStart(10) +
            'Total'.padStart(10) +
            'Coverage'.padStart(15)
        ));
        console.log(chalk.gray('─'.repeat(50)));

        this.renderCoverageRow('Statements', summary.statements);
        this.renderCoverageRow('Branches', summary.branches);
        this.renderCoverageRow('Functions', summary.functions);
        this.renderCoverageRow('Lines', summary.lines);

        console.log(chalk.gray('─'.repeat(50)));
        console.log('');
    }

    protected renderCoverageRow(name: string, data: { total: number; covered: number; percentage: number }): void {
        const color = this.getCoverageColor(data.percentage);
        console.log(
            name.padEnd(15) +
            chalk.green(data.covered.toString().padStart(10)) +
            data.total.toString().padStart(10) +
            color((data.percentage.toFixed(2) + '%').padStart(15))
        );
    }

    protected formatCoverage(data: { total: number; covered: number; percentage: number }): string {
        if (data.total === 0) {
            return chalk.gray('N/A');
        }
        const color = this.getCoverageColor(data.percentage);
        return color(data.percentage.toFixed(2) + '%');
    }

    protected getCoverageColor(percentage: number): chalk.Chalk {
        return percentage >= 80 ? chalk.green : percentage >= 60 ? chalk.yellow : chalk.red;
    }

    protected getRelativePath(filePath: string): string {
        const cwd = process.cwd();
        if (filePath.startsWith(cwd)) {
            return path.relative(cwd, filePath);
        }
        return filePath;
    }

    protected renderJsonReport(): void {
        if (!this.coverageCollector) return;

        const summary = this.coverageCollector.getSummary();
        const fileCoverages = this.coverageCollector.getAllFileCoverages();

        const report = {
            total: summary,
            files: Array.from(fileCoverages.entries()).map(([filePath, file]) => ({
                path: filePath,
                summary: file.summary
            })),
            timestamp: new Date().toISOString()
        };

        console.log('\n' + chalk.bold('Coverage JSON:'));
        console.log(JSON.stringify(report, null, 2));
    }

    protected async renderHtmlReport(): Promise<void> {
        if (!this.coverageCollector) return;

        const summary = this.coverageCollector.getSummary();
        const outputDir = this.options?.outputDir || 'coverage';
        console.log(`\nHTML coverage report would be generated in: ${chalk.blue(outputDir + '/')}`);
        console.log(`Lines: ${this.formatCoverage(summary.lines)}`);
        console.log(`Functions: ${this.formatCoverage(summary.functions)}`);
        console.log(`Branches: ${this.formatCoverage(summary.branches)}`);
        console.log(`Statements: ${this.formatCoverage(summary.statements)}`);
    }

    protected renderLcovReport(): void {
        if (!this.coverageCollector) return;

        const summary = this.coverageCollector.getSummary();
        const outputDir = this.options?.outputDir || 'coverage';
        console.log(`\nLCOV coverage report would be generated in: ${chalk.blue(outputDir + '/lcov.info')}`);
        console.log(`Lines: ${this.formatCoverage(summary.lines)}`);
    }

    protected renderCoberturaReport(): void {
        if (!this.coverageCollector) return;

        const summary = this.coverageCollector.getSummary();
        const outputDir = this.options?.outputDir || 'coverage';
        console.log(`\nCobertura XML coverage report would be generated in: ${chalk.blue(outputDir + '/cobertura.xml')}`);
        console.log(`Lines: ${this.formatCoverage(summary.lines)}`);
    }

    protected checkThreshold(summary: CoverageSummary): void {
        const threshold = this.options.threshold;
        if (!threshold) return;

        const failedThresholds: string[] = [];

        if (threshold.lines && summary.lines.percentage < threshold.lines) {
            failedThresholds.push(`lines: ${summary.lines.percentage.toFixed(2)}% < ${threshold.lines}%`);
        }
        if (threshold.functions && summary.functions.percentage < threshold.functions) {
            failedThresholds.push(`functions: ${summary.functions.percentage.toFixed(2)}% < ${threshold.functions}%`);
        }
        if (threshold.branches && summary.branches.percentage < threshold.branches) {
            failedThresholds.push(`branches: ${summary.branches.percentage.toFixed(2)}% < ${threshold.branches}%`);
        }
        if (threshold.statements && summary.statements.percentage < threshold.statements) {
            failedThresholds.push(`statements: ${summary.statements.percentage.toFixed(2)}% < ${threshold.statements}%`);
        }

        if (failedThresholds.length > 0) {
            console.log('\n' + chalk.red.bold('Coverage threshold failed:'));
            failedThresholds.forEach(msg => console.log(chalk.red(`  ${msg}`)));
            process.exit(1);
        }
    }
}