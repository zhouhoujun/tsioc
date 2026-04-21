"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserCoverageCollector = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const unit_1 = require("@tsdi/unit");
let BrowserCoverageCollector = class BrowserCoverageCollector extends unit_1.CoverageCollector {
    constructor() {
        super();
        this.fileCoverages = new Map();
        this.options = {};
        this.globalVar = '__coverage__';
    }
    setOptions(options) {
        this.options = options || {};
        this.globalVar = this.options.global || '__coverage__';
    }
    async collect() {
        this.fileCoverages.clear();
        const coverageData = this.getCoverageFromWindow();
        if (!coverageData) {
            console.log('\nWarning: No coverage data found. Make sure code is instrumented with Istanbul.');
            return;
        }
        this.processCoverageData(coverageData);
    }
    getCoverageFromWindow() {
        if (typeof window === 'undefined') {
            return null;
        }
        const coverage = window[this.globalVar];
        if (!coverage) {
            return null;
        }
        return Object.values(coverage);
    }
    processCoverageData(coverageData) {
        const includePatterns = this.options.include || ['**/*.ts', '**/*.js'];
        const excludePatterns = this.options.exclude || ['**/test/**', '**/*.spec.ts', '**/*.test.ts', '**/node_modules/**'];
        for (const cov of coverageData) {
            if (!cov.path)
                continue;
            if (!this.matchesPatterns(cov.path, includePatterns, excludePatterns)) {
                continue;
            }
            const fileCov = this.processFileCoverage(cov);
            if (fileCov) {
                this.fileCoverages.set(cov.path, fileCov);
            }
        }
    }
    processFileCoverage(cov) {
        const lines = new Map();
        const statements = new Map();
        const functions = new Map();
        const branches = new Map();
        for (const [key, loc] of Object.entries(cov.statementMap)) {
            const count = cov.s[key] || 0;
            statements.set(parseInt(key), count);
            const startLine = loc.start.line;
            const endLine = loc.end.line;
            for (let line = startLine; line <= endLine; line++) {
                if (!lines.has(line) || lines.get(line) < count) {
                    lines.set(line, count);
                }
            }
        }
        for (const [key, fnInfo] of Object.entries(cov.fnMap)) {
            const count = cov.f[key] || 0;
            functions.set(fnInfo.line, count);
        }
        for (const [key, branchInfo] of Object.entries(cov.branchMap)) {
            const counts = cov.b[key] || [];
            const branchLine = branchInfo.locations[0]?.start.line || 0;
            const covered = counts.some(c => c > 0) ? 1 : 0;
            branches.set(branchLine, covered);
        }
        return {
            path: cov.path,
            lines,
            statements,
            functions,
            branches,
            summary: this.calculateSummary(lines, statements, functions, branches)
        };
    }
    calculateSummary(lines, statements, functions, branches) {
        const pct = (covered, total) => total > 0 ? (covered / total) * 100 : 100;
        const linesCovered = Array.from(lines.values()).filter(c => c > 0).length;
        const statementsCovered = Array.from(statements.values()).filter(c => c > 0).length;
        const functionsCovered = Array.from(functions.values()).filter(c => c > 0).length;
        const branchesCovered = Array.from(branches.values()).filter(c => c > 0).length;
        return {
            lines: { total: lines.size, covered: linesCovered, percentage: pct(linesCovered, lines.size) },
            statements: { total: statements.size, covered: statementsCovered, percentage: pct(statementsCovered, statements.size) },
            functions: { total: functions.size, covered: functionsCovered, percentage: pct(functionsCovered, functions.size) },
            branches: { total: branches.size, covered: branchesCovered, percentage: pct(branchesCovered, branches.size) }
        };
    }
    matchesPatterns(filePath, include, exclude) {
        for (const pattern of exclude) {
            if (this.matchGlob(filePath, pattern))
                return false;
        }
        for (const pattern of include) {
            if (this.matchGlob(filePath, pattern))
                return true;
        }
        return false;
    }
    matchGlob(filePath, pattern) {
        const regex = this.globToRegex(pattern);
        return new RegExp(regex, 'i').test(filePath);
    }
    globToRegex(pattern) {
        const parts = pattern.split('**/');
        let regex = '';
        for (let i = 0; i < parts.length; i++) {
            if (i > 0) {
                regex += '(?:[^/]+/)*';
            }
            regex += this.globPartToRegex(parts[i]);
        }
        return regex + '$';
    }
    globPartToRegex(part) {
        let regex = '';
        for (let i = 0; i < part.length; i++) {
            const ch = part[i];
            if (ch === '*') {
                regex += '[^/]*';
            }
            else if (ch === '?') {
                regex += '[^/]';
            }
            else if (ch === '.') {
                regex += '\\.';
            }
            else {
                regex += ch;
            }
        }
        return regex;
    }
    getSummary() {
        let totalLines = 0, coveredLines = 0;
        let totalStatements = 0, coveredStatements = 0;
        let totalFunctions = 0, coveredFunctions = 0;
        let totalBranches = 0, coveredBranches = 0;
        this.fileCoverages.forEach(file => {
            totalLines += file.summary.lines.total;
            coveredLines += file.summary.lines.covered;
            totalStatements += file.summary.statements.total;
            coveredStatements += file.summary.statements.covered;
            totalFunctions += file.summary.functions.total;
            coveredFunctions += file.summary.functions.covered;
            totalBranches += file.summary.branches.total;
            coveredBranches += file.summary.branches.covered;
        });
        const pct = (covered, total) => total > 0 ? (covered / total) * 100 : 100;
        return {
            lines: { total: totalLines, covered: coveredLines, percentage: pct(coveredLines, totalLines) },
            statements: { total: totalStatements, covered: coveredStatements, percentage: pct(coveredStatements, totalStatements) },
            functions: { total: totalFunctions, covered: coveredFunctions, percentage: pct(coveredFunctions, totalFunctions) },
            branches: { total: totalBranches, covered: coveredBranches, percentage: pct(coveredBranches, totalBranches) }
        };
    }
    getFileCoverage(filePath) {
        return this.fileCoverages.get(filePath);
    }
    getAllFileCoverages() {
        return this.fileCoverages;
    }
    isEnabled() {
        return this.options?.enabled ?? false;
    }
    clear() {
        this.fileCoverages.clear();
    }
    getCoverageData() {
        if (typeof window === 'undefined') {
            return null;
        }
        return window[this.globalVar] ? Object.values(window[this.globalVar]) : null;
    }
    serializeCoverage() {
        const coverage = this.getCoverageDataFromWindow();
        if (!coverage)
            return '{}';
        return JSON.stringify(coverage);
    }
    hasCoverage() {
        return this.fileCoverages.size > 0;
    }
    getCoverageDataFromWindow() {
        if (typeof window === 'undefined') {
            return null;
        }
        const coverage = window[this.globalVar];
        return coverage ? Object.values(coverage) : null;
    }
};
exports.BrowserCoverageCollector = BrowserCoverageCollector;
exports.BrowserCoverageCollector = BrowserCoverageCollector = tslib_1.__decorate([
    (0, ioc_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [])
], BrowserCoverageCollector);
//# sourceMappingURL=BrowserCoverageCollector.js.map