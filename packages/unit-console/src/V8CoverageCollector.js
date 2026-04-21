"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V8CoverageCollector = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const unit_1 = require("@tsdi/unit");
const path = require("path");
const fs = require("fs");
const v8 = require("v8");
let V8CoverageCollector = class V8CoverageCollector extends unit_1.CoverageCollector {
    constructor(config) {
        super();
        this.fileCoverages = new Map();
        this.options = config?.coverage || {};
        this.coverageDir = this.options.outputDir || path.join(process.cwd(), '.nyc_output');
        this.rootPath = config?.baseURL || process.cwd();
    }
    async collect() {
        if (typeof v8.takeCoverage === 'function') {
            try {
                v8.takeCoverage();
            }
            catch (e) { }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        await this.readCoverageFiles();
    }
    async readCoverageFiles() {
        if (!fs.existsSync(this.coverageDir))
            return;
        const files = fs.readdirSync(this.coverageDir);
        const coverageFiles = files.filter(f => f.endsWith('.json'));
        for (const file of coverageFiles) {
            try {
                const content = fs.readFileSync(path.join(this.coverageDir, file), 'utf-8');
                const v8Result = JSON.parse(content);
                this.processCoverage(v8Result);
            }
            catch (e) { }
        }
    }
    processCoverage(v8Result) {
        if (!v8Result?.result)
            return;
        const includePatterns = this.options.include || ['**/src/**/*.ts', '**/src/**/*.js'];
        const excludePatterns = this.options.exclude || ['**/test/**', '**/*.spec.ts', '**/*.test.ts', '**/node_modules/**'];
        for (const script of v8Result.result) {
            if (!script.url || script.url.startsWith('node:') || script.url.includes('node_modules')) {
                continue;
            }
            let filePath = script.url;
            if (filePath.startsWith('file://')) {
                filePath = decodeURIComponent(filePath.replace('file://', ''));
            }
            if (!this.matchesPatterns(filePath, includePatterns, excludePatterns)) {
                continue;
            }
            if (!fs.existsSync(filePath)) {
                continue;
            }
            const source = fs.readFileSync(filePath, 'utf-8');
            const fileCov = this.processScript(script, source, filePath);
            if (fileCov) {
                this.fileCoverages.set(filePath, fileCov);
            }
        }
    }
    processScript(script, source, filePath) {
        const lines = new Map();
        const statements = new Map();
        const functions = new Map();
        const branches = new Map();
        const sourceLines = source.split('\n');
        const lineOffsets = [];
        let offset = 0;
        for (const line of sourceLines) {
            lineOffsets.push(offset);
            offset += line.length + 1;
        }
        for (let i = 1; i <= sourceLines.length; i++) {
            lines.set(i, 0);
        }
        for (const func of script.functions) {
            const funcStartLine = this.findLineAtOffset(func.ranges[0]?.startOffset || 0, lineOffsets);
            if (funcStartLine > 0) {
                const funcCovered = func.ranges.some(r => r.count > 0);
                functions.set(funcStartLine, funcCovered ? 1 : 0);
            }
            for (const range of func.ranges) {
                const startLine = this.findLineAtOffset(range.startOffset, lineOffsets);
                const endLine = this.findLineAtOffset(range.endOffset - 1, lineOffsets);
                for (let line = startLine; line <= endLine && line > 0; line++) {
                    if (range.count > 0) {
                        lines.set(line, Math.max(lines.get(line) || 0, range.count));
                    }
                }
                if (startLine > 0) {
                    statements.set(startLine, range.count);
                }
                if (func.isBlockCoverage && func.ranges.length > 1) {
                    const branchLine = this.findLineAtOffset(range.startOffset, lineOffsets);
                    if (branchLine > 0) {
                        branches.set(branchLine, range.count > 0 ? 1 : 0);
                    }
                }
            }
        }
        return {
            path: filePath,
            lines,
            statements,
            functions,
            branches,
            summary: this.calculateSummary(lines, statements, functions, branches)
        };
    }
    findLineAtOffset(offset, lineOffsets) {
        for (let i = lineOffsets.length - 1; i >= 0; i--) {
            if (lineOffsets[i] <= offset) {
                return i + 1;
            }
        }
        return 0;
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
        const relativePath = this.getRelativePath(filePath);
        for (const pattern of exclude) {
            if (this.matchGlob(relativePath, pattern))
                return false;
        }
        for (const pattern of include) {
            if (this.matchGlob(relativePath, pattern))
                return true;
        }
        return false;
    }
    getRelativePath(filePath) {
        const normalized = path.normalize(filePath);
        if (normalized.startsWith(this.rootPath)) {
            return normalized.substring(this.rootPath.length).replace(/^[/\\]/, '');
        }
        return normalized;
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
};
exports.V8CoverageCollector = V8CoverageCollector;
exports.V8CoverageCollector = V8CoverageCollector = tslib_1.__decorate([
    (0, ioc_1.Injectable)(),
    tslib_1.__param(0, (0, ioc_1.Optional)()),
    tslib_1.__param(0, (0, ioc_1.Inject)(unit_1.UNITTESTCONFIGURE)),
    tslib_1.__metadata("design:paramtypes", [Object])
], V8CoverageCollector);
//# sourceMappingURL=V8CoverageCollector.js.map