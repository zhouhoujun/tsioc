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

export interface IstanbulCoverage {
    path: string;
    s: { [key: string]: number };
    b: { [key: string]: number[] };
    f: { [key: string]: number };
    fnMap: { [key: string]: { name: string; line: number; loc: { start: { line: number; column: number }; end: { line: number; column: number } } } };
    statementMap: { [key: string]: { start: { line: number; column: number }; end: { line: number; column: number } } };
    branchMap: { [key: string]: { loc: { start: { line: number; column: number }; end: { line: number; column: number } }; type: string; locations: { start: { line: number; column: number }; end: { line: number; column: number } }[] } };
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

    private options: CoverageOptions = {};
    private coverageData: IstanbulCoverage[] = [];

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
    }

    collectCoverage(): void {
        if (typeof window !== 'undefined' && (window as any).__coverage__) {
            const cov = (window as any).__coverage__;
            this.coverageData = Object.values(cov);
        }
    }

    override async render(suites: Map<Token, SuiteDescribe>): Promise<void> {
        this.collectCoverage();

        if (!this.options?.enabled) {
            return;
        }

        if (this.coverageData.length === 0) {
            console.log('\nWarning: No coverage data collected. Make sure karma-coverage is configured.');
            return;
        }

        const summary = this.calculateSummary();

        const reporters = this.options.reporters || ['text-summary'];

        for (const reporterType of reporters) {
            await this.renderReport(reporterType, summary);
        }

        if (this.options.threshold) {
            this.checkThreshold(summary);
        }
    }

    protected calculateSummary(): { lines: CoverageStat; statements: CoverageStat; functions: CoverageStat; branches: CoverageStat } {
        let totalLines = 0, coveredLines = 0;
        let totalStatements = 0, coveredStatements = 0;
        let totalFunctions = 0, coveredFunctions = 0;
        let totalBranches = 0, coveredBranches = 0;

        for (const cov of this.coverageData) {
            const statementLines = new Set<number>();
            for (const [key, count] of Object.entries(cov.statementMap)) {
                if (cov.s[key] > 0) {
                    statementLines.add(count.start.line);
                }
                totalStatements++;
                if (cov.s[key] > 0) coveredStatements++;
            }

            for (const [key, func] of Object.entries(cov.fnMap)) {
                if (cov.f[key] > 0) {
                    coveredFunctions++;
                }
                totalFunctions++;
            }

            for (const [key, branches] of Object.entries(cov.branchMap)) {
                const branchCounts = cov.b[key] || [];
                for (let i = 0; i < branches.locations.length; i++) {
                    totalBranches++;
                    if (branchCounts[i] > 0) coveredBranches++;
                }
            }

            for (const [key, count] of Object.entries(cov.statementMap)) {
                totalLines++;
                if (count.start.line === count.end.line) {
                    if (cov.s[key] > 0) coveredLines++;
                } else {
                    if (cov.s[key] > 0) coveredLines++;
                }
            }
        }

        return {
            lines: { total: totalLines, covered: coveredLines, pct: totalLines > 0 ? (coveredLines / totalLines) * 100 : 100 },
            statements: { total: totalStatements, covered: coveredStatements, pct: totalStatements > 0 ? (coveredStatements / totalStatements) * 100 : 100 },
            functions: { total: totalFunctions, covered: coveredFunctions, pct: totalFunctions > 0 ? (coveredFunctions / totalFunctions) * 100 : 100 },
            branches: { total: totalBranches, covered: coveredBranches, pct: totalBranches > 0 ? (coveredBranches / totalBranches) * 100 : 100 }
        };
    }

    protected async renderReport(
        type: CoverageReporterType,
        summary: { lines: CoverageStat; statements: CoverageStat; functions: CoverageStat; branches: CoverageStat }
    ): Promise<void> {
        switch (type) {
            case 'text':
                this.renderTextReport(summary);
                break;
            case 'text-summary':
                this.renderSummaryReport(summary);
                break;
            case 'json':
                this.renderJsonReport(summary);
                break;
            case 'html':
                await this.renderHtmlReport(summary);
                break;
            case 'lcov':
                this.renderLcovReport(summary);
                break;
            case 'cobertura':
                this.renderCoberturaReport(summary);
                break;
        }
    }

    protected renderTextReport(summary: CoverageSummary): void {
        console.log('\nCoverage Report:');
        console.log('───────────────────────────────────────────────────');
        console.log('              Covered     Total       Coverage');
        console.log('───────────────────────────────────────────────────');
        console.log(`Statements    ${String(summary.statements.covered).padStart(8)} ${String(summary.statements.total).padStart(8)} ${summary.statements.pct.toFixed(2)}%`);
        console.log(`Branches      ${String(summary.branches.covered).padStart(8)} ${String(summary.branches.total).padStart(8)} ${summary.branches.pct.toFixed(2)}%`);
        console.log(`Functions     ${String(summary.functions.covered).padStart(8)} ${String(summary.functions.total).padStart(8)} ${summary.functions.pct.toFixed(2)}%`);
        console.log(`Lines        ${String(summary.lines.covered).padStart(8)} ${String(summary.lines.total).padStart(8)} ${summary.lines.pct.toFixed(2)}%`);
        console.log('───────────────────────────────────────────────────');
    }

    protected renderSummaryReport(summary: CoverageSummary): void {
        console.log('\nCoverage Summary:');
        console.log('───────────────────────────────────────────────────');
        console.log('              Covered     Total       Coverage');
        console.log('───────────────────────────────────────────────────');
        console.log(`Statements    ${String(summary.statements.covered).padStart(8)} ${String(summary.statements.total).padStart(8)} ${summary.statements.pct.toFixed(2)}%`);
        console.log(`Branches      ${String(summary.branches.covered).padStart(8)} ${String(summary.branches.total).padStart(8)} ${summary.branches.pct.toFixed(2)}%`);
        console.log(`Functions     ${String(summary.functions.covered).padStart(8)} ${String(summary.functions.total).padStart(8)} ${summary.functions.pct.toFixed(2)}%`);
        console.log(`Lines        ${String(summary.lines.covered).padStart(8)} ${String(summary.lines.total).padStart(8)} ${summary.lines.pct.toFixed(2)}%`);
        console.log('───────────────────────────────────────────────────');
    }

    protected renderJsonReport(summary: CoverageSummary): void {
        const report = {
            timestamp: new Date().toISOString(),
            coverage: {
                statements: summary.statements,
                branches: summary.branches,
                functions: summary.functions,
                lines: summary.lines
            },
            files: this.coverageData.map(cov => ({
                path: cov.path,
                statements: Object.values(cov.s).reduce((a, b) => a + b, 0),
                branches: Object.values(cov.b).flat().reduce((a, b) => a + b, 0),
                functions: Object.values(cov.f).reduce((a, b) => a + b, 0)
            }))
        };
        console.log('\nCoverage JSON:');
        console.log(JSON.stringify(report, null, 2));
    }

    protected async renderHtmlReport(summary: CoverageSummary): Promise<void> {
        const outputDir = this.options?.outputDir || 'coverage';
        
        if (typeof window !== 'undefined' && window.document) {
            const coverageContainer = window.document.getElementById('coverage-report');
            if (coverageContainer) {
                coverageContainer.innerHTML = `
                    <div class="coverage-summary">
                        <h2>Coverage Report</h2>
                        <table>
                            <tr><th>Type</th><th>Covered</th><th>Total</th><th>Coverage</th></tr>
                            <tr><td>Statements</td><td>${summary.statements.covered}</td><td>${summary.statements.total}</td><td>${summary.statements.pct.toFixed(2)}%</td></tr>
                            <tr><td>Branches</td><td>${summary.branches.covered}</td><td>${summary.branches.total}</td><td>${summary.branches.pct.toFixed(2)}%</td></tr>
                            <tr><td>Functions</td><td>${summary.functions.covered}</td><td>${summary.functions.total}</td><td>${summary.functions.pct.toFixed(2)}%</td></tr>
                            <tr><td>Lines</td><td>${summary.lines.covered}</td><td>${summary.lines.total}</td><td>${summary.lines.pct.toFixed(2)}%</td></tr>
                        </table>
                    </div>
                `;
            }
        } else {
            console.log(`\nHTML coverage report would be generated in: ${outputDir}/`);
        }
    }

    protected renderLcovReport(summary: CoverageSummary): void {
        const outputDir = this.options?.outputDir || 'coverage';
        console.log(`\nLCOV coverage report would be generated in: ${outputDir}/lcov.info`);
    }

    protected renderCoberturaReport(summary: CoverageSummary): void {
        const outputDir = this.options?.outputDir || 'coverage';
        console.log(`\nCobertura XML coverage report would be generated in: ${outputDir}/cobertura.xml`);
    }

    protected checkThreshold(summary: CoverageSummary): void {
        const threshold = this.options.threshold;
        if (!threshold) return;
        
        const failedThresholds: string[] = [];

        if (threshold.lines && summary.lines.pct < threshold.lines) {
            failedThresholds.push(`lines: ${summary.lines.pct.toFixed(2)}% < ${threshold.lines}%`);
        }
        if (threshold.statements && summary.statements.pct < threshold.statements) {
            failedThresholds.push(`statements: ${summary.statements.pct.toFixed(2)}% < ${threshold.statements}%`);
        }
        if (threshold.functions && summary.functions.pct < threshold.functions) {
            failedThresholds.push(`functions: ${summary.functions.pct.toFixed(2)}% < ${threshold.functions}%`);
        }
        if (threshold.branches && summary.branches.pct < threshold.branches) {
            failedThresholds.push(`branches: ${summary.branches.pct.toFixed(2)}% < ${threshold.branches}%`);
        }

        if (failedThresholds.length > 0) {
            console.error('\nCoverage threshold failed:');
            failedThresholds.forEach(msg => console.error(`  ${msg}`));
            process.exit(1);
        }
    }
}

interface CoverageStat {
    total: number;
    covered: number;
    pct: number;
}

interface CoverageSummary {
    lines: CoverageStat;
    statements: CoverageStat;
    functions: CoverageStat;
    branches: CoverageStat;
}