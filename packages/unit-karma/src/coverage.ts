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

    protected calculateSummary(): CoverageSummary {
        let totalLines = 0, coveredLines = 0;
        let totalStatements = 0, coveredStatements = 0;
        let totalFunctions = 0, coveredFunctions = 0;
        let totalBranches = 0, coveredBranches = 0;

        for (const cov of this.coverageData) {
            for (const [key, count] of Object.entries(cov.statementMap)) {
                totalStatements++;
                if (cov.s[key] > 0) coveredStatements++;
            }

            for (const [key] of Object.entries(cov.fnMap)) {
                if (cov.f[key] > 0) coveredFunctions++;
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

    protected async renderReport(type: CoverageReporterType, summary: CoverageSummary): Promise<void> {
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

    private getColor(pct: number): string {
        return pct >= 80 ? 'green' : pct >= 60 ? 'yellow' : 'red';
    }

    private colorPct(pct: number): string {
        const color = this.getColor(pct);
        return `<span class="cov-${color}">${pct.toFixed(1)}%</span>`;
    }

    private barChart(pct: number): string {
        const filled = Math.round(pct / 5);
        const color = this.getColor(pct);
        return `<span class="cov-${color}">${'█'.repeat(filled)}</span><span class="cov-empty">${'░'.repeat(20 - filled)}</span>`;
    }

    protected renderTextReport(summary: CoverageSummary): void {
        const cellW = [12, 7, 7, 7, 7];
        const line = cellW.map(w => '─'.repeat(w + 2)).join('┬');
        const pad = (s: string, w: number) => s + ' '.repeat(w - s.length);

        const top = '┌' + line + '┐';
        const mid = '├' + line.replace(/┬/g, '┼') + '┤';
        const bot = '└' + line.replace(/┬/g, '┴') + '┘';
        const row = (cells: string[]) => '│' + cells.map((v, i) => ' ' + pad(v, cellW[i])).join(' │') + ' │';

        const pct = (v: number) => {
            const s = v.toFixed(1) + '%';
            const color = this.getColor(v);
            return `<span class="cov-${color}">${s}</span>`;
        };

        const fileCoverages = this.coverageData.map(cov => ({
            path: cov.path,
            coverage: this.calculateFileCoverage(cov)
        })).sort((a, b) => a.coverage.lines.pct - b.coverage.lines.pct);

        console.log('\n< Coverage Report >');
        console.log(top);
        console.log(row(['File', 'Stmts', 'Branch', 'Funcs', 'Lines']));
        console.log(mid);

        for (const { path: filePath, coverage } of fileCoverages) {
            const name = filePath.split('/').pop() || filePath;
            console.log(row([name,
                pct(coverage.statements.pct),
                pct(coverage.branches.pct),
                pct(coverage.functions.pct),
                pct(coverage.lines.pct)
            ]));
        }

        console.log(mid);
        console.log(row(['All files',
            pct(summary.statements.pct),
            pct(summary.branches.pct),
            pct(summary.functions.pct),
            pct(summary.lines.pct)
        ]));
        console.log(bot);
        console.log(` Coverage: ${this.barChart(summary.lines.pct)} ${this.colorPct(summary.lines.pct)}`);
        console.log(` ${this.coverageData.length} files\n`);
    }

    protected renderSummaryReport(summary: CoverageSummary): void {
        const cellW = [12, 7, 7, 7, 7];
        const line = cellW.map(w => '─'.repeat(w + 2)).join('┬');
        const pad = (s: string, w: number) => s + ' '.repeat(w - s.length);

        const top = '┌' + line + '┐';
        const mid = '├' + line.replace(/┬/g, '┼') + '┤';
        const bot = '└' + line.replace(/┬/g, '┴') + '┘';
        const row = (cells: string[]) => '│' + cells.map((v, i) => ' ' + pad(v, cellW[i])).join(' │') + ' │';

        const pct = (v: number) => {
            const s = v.toFixed(1) + '%';
            const color = this.getColor(v);
            return `<span class="cov-${color}">${s}</span>`;
        };

        console.log('\n< Coverage Summary >');
        console.log(top);
        console.log(row(['Type', 'Stmts', 'Branch', 'Funcs', 'Lines']));
        console.log(mid);
        console.log(row(['Total',
            pct(summary.statements.pct),
            pct(summary.branches.pct),
            pct(summary.functions.pct),
            pct(summary.lines.pct)
        ]));
        console.log(bot);
        console.log(` Coverage: ${this.barChart(summary.lines.pct)} ${this.colorPct(summary.lines.pct)}`);
        console.log(` ${this.coverageData.length} files\n`);
    }

    protected calculateFileCoverage(cov: IstanbulCoverage): CoverageSummary {
        let totalStatements = 0, coveredStatements = 0;
        let totalFunctions = 0, coveredFunctions = 0;
        let totalBranches = 0, coveredBranches = 0;
        let totalLines = 0, coveredLines = 0;

        for (const [key] of Object.entries(cov.statementMap)) {
            totalStatements++;
            if (cov.s[key] > 0) coveredStatements++;
        }

        for (const [key] of Object.entries(cov.fnMap)) {
            if (cov.f[key] > 0) coveredFunctions++;
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
            if (cov.s[key] > 0) coveredLines++;
        }

        return {
            statements: { total: totalStatements, covered: coveredStatements, pct: totalStatements > 0 ? (coveredStatements / totalStatements) * 100 : 100 },
            functions: { total: totalFunctions, covered: coveredFunctions, pct: totalFunctions > 0 ? (coveredFunctions / totalFunctions) * 100 : 100 },
            branches: { total: totalBranches, covered: coveredBranches, pct: totalBranches > 0 ? (coveredBranches / totalBranches) * 100 : 100 },
            lines: { total: totalLines, covered: coveredLines, pct: totalLines > 0 ? (coveredLines / totalLines) * 100 : 100 }
        };
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
                coverage: this.calculateFileCoverage(cov)
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
                const pct = (v: number) => {
                    const color = this.getColor(v);
                    return `<span class="cov-${color}">${v.toFixed(1)}%</span>`;
                };
                const bar = this.barChart(summary.lines.pct);

                coverageContainer.innerHTML = `
                    <div class="coverage-summary">
                        <h2>Coverage Summary</h2>
                        <table class="coverage-table">
                            <tr><th>Type</th><th>Stmts</th><th>Branch</th><th>Funcs</th><th>Lines</th></tr>
                            <tr><td>Total</td>
                                <td>${pct(summary.statements.pct)}</td>
                                <td>${pct(summary.branches.pct)}</td>
                                <td>${pct(summary.functions.pct)}</td>
                                <td>${pct(summary.lines.pct)}</td>
                            </tr>
                        </table>
                        <div class="coverage-bar">
                            Coverage: ${bar} ${this.colorPct(summary.lines.pct)}
                        </div>
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