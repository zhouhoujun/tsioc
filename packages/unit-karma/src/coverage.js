"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KarmaCoverageReporter = exports.CoverageReporter = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const unit_1 = require("@tsdi/unit");
const core_1 = require("@tsdi/core");
const common_1 = require("@tsdi/common");
const BrowserCoverageCollector_1 = require("./BrowserCoverageCollector");
function isBrowserEnvironment() {
    return typeof window !== 'undefined' && typeof window.document !== 'undefined';
}
let KarmaCoverageReporter = class KarmaCoverageReporter extends unit_1.CoverageReporter {
    constructor(hrtime, injector, fileAdapter, config) {
        super();
        this.injector = injector;
        this.fileAdapter = fileAdapter;
        this.config = config;
        this._options = {};
        this.coverageCollector = null;
        this.hrtime = hrtime;
    }
    get options() {
        return this._options;
    }
    setOptions(options) {
        this._options = options || {};
    }
    track(error) {
        console.error(error.stack || error.message);
        throw error;
    }
    async render(suites, total) {
        if (!this.options?.enabled) {
            return;
        }
        this.coverageCollector = this.injector.get(BrowserCoverageCollector_1.BrowserCoverageCollector);
        if (this.coverageCollector) {
            try {
                this.coverageCollector.setOptions(this.options);
                await this.coverageCollector.collect();
            }
            catch (e) {
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
    async renderReport(type) {
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
    getColor(pct) {
        return pct >= 80 ? 'green' : pct >= 60 ? 'yellow' : 'red';
    }
    colorPct(pct) {
        const color = this.getColor(pct);
        return `<span class="cov-${color}">${pct.toFixed(1)}%</span>`;
    }
    barChart(pct) {
        const filled = Math.round(pct / 5);
        const color = this.getColor(pct);
        return `<span class="cov-${color}">${'█'.repeat(filled)}</span><span class="cov-empty">${'░'.repeat(20 - filled)}</span>`;
    }
    renderTextReport() {
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
        const strip = (s) => s.replace(/<[^>]*>/g, '');
        const pad = (s, w) => strip(s) + ' '.repeat(Math.max(0, w - strip(s).length));
        const top = '┌' + line + '┐';
        const mid = '├' + line.replace(/┬/g, '┼') + '┤';
        const bot = '└' + line.replace(/┬/g, '┴') + '┘';
        const row = (cells) => '│' + cells.map((v, i) => ' ' + pad(v, cellW[i])).join(' │') + ' │';
        const pct = (v) => this.colorPct(v);
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
    renderSummaryReport() {
        if (!this.coverageCollector) {
            console.log('\nNo coverage data collected.');
            return;
        }
        const summary = this.coverageCollector.getSummary();
        const files = this.coverageCollector.getAllFileCoverages().size;
        const cellW = [12, 7, 7, 7, 7];
        const line = cellW.map(w => '─'.repeat(w + 2)).join('┬');
        const strip = (s) => s.replace(/<[^>]*>/g, '');
        const pad = (s, w) => strip(s) + ' '.repeat(Math.max(0, w - strip(s).length));
        const top = '┌' + line + '┐';
        const mid = '├' + line.replace(/┬/g, '┼') + '┤';
        const bot = '└' + line.replace(/┬/g, '┴') + '┘';
        const row = (cells) => '│' + cells.map((v, i) => ' ' + pad(v, cellW[i])).join(' │') + ' │';
        const pct = (v) => this.colorPct(v);
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
    renderJsonReport() {
        if (!this.coverageCollector)
            return;
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
    async renderHtmlReport() {
        if (!this.coverageCollector)
            return;
        const summary = this.coverageCollector.getSummary();
        const outputDir = this.options?.outputDir || 'coverage';
        if (isBrowserEnvironment() && window.document) {
            const coverageContainer = window.document.getElementById('coverage-report');
            if (coverageContainer) {
                const pct = (v) => {
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
        }
        else {
            console.log(`\nHTML coverage report would be generated in: ${outputDir}/`);
        }
    }
    renderLcovReport() {
        if (!this.coverageCollector) {
            console.log('\nNo coverage data for LCOV report.');
            return;
        }
        if (!this.fileAdapter?.existsSync) {
            console.log('\nLCOV report requires file system access (Node.js environment).');
            return;
        }
        const outputDir = this.options?.outputDir || 'coverage';
        const outputFile = this.fileAdapter.join(outputDir, 'lcov.info');
        try {
            if (!this.fileAdapter?.existsSync(outputDir)) {
                console.log('\nLCOV report can only be generated in Node.js environment with file system access.');
                return;
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
            console.log('\nLCOV data generated (file write not supported in browser):');
            console.log(lcov.substring(0, 500) + (lcov.length > 500 ? '...' : ''));
        }
        catch (e) {
            console.log(`\nFailed to generate LCOV report: ${e}`);
        }
    }
    renderCoberturaReport() {
        if (!this.coverageCollector) {
            console.log('\nNo coverage data for Cobertura report.');
            return;
        }
        if (!this.fileAdapter?.existsSync) {
            console.log('\nCobertura report requires file system access (Node.js environment).');
            return;
        }
        const outputDir = this.options?.outputDir || 'coverage';
        const outputFile = this.fileAdapter.join(outputDir, 'cobertura.xml');
        try {
            if (!this.fileAdapter?.existsSync(outputDir)) {
                console.log('\nCobertura report can only be generated in Node.js environment with file system access.');
                return;
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
                const className = this.getBaseName(relPath);
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
            console.log('\nCobertura XML data generated (file write not supported in browser):');
            console.log(xml.substring(0, 500) + (xml.length > 500 ? '...' : ''));
        }
        catch (e) {
            console.log(`\nFailed to generate Cobertura report: ${e}`);
        }
    }
    checkThreshold(summary) {
        const threshold = this.options.threshold;
        if (!threshold)
            return;
        const failedThresholds = [];
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
    getRelativePath(filePath) {
        try {
            const cwd = process.cwd();
            if (filePath.startsWith(cwd) && this.fileAdapter) {
                return this.fileAdapter.normalize(this.fileAdapter.join(filePath.replace(cwd, '')));
            }
        }
        catch {
            // Browser environment
        }
        return filePath;
    }
    getBaseName(filePath) {
        if (this.fileAdapter) {
            const ext = this.fileAdapter.extname(filePath);
            if (ext) {
                return filePath.slice(0, -ext.length - 1);
            }
        }
        const parts = filePath.split('/');
        return parts[parts.length - 1];
    }
};
exports.CoverageReporter = KarmaCoverageReporter;
exports.KarmaCoverageReporter = KarmaCoverageReporter;
exports.KarmaCoverageReporter = exports.CoverageReporter = KarmaCoverageReporter = tslib_1.__decorate([
    (0, ioc_1.Injectable)(),
    tslib_1.__param(0, (0, ioc_1.Inject)()),
    tslib_1.__param(1, (0, ioc_1.Inject)()),
    tslib_1.__param(2, (0, ioc_1.Optional)()),
    tslib_1.__param(3, (0, ioc_1.Optional)()),
    tslib_1.__metadata("design:paramtypes", [core_1.HrtimeFormatter,
        ioc_1.Injector,
        common_1.FileAdapter, Object])
], KarmaCoverageReporter);
//# sourceMappingURL=coverage.js.map