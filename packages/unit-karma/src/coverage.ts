import { Token, Module, Inject, Injector, Optional } from '@tsdi/ioc';
import { SuiteDescribe, RealtimeReporter, ICaseDescribe, CoverageSummary, UnitTestConfigure } from '@tsdi/unit';
import { ServerModule } from '@tsdi/platform-server';
import { HrtimeFormatter } from '@tsdi/core';
import * as path from 'path';
import * as fs from 'fs';
import { V8CoverageCollector, KarmaCoverageOptions } from './V8CoverageCollector';
import { BrowserCoverageCollector, BrowserCoverageOptions } from './BrowserCoverageCollector';

export type CoverageReporterType = 'text' | 'text-summary' | 'json' | 'html' | 'lcov' | 'cobertura';

export { KarmaCoverageOptions as CoverageOptions, KarmaCoverageOptions };

function isBrowserEnvironment(): boolean {
    return typeof window !== 'undefined' && typeof window.document !== 'undefined';
}

@Module({
    imports: [
        ServerModule
    ],
    providers: [
        V8CoverageCollector,
        BrowserCoverageCollector
    ]
})
export class CoverageReporter extends RealtimeReporter {

    private _options: KarmaCoverageOptions = {};

    constructor(
        @Inject() hrtime: HrtimeFormatter,
        @Inject() private injector: Injector,
        @Optional() private config?: UnitTestConfigure
    ) {
        super();
        this.hrtime = hrtime;
    }

    private coverageCollector: V8CoverageCollector | BrowserCoverageCollector | null = null;

    private get options(): KarmaCoverageOptions {
        return this._options;
    }

    setOptions(options: KarmaCoverageOptions) {
        this._options = options || {};
    }

    override track(error: Error): void {
        console.error(error.stack || error.message);
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

        this.selectCollector();
        
        if (this.coverageCollector) {
            try {
                if ('setOptions' in this.coverageCollector) {
                    if (isBrowserEnvironment()) {
                        (this.coverageCollector as BrowserCoverageCollector).setOptions(this.options);
                    } else {
                        (this.coverageCollector as V8CoverageCollector).setOptions(this.options, this.config?.baseURL);
                    }
                }
                await this.coverageCollector.collect();
            } catch (e) {
                console.log('\nWarning: Could not collect coverage data.');
            }
        }

        const reporters = this.options.reporters || ['text-summary'];

        for (const reporterType of reporters) {
            await this.renderReport(reporterType);
        }

        if (this.options.threshold && this.coverageCollector) {
            this.checkThreshold(this.coverageCollector.getSummary());
        }
    }

    private selectCollector(): void {
        if (isBrowserEnvironment()) {
            this.coverageCollector = this.injector.get(BrowserCoverageCollector);
        } else {
            this.coverageCollector = this.injector.get(V8CoverageCollector);
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

    protected renderTextReport(): void {
        if (!this.coverageCollector) {
            console.log('\nNo coverage data collected.');
            return;
        }

        const summary = this.coverageCollector.getSummary();
        const fileCoverages = this.coverageCollector.getAllFileCoverages();
        const files = Array.from(fileCoverages.entries());

        if (files.length === 0) {
            console.log('\nNo files with coverage data.');
            return;
        }

        const cellW = [50, 7, 7, 7, 7];
        const line = cellW.map(w => '─'.repeat(w + 2)).join('┬');
        const strip = (s: string) => s.replace(/<[^>]*>/g, '');
        const pad = (s: string, w: number) => strip(s) + ' '.repeat(Math.max(0, w - strip(s).length));

        const top = '┌' + line + '┐';
        const mid = '├' + line.replace(/┬/g, '┼') + '┤';
        const bot = '└' + line.replace(/┬/g, '┴') + '┘';
        const row = (cells: string[]) => '│' + cells.map((v, i) => ' ' + pad(v, cellW[i])).join(' │') + ' │';

        const pct = (v: number) => this.colorPct(v);

        console.log('\n< Coverage Report >');
        console.log(top);
        console.log(row(['File', 'Stmts', 'Branch', 'Funcs', 'Lines']));
        console.log(mid);

        const sortedFiles = files
            .map(([p, f]) => ({ path: p, file: f, cov: f.summary.lines.percentage }))
            .sort((a, b) => a.cov - b.cov);

        for (const { path: filePath, file } of sortedFiles) {
            const relPath = this.getRelativePath(filePath);
            const name = relPath.length > cellW[0] ? '..' + relPath.slice(-cellW[0] + 2) : relPath;
            console.log(row([name,
                pct(file.summary.statements.percentage),
                pct(file.summary.branches.percentage),
                pct(file.summary.functions.percentage),
                pct(file.summary.lines.percentage)
            ]));
        }

        console.log(mid);
        console.log(row(['All files',
            pct(summary.statements.percentage),
            pct(summary.branches.percentage),
            pct(summary.functions.percentage),
            pct(summary.lines.percentage)
        ]));
        console.log(bot);
        console.log(` Coverage: ${this.barChart(summary.lines.percentage)} ${this.colorPct(summary.lines.percentage)}`);
        console.log(` ${files.length} files\n`);
    }

    protected renderSummaryReport(): void {
        if (!this.coverageCollector) {
            console.log('\nNo coverage data collected.');
            return;
        }

        const summary = this.coverageCollector.getSummary();
        const files = this.coverageCollector.getAllFileCoverages().size;

        const cellW = [12, 7, 7, 7, 7];
        const line = cellW.map(w => '─'.repeat(w + 2)).join('┬');
        const strip = (s: string) => s.replace(/<[^>]*>/g, '');
        const pad = (s: string, w: number) => strip(s) + ' '.repeat(Math.max(0, w - strip(s).length));

        const top = '┌' + line + '┐';
        const mid = '├' + line.replace(/┬/g, '┼') + '┤';
        const bot = '└' + line.replace(/┬/g, '┴') + '┘';
        const row = (cells: string[]) => '│' + cells.map((v, i) => ' ' + pad(v, cellW[i])).join(' │') + ' │';

        const pct = (v: number) => this.colorPct(v);

        console.log('\n< Coverage Summary >');
        console.log(top);
        console.log(row(['Type', 'Stmts', 'Branch', 'Funcs', 'Lines']));
        console.log(mid);
        console.log(row(['Total',
            pct(summary.statements.percentage),
            pct(summary.branches.percentage),
            pct(summary.functions.percentage),
            pct(summary.lines.percentage)
        ]));
        console.log(bot);
        console.log(` Coverage: ${this.barChart(summary.lines.percentage)} ${this.colorPct(summary.lines.percentage)}`);
        console.log(` ${files} files\n`);
    }

    protected renderJsonReport(): void {
        if (!this.coverageCollector) return;

        const summary = this.coverageCollector.getSummary();
        const fileCoverages = this.coverageCollector.getAllFileCoverages();

        const report = {
            timestamp: new Date().toISOString(),
            environment: isBrowserEnvironment() ? 'browser' : 'node',
            total: summary,
            files: Array.from(fileCoverages.entries()).map(([filePath, file]) => ({
                path: filePath,
                summary: file.summary
            }))
        };
        console.log('\nCoverage JSON:');
        console.log(JSON.stringify(report, null, 2));
    }

    protected async renderHtmlReport(): Promise<void> {
        if (!this.coverageCollector) return;

        const summary = this.coverageCollector.getSummary();
        const outputDir = this.options?.outputDir || 'coverage';

        if (isBrowserEnvironment() && window.document) {
            const coverageContainer = window.document.getElementById('coverage-report');
            if (coverageContainer) {
                const pct = (v: number) => {
                    const color = this.getColor(v);
                    return `<span class="cov-${color}">${v.toFixed(1)}%</span>`;
                };
                const bar = this.barChart(summary.lines.percentage);

                coverageContainer.innerHTML = `
                    <div class="coverage-summary">
                        <h2>Coverage Summary</h2>
                        <table class="coverage-table">
                            <tr><th>Type</th><th>Stmts</th><th>Branch</th><th>Funcs</th><th>Lines</th></tr>
                            <tr><td>Total</td>
                                <td>${pct(summary.statements.percentage)}</td>
                                <td>${pct(summary.branches.percentage)}</td>
                                <td>${pct(summary.functions.percentage)}</td>
                                <td>${pct(summary.lines.percentage)}</td>
                            </tr>
                        </table>
                        <div class="coverage-bar">
                            Coverage: ${bar} ${this.colorPct(summary.lines.percentage)}
                        </div>
                    </div>
                `;
            }
        } else {
            console.log(`\nHTML coverage report would be generated in: ${outputDir}/`);
        }
    }

    protected renderLcovReport(): void {
        if (!this.coverageCollector) {
            console.log('\nNo coverage data for LCOV report.');
            return;
        }

        const outputDir = this.options?.outputDir || 'coverage';
        const outputFile = path.join(outputDir, 'lcov.info');

        try {
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            const fileCoverages = this.coverageCollector.getAllFileCoverages();
            let lcov = 'TN:\n';

            fileCoverages.forEach((fileData, filePath) => {
                const relPath = this.getRelativePath(filePath);
                lcov += `SF:${relPath}\n`;

                fileData.functions.forEach((count, line) => {
                    lcov += `FN:${line},${line}\n`;
                });
                fileData.functions.forEach((count, line) => {
                    lcov += `FNDA:${count}:${line}\n`;
                });
                lcov += `FNF:${fileData.summary.functions.total}\n`;
                lcov += `FNH:${fileData.summary.functions.covered}\n`;

                fileData.branches.forEach((count, line) => {
                    lcov += `BRDA:${line},0,0,${count > 0 ? '1' : '0'}\n`;
                });
                lcov += `BRF:${fileData.summary.branches.total}\n`;
                lcov += `BRH:${fileData.summary.branches.covered}\n`;

                fileData.lines.forEach((count, line) => {
                    lcov += `DA:${line},${count > 0 ? 1 : 0}\n`;
                });
                lcov += `LF:${fileData.summary.lines.total}\n`;
                lcov += `LH:${fileData.summary.lines.covered}\n`;

                lcov += 'end_of_record\n';
            });

            fs.writeFileSync(outputFile, lcov);
            console.log(`\nLCOV report generated: ${outputFile}`);
        } catch (e) {
            console.log(`\nFailed to generate LCOV report: ${e}`);
        }
    }

    protected renderCoberturaReport(): void {
        if (!this.coverageCollector) {
            console.log('\nNo coverage data for Cobertura report.');
            return;
        }

        const outputDir = this.options?.outputDir || 'coverage';
        const outputFile = path.join(outputDir, 'cobertura.xml');

        try {
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            const summary = this.coverageCollector.getSummary();
            const fileCoverages = this.coverageCollector.getAllFileCoverages();

            let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
            xml += '<coverage line-rate="0" lines-covered="0" lines-valid="0" ';
            xml += 'branch-rate="0" branches-covered="0" branches-valid="0" ';
            xml += `timestamp="${Date.now()}" version="6.0.31">\n`;
            xml += '  <packages>\n';
            xml += '    <package name="root" line-rate="0" branch-rate="0">\n';
            xml += '      <classes>\n';

            fileCoverages.forEach((fileData, filePath) => {
                const relPath = this.getRelativePath(filePath);
                const className = path.basename(relPath, path.extname(relPath));

                xml += `        <class name="${className}" filename="${relPath}" `;
                xml += `line-rate="${(fileData.summary.lines.percentage / 100).toFixed(2)}" `;
                xml += `branch-rate="${(fileData.summary.branches.percentage / 100).toFixed(2)}">\n`;
                xml += '          <methods>\n';

                fileData.functions.forEach((count, line) => {
                    xml += `            <method name="${line}" line-number="${line}" `;
                    xml += `hits="${count}"/>\n`;
                });
                xml += '          </methods>\n';
                xml += '          <lines>\n';

                fileData.lines.forEach((count, line) => {
                    xml += `            <line number="${line}" hits="${count > 0 ? 1 : 0}"/>\n`;
                });
                xml += '          </lines>\n';
                xml += '        </class>\n';
            });

            xml += '      </classes>\n';
            xml += '    </package>\n';
            xml += '  </packages>\n';
            xml += '</coverage>\n';

            fs.writeFileSync(outputFile, xml);
            console.log(`\nCobertura XML report generated: ${outputFile}`);
        } catch (e) {
            console.log(`\nFailed to generate Cobertura report: ${e}`);
        }
    }

    protected checkThreshold(summary: CoverageSummary): void {
        const threshold = this.options.threshold;
        if (!threshold) return;

        const failedThresholds: string[] = [];

        if (threshold.lines && summary.lines.percentage < threshold.lines) {
            failedThresholds.push(`lines: ${summary.lines.percentage.toFixed(2)}% < ${threshold.lines}%`);
        }
        if (threshold.statements && summary.statements.percentage < threshold.statements) {
            failedThresholds.push(`statements: ${summary.statements.percentage.toFixed(2)}% < ${threshold.statements}%`);
        }
        if (threshold.functions && summary.functions.percentage < threshold.functions) {
            failedThresholds.push(`functions: ${summary.functions.percentage.toFixed(2)}% < ${threshold.functions}%`);
        }
        if (threshold.branches && summary.branches.percentage < threshold.branches) {
            failedThresholds.push(`branches: ${summary.branches.percentage.toFixed(2)}% < ${threshold.branches}%`);
        }

        if (failedThresholds.length > 0) {
            console.error('\nCoverage threshold failed:');
            failedThresholds.forEach(msg => console.error(`  ${msg}`));
            process.exit(1);
        }
    }

    private getRelativePath(filePath: string): string {
        const cwd = process.cwd();
        if (filePath.startsWith(cwd)) {
            return path.relative(cwd, filePath);
        }
        return filePath;
    }
}
