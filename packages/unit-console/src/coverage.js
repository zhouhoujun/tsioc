"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V8CoverageReporter = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const unit_1 = require("@tsdi/unit");
const core_1 = require("@tsdi/core");
const path = require("path");
const V8CoverageCollector_1 = require("./V8CoverageCollector");
const chalk = require("chalk");
let V8CoverageReporter = class V8CoverageReporter extends unit_1.CoverageReporter {
    constructor(hrtime, injector, config) {
        super();
        this.injector = injector;
        this.config = config;
        this.coverageCollector = null;
        this.hrtime = hrtime;
    }
    get options() {
        return this.config?.coverage || {};
    }
    setOptions(options) {
        if (this.config) {
            this.config.coverage = { ...this.config.coverage, ...options };
        }
    }
    track(error) {
        console.log(chalk.red(error.stack || error.message));
        throw error;
    }
    async render(suites, total) {
        if (!this.options?.enabled) {
            return;
        }
        try {
            this.coverageCollector = this.injector.get(V8CoverageCollector_1.V8CoverageCollector);
            await this.coverageCollector.collect();
        }
        catch (e) {
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
    renderTextReport() {
        if (!this.coverageCollector)
            return;
        const summary = this.coverageCollector.getSummary();
        const fileCoverages = this.coverageCollector.getAllFileCoverages();
        const files = Array.from(fileCoverages.entries());
        const cellW = [50, 7, 7, 7, 7];
        const line = cellW.map(w => '─'.repeat(w + 2)).join('┬');
        const bd = chalk.gray.dim;
        const strip = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');
        const pad = (s, w) => s + ' '.repeat(w - strip(s).length);
        const top = bd('┌' + line + '┐');
        const mid = bd('├' + line.replace(/┬/g, '┼').split('').map((c, i, arr) => c === '┬' ? (i > 0 && i < arr.length - 1 ? '┼' : '─') : c).join('') + '┤');
        const bot = bd('└' + line.replace(/┬/g, '┴') + '┘');
        const bar = (pct) => {
            const filled = Math.round(pct / 5);
            const color = pct >= 80 ? chalk.green : pct >= 60 ? chalk.yellow : chalk.red;
            return color('█'.repeat(filled) + chalk.gray('░'.repeat(20 - filled)));
        };
        const pct = (v) => {
            const s = v.toFixed(1) + '%';
            return v >= 80 ? chalk.green(s) : v >= 60 ? chalk.yellow(s) : chalk.red(s);
        };
        const row = (cells, isHeader = false) => {
            const fn = isHeader ? (v) => chalk.bold(v) : (v) => v;
            return bd('│') + cells.map((v, i) => ' ' + pad(fn(v), cellW[i])).join(bd(' │')) + bd(' │');
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
    renderSummaryReport() {
        if (!this.coverageCollector) {
            console.log(chalk.yellow('\nNo coverage data. Run with NODE_V8_COVERAGE'));
            return;
        }
        const summary = this.coverageCollector.getSummary();
        const files = this.coverageCollector.getAllFileCoverages().size;
        const cellW = [12, 7, 7, 7, 7];
        const line = cellW.map(w => '─'.repeat(w + 2)).join('┬');
        const bd = chalk.gray.dim;
        const strip = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');
        const pad = (s, w) => s + ' '.repeat(w - strip(s).length);
        const top = bd('┌' + line + '┐');
        const mid = bd('├' + line.replace(/┬/g, '┼').split('').map((c, i, arr) => c === '┬' ? (i > 0 && i < arr.length - 1 ? '┼' : '─') : c).join('') + '┤');
        const bot = bd('└' + line.replace(/┬/g, '┴') + '┘');
        const bar = (pct) => {
            const filled = Math.round(pct / 5);
            const color = pct >= 80 ? chalk.green : pct >= 60 ? chalk.yellow : chalk.red;
            return color('█'.repeat(filled) + chalk.gray('░'.repeat(20 - filled)));
        };
        const pct = (v) => {
            const s = v.toFixed(1) + '%';
            return v >= 80 ? chalk.green(s) : v >= 60 ? chalk.yellow(s) : chalk.red(s);
        };
        const row = (cells, isHeader = false) => {
            const fn = isHeader ? (v) => chalk.bold(v) : (v) => v;
            return bd('│') + cells.map((v, i) => ' ' + pad(fn(v), cellW[i])).join(bd(' │')) + bd(' │');
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
    pctStr(pct) {
        const str = pct.toFixed(1) + '%';
        const color = this.getCoverageColor(pct);
        return color(str);
    }
    formatCoverage(data) {
        if (data.total === 0)
            return chalk.gray('N/A');
        return this.pctStr(data.percentage);
    }
    getCoverageColor(percentage) {
        return percentage >= 80 ? chalk.green : percentage >= 60 ? chalk.yellow : chalk.red;
    }
    getRelativePath(filePath) {
        const cwd = process.cwd();
        if (filePath.startsWith(cwd)) {
            return path.relative(cwd, filePath);
        }
        return filePath;
    }
    renderJsonReport() {
        if (!this.coverageCollector)
            return;
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
    async renderHtmlReport() {
        if (!this.coverageCollector)
            return;
        const summary = this.coverageCollector.getSummary();
        const outputDir = this.options?.outputDir || 'coverage';
        console.log(`\nHTML coverage report would be generated in: ${chalk.blue(outputDir + '/')}`);
        console.log(`Lines: ${this.formatCoverage(summary.lines)}`);
    }
    renderLcovReport() {
        if (!this.coverageCollector)
            return;
        const summary = this.coverageCollector.getSummary();
        const outputDir = this.options?.outputDir || 'coverage';
        console.log(`\nLCOV coverage report would be generated in: ${chalk.blue(outputDir + '/lcov.info')}`);
        console.log(`Lines: ${this.formatCoverage(summary.lines)}`);
    }
    renderCoberturaReport() {
        if (!this.coverageCollector)
            return;
        const summary = this.coverageCollector.getSummary();
        const outputDir = this.options?.outputDir || 'coverage';
        console.log(`\nCobertura XML coverage report would be generated in: ${chalk.blue(outputDir + '/cobertura.xml')}`);
        console.log(`Lines: ${this.formatCoverage(summary.lines)}`);
    }
    checkThreshold(summary) {
        const threshold = this.options.threshold;
        if (!threshold)
            return;
        const failedThresholds = [];
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
};
exports.V8CoverageReporter = V8CoverageReporter;
exports.V8CoverageReporter = V8CoverageReporter = tslib_1.__decorate([
    (0, ioc_1.Injectable)(),
    tslib_1.__param(0, (0, ioc_1.Inject)()),
    tslib_1.__param(1, (0, ioc_1.Inject)()),
    tslib_1.__param(2, (0, ioc_1.Inject)(unit_1.UNITTESTCONFIGURE)),
    tslib_1.__metadata("design:paramtypes", [core_1.HrtimeFormatter,
        ioc_1.Injector, Object])
], V8CoverageReporter);
//# sourceMappingURL=coverage.js.map