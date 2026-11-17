import { Token, Inject, Injector, Injectable } from '@tsdi/ioc';
import { SuiteDescribe, RealtimeReporter, ICaseDescribe, CoverageSummary, UNITTESTCONFIGURE, UnitTestConfigure, CoverageReporter } from '@tsdi/unit';
import { HrtimeFormatter } from '@tsdi/core';
import * as path from 'path';
import * as fs from 'fs';
import { V8CoverageCollector } from './V8CoverageCollector';
import * as chalk from 'chalk';

/** Minimal HTML escaping for report output. */
function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

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

@Injectable()
export class V8CoverageReporter extends CoverageReporter {

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


    override async render(suites: SuiteDescribe[], total: [number, number]): Promise<void> {
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
        const files = Array.from(fileCoverages.entries());

        const cellW = [50, 7, 7, 7, 7];
        const line = cellW.map(w => '─'.repeat(w + 2)).join('┬');
        const bd = chalk.gray.dim;
        const strip = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, '');
        const pad = (s: string, w: number) => s + ' '.repeat(w - strip(s).length);

        const top = bd('┌' + line + '┐');
        const mid = bd('├' + line.replace(/┬/g, '┼').split('').map((c, i, arr) => 
            c === '┬' ? (i > 0 && i < arr.length - 1 ? '┼' : '─') : c
        ).join('') + '┤');
        const bot = bd('└' + line.replace(/┬/g, '┴') + '┘');
        const bar = (pct: number) => {
            const filled = Math.round(pct / 5);
            const color = pct >= 80 ? chalk.green : pct >= 60 ? chalk.yellow : chalk.red;
            return color('█'.repeat(filled) + chalk.gray('░'.repeat(20 - filled)));
        };
        const pct = (v: number) => {
            const s = v.toFixed(1) + '%';
            return v >= 80 ? chalk.green(s) : v >= 60 ? chalk.yellow(s) : chalk.red(s);
        };
        const row = (cells: string[], isHeader = false) => {
            const fn = isHeader ? (v: string) => chalk.bold(v) : (v: string) => v;
            return bd('│') + cells.map((v, i) => ' ' + pad(fn(v as string), cellW[i])).join(bd(' │')) + bd(' │');
        };

        console.log('\n' + chalk.cyan(' Coverage Report '));
        console.log(top);
        console.log(row(['File', 'Stmts', 'Branch', 'Funcs', 'Lines'], true));
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
        console.log(' Coverage: ' + bar(summary.lines.percentage) + ' ' + pct(summary.lines.percentage));
        console.log(chalk.gray(` ${files.length} files\n`));
    }

    protected renderSummaryReport(): void {
        if (!this.coverageCollector) {
            console.log(chalk.yellow('\nNo coverage data. Run with NODE_V8_COVERAGE'));
            return;
        }

        const summary = this.coverageCollector.getSummary();
        const files = this.coverageCollector.getAllFileCoverages().size;

        const cellW = [12, 7, 7, 7, 7];
        const line = cellW.map(w => '─'.repeat(w + 2)).join('┬');
        const bd = chalk.gray.dim;
        const strip = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, '');
        const pad = (s: string, w: number) => s + ' '.repeat(w - strip(s).length);

        const top = bd('┌' + line + '┐');
        const mid = bd('├' + line.replace(/┬/g, '┼').split('').map((c, i, arr) => 
            c === '┬' ? (i > 0 && i < arr.length - 1 ? '┼' : '─') : c
        ).join('') + '┤');
        const bot = bd('└' + line.replace(/┬/g, '┴') + '┘');
        const bar = (pct: number) => {
            const filled = Math.round(pct / 5);
            const color = pct >= 80 ? chalk.green : pct >= 60 ? chalk.yellow : chalk.red;
            return color('█'.repeat(filled) + chalk.gray('░'.repeat(20 - filled)));
        };
        const pct = (v: number) => {
            const s = v.toFixed(1) + '%';
            return v >= 80 ? chalk.green(s) : v >= 60 ? chalk.yellow(s) : chalk.red(s);
        };
        const row = (cells: string[], isHeader = false) => {
            const fn = isHeader ? (v: string) => chalk.bold(v) : (v: string) => v;
            return bd('│') + cells.map((v, i) => ' ' + pad(fn(v as string), cellW[i])).join(bd(' │')) + bd(' │');
        };

        console.log('\n' + chalk.cyan(' Coverage Summary '));
        console.log(top);
        console.log(row(['Type', 'Stmts', 'Branch', 'Funcs', 'Lines'], true));
        console.log(mid);
        console.log(row(['Total',
            pct(summary.statements.percentage),
            pct(summary.branches.percentage),
            pct(summary.functions.percentage),
            pct(summary.lines.percentage)
        ]));
        console.log(bot);
        console.log(' Coverage: ' + bar(summary.lines.percentage) + ' ' + pct(summary.lines.percentage));
        console.log(chalk.gray(` ${files} files\n`));
    }

    protected pctStr(pct: number): string {
        const str = pct.toFixed(1) + '%';
        const color = this.getCoverageColor(pct);
        return color(str);
    }

    protected formatCoverage(data: { total: number; covered: number; percentage: number }): string {
        if (data.total === 0) return chalk.gray('N/A');
        return this.pctStr(data.percentage);
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

        console.log('\nCoverage JSON:');
        console.log(JSON.stringify(report, null, 2));
    }

    protected async renderHtmlReport(): Promise<void> {
        if (!this.coverageCollector) return;

        const summary = this.coverageCollector.getSummary();
        const file = this.writeReport('index.html', this.buildHtmlReport());
        if (!file) return;
        console.log(`\nHTML coverage report: ${chalk.blue(file)}`);
        console.log(`Lines: ${this.formatCoverage(summary.lines)}`);
    }

    protected renderLcovReport(): void {
        if (!this.coverageCollector) return;

        const summary = this.coverageCollector.getSummary();
        const file = this.writeReport('lcov.info', this.buildLcovReport());
        if (!file) return;
        console.log(`\nLCOV coverage report: ${chalk.blue(file)}`);
        console.log(`Lines: ${this.formatCoverage(summary.lines)}`);
    }

    protected renderCoberturaReport(): void {
        if (!this.coverageCollector) return;

        const summary = this.coverageCollector.getSummary();
        const file = this.writeReport('cobertura.xml', this.buildCoberturaReport());
        if (!file) return;
        console.log(`\nCobertura coverage report: ${chalk.blue(file)}`);
        console.log(`Lines: ${this.formatCoverage(summary.lines)}`);
    }

    /** Resolve the report directory and create it on demand. */
    protected reportDir(): string {
        return path.resolve(this.options?.outputDir || 'coverage');
    }

    protected writeReport(name: string, contents: string): string | undefined {
        try {
            const dir = this.reportDir();
            fs.mkdirSync(dir, { recursive: true });
            const file = path.join(dir, name);
            fs.writeFileSync(file, contents, 'utf-8');
            return file;
        } catch (error) {
            console.log(chalk.yellow(`Warning: could not write ${name}: ${(error as Error).message}`));
            return undefined;
        }
    }

    protected buildHtmlReport(): string {
        const summary = this.coverageCollector!.getSummary();
        const rows = Array.from(this.coverageCollector!.getAllFileCoverages().entries())
            .sort((a, b) => a[1].summary.lines.percentage - b[1].summary.lines.percentage)
            .map(([filePath, file]) => {
                const name = this.getRelativePath(filePath);
                const pct = file.summary.lines.percentage.toFixed(1);
                const cls = file.summary.lines.percentage >= 80 ? 'good' : file.summary.lines.percentage >= 60 ? 'warn' : 'bad';
                return `      <tr class="${cls}"><td>${escapeHtml(name)}</td><td>${pct}%</td>` +
                    `<td>${file.summary.statements.percentage.toFixed(1)}%</td>` +
                    `<td>${file.summary.branches.percentage.toFixed(1)}%</td>` +
                    `<td>${file.summary.functions.percentage.toFixed(1)}%</td></tr>`;
            })
            .join('\n');
        return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Coverage report</title>
    <style>
      body { font-family: system-ui, sans-serif; margin: 2rem; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border-bottom: 1px solid #ddd; padding: .35rem .6rem; text-align: left; }
      tr.bad td:first-child { color: #b00020; }
      tr.warn td:first-child { color: #a06000; }
      tr.good td:first-child { color: #0b6b2f; }
    </style>
  </head>
  <body>
    <h1>Coverage report</h1>
    <p>Lines: ${summary.lines.percentage.toFixed(2)}% (${summary.lines.covered}/${summary.lines.total})</p>
    <table>
      <thead><tr><th>File</th><th>Lines</th><th>Statements</th><th>Branches</th><th>Functions</th></tr></thead>
      <tbody>
${rows}
      </tbody>
    </table>
  </body>
</html>
`;
    }

    protected buildLcovReport(): string {
        const records: string[] = [];
        this.coverageCollector!.getAllFileCoverages().forEach((file, filePath) => {
            const lines = Array.from(file.lines.entries()).sort((a, b) => a[0] - b[0]);
            const covered = lines.filter(([, hits]) => hits > 0).length;
            records.push(`SF:${filePath}`);
            lines.forEach(([line, hits]) => records.push(`DA:${line},${hits}`));
            records.push(`LF:${lines.length}`);
            records.push(`LH:${covered}`);
            records.push('end_of_record');
        });
        return records.join('\n') + '\n';
    }

    protected buildCoberturaReport(): string {
        const summary = this.coverageCollector!.getSummary();
        const rate = (value: { total: number; covered: number }) =>
            value.total === 0 ? '1' : (value.covered / value.total).toFixed(4);
        const classes = Array.from(this.coverageCollector!.getAllFileCoverages().entries())
            .map(([filePath, file]) => {
                const name = this.getRelativePath(filePath).replace(/\\/g, '/');
                const lines = Array.from(file.lines.entries()).map(([line, hits]) =>
                    `        <line number="${line}" hits="${hits}"/>`).join('\n');
                return `      <class name="${escapeHtml(name)}" filename="${escapeHtml(name)}" ` +
                    `line-rate="${rate(file.summary.lines)}" branch-rate="${rate(file.summary.branches)}">\n` +
                    `        <lines>\n${lines}\n        </lines>\n      </class>`;
            })
            .join('\n');
        return `<?xml version="1.0" encoding="utf-8"?>
<coverage line-rate="${rate(summary.lines)}" branch-rate="${rate(summary.branches)}" version="1.0" timestamp="${Date.now()}">
  <packages>
    <package name="all">
      <classes>
${classes}
      </classes>
    </package>
  </packages>
</coverage>
`;
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
