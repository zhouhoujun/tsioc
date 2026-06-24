import { Injectable, Inject, Optional } from '@tsdi/ioc';
import { CoverageCollector, CoverageSummary, FileCoverageData, UNITTESTCONFIGURE, UnitTestConfigure, CoverageOptions } from '@tsdi/unit';
import * as path from 'path';
import * as fs from 'fs';
import * as v8 from 'v8';

interface V8CoverageScript {
    scriptId: string;
    url: string;
    functions: Array<{
        functionName: string;
        ranges: Array<{ startOffset: number; endOffset: number; count: number }>;
        isBlockCoverage: boolean;
    }>;
    source?: string;
}

interface V8CoverageResult {
    result: V8CoverageScript[];
}

interface V8CoverageRange {
    startOffset: number;
    endOffset: number;
    count: number;
}

@Injectable()
export class V8CoverageCollector extends CoverageCollector {
    private fileCoverages: Map<string, FileCoverageData> = new Map();
    private options: CoverageOptions;
    private coverageDir: string;
    private rootPath: string;

    constructor(@Optional() @Inject(UNITTESTCONFIGURE) config?: UnitTestConfigure) {
        super();
        this.options = config?.coverage || {};
        this.coverageDir = this.options.outputDir || path.join(process.cwd(), '.nyc_output');
        this.rootPath = config?.baseURL || process.cwd();
    }

    async collect(): Promise<void> {
        if (typeof (v8 as any).takeCoverage === 'function') {
            try {
                (v8 as any).takeCoverage();
            } catch (e) {}
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        await this.readCoverageFiles();
    }

    private async readCoverageFiles(): Promise<void> {
        if (!fs.existsSync(this.coverageDir)) return;

        const files = fs.readdirSync(this.coverageDir);
        const coverageFiles = files.filter(f => f.endsWith('.json'));

        for (const file of coverageFiles) {
            try {
                const content = fs.readFileSync(path.join(this.coverageDir, file), 'utf-8');
                const v8Result = JSON.parse(content) as V8CoverageResult;
                this.processCoverage(v8Result);
            } catch (e) {}
        }
    }

    private processCoverage(v8Result: V8CoverageResult): void {
        if (!v8Result?.result) return;

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
                const previous = this.fileCoverages.get(filePath);
                this.fileCoverages.set(filePath, previous ? this.mergeFileCoverage(previous, fileCov) : fileCov);
            }
        }
    }

    private processScript(script: V8CoverageScript, source: string, filePath: string): FileCoverageData {
        const lines = new Map<number, number>();
        const statements = new Map<number, number>();
        const functions = new Map<number, number>();
        const branches = new Map<number, number>();

        const sourceLines = source.split('\n');
        const lineOffsets: number[] = [];
        let offset = 0;
        for (const line of sourceLines) {
            lineOffsets.push(offset);
            offset += line.length + 1;
        }

        for (let i = 1; i <= sourceLines.length; i++) {
            lines.set(i, 0);
        }

        this.applyLineCoverage(lines, script.functions, lineOffsets, sourceLines, source);

        for (const func of script.functions) {
            const rootRange = func.ranges[0];
            const isTopLevelWrapper = this.isTopLevelWrapper(func, source.length);
            const funcStartLine = this.findLineAtOffset(rootRange?.startOffset || 0, lineOffsets);
            if (!isTopLevelWrapper && funcStartLine > 0) {
                const funcCovered = func.ranges.some(r => r.count > 0);
                functions.set(funcStartLine, Math.max(functions.get(funcStartLine) ?? 0, funcCovered ? 1 : 0));
            }

            for (let index = 0; index < func.ranges.length; index++) {
                const range = func.ranges[index];
                const startLine = this.findLineAtOffset(range.startOffset, lineOffsets);

                if (startLine > 0 && !(isTopLevelWrapper && index === 0)) {
                    statements.set(startLine, Math.max(statements.get(startLine) ?? 0, range.count));
                }

                if (func.isBlockCoverage && index > 0) {
                    const branchLine = this.findLineAtOffset(range.startOffset, lineOffsets);
                    if (branchLine > 0) {
                        branches.set(branchLine, Math.max(branches.get(branchLine) ?? 0, range.count > 0 ? 1 : 0));
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

    private findLineAtOffset(offset: number, lineOffsets: number[]): number {
        for (let i = lineOffsets.length - 1; i >= 0; i--) {
            if (lineOffsets[i] <= offset) {
                return i + 1;
            }
        }
        return 0;
    }

    private applyLineCoverage(
        lines: Map<number, number>,
        scriptFunctions: V8CoverageScript['functions'],
        lineOffsets: number[],
        sourceLines: string[],
        source: string
    ): void {
        const sourceLength = source.length;
        const ranges = scriptFunctions
            .flatMap(func => func.ranges)
            .filter(range => range.endOffset > range.startOffset)
            .map(range => ({
                startOffset: Math.max(0, range.startOffset),
                endOffset: Math.min(sourceLength, range.endOffset),
                count: range.count
            }));

        const boundaries = new Set<number>([0, sourceLength]);
        ranges.forEach(range => {
            boundaries.add(range.startOffset);
            boundaries.add(range.endOffset);
        });

        const ordered = Array.from(boundaries).sort((a, b) => a - b);
        for (let lineIndex = 0; lineIndex < sourceLines.length; lineIndex++) {
            const lineStart = lineOffsets[lineIndex];
            const lineEnd = lineStart + sourceLines[lineIndex].length;
            if (lineEnd <= lineStart) {
                continue;
            }

            const lineBoundaries = ordered.filter(point => point >= lineStart && point <= lineEnd);
            if (lineBoundaries[0] !== lineStart) {
                lineBoundaries.unshift(lineStart);
            }
            if (lineBoundaries[lineBoundaries.length - 1] !== lineEnd) {
                lineBoundaries.push(lineEnd);
            }

            let covered = 0;
            for (let boundaryIndex = 0; boundaryIndex < lineBoundaries.length - 1; boundaryIndex++) {
                const startOffset = lineBoundaries[boundaryIndex];
                const endOffset = lineBoundaries[boundaryIndex + 1];
                if (endOffset <= startOffset) {
                    continue;
                }
                if (!/\S/.test(source.slice(startOffset, endOffset))) {
                    continue;
                }
                const effectiveRange = this.resolveEffectiveRange(ranges, startOffset, endOffset);
                if (effectiveRange?.count) {
                    covered = Math.max(covered, effectiveRange.count);
                }
            }
            lines.set(lineIndex + 1, covered);
        }
    }

    private resolveEffectiveRange(ranges: V8CoverageRange[], startOffset: number, endOffset: number): V8CoverageRange | null {
        let selected: V8CoverageRange | null = null;

        for (const range of ranges) {
            if (range.startOffset > startOffset || range.endOffset < endOffset) {
                continue;
            }

            if (!selected) {
                selected = range;
                continue;
            }

            const rangeWidth = range.endOffset - range.startOffset;
            const selectedWidth = selected.endOffset - selected.startOffset;
            if (rangeWidth < selectedWidth) {
                selected = range;
            }
        }

        return selected;
    }

    private isTopLevelWrapper(func: V8CoverageScript['functions'][number], sourceLength: number): boolean {
        const rootRange = func.ranges[0];
        return !!rootRange
            && func.functionName === ''
            && rootRange.startOffset === 0
            && rootRange.endOffset >= sourceLength;
    }

    private calculateSummary(
        lines: Map<number, number>,
        statements: Map<number, number>,
        functions: Map<number, number>,
        branches: Map<number, number>
    ): CoverageSummary {
        const pct = (covered: number, total: number): number => total > 0 ? (covered / total) * 100 : 100;

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

    private mergeFileCoverage(previous: FileCoverageData, next: FileCoverageData): FileCoverageData {
        const lines = this.mergeCoverageMap(previous.lines, next.lines);
        const statements = this.mergeCoverageMap(previous.statements, next.statements);
        const functions = this.mergeCoverageMap(previous.functions, next.functions);
        const branches = this.mergeCoverageMap(previous.branches, next.branches);

        return {
            path: next.path,
            lines,
            statements,
            functions,
            branches,
            summary: this.calculateSummary(lines, statements, functions, branches)
        };
    }

    private mergeCoverageMap(previous: Map<number, number>, next: Map<number, number>): Map<number, number> {
        const merged = new Map<number, number>(previous);
        next.forEach((count, key) => {
            merged.set(key, Math.max(merged.get(key) ?? 0, count));
        });
        return merged;
    }

    private matchesPatterns(filePath: string, include: string[], exclude: string[]): boolean {
        const relativePath = this.getRelativePath(filePath);

        for (const pattern of exclude) {
            if (this.matchGlob(relativePath, pattern)) return false;
        }

        for (const pattern of include) {
            if (this.matchGlob(relativePath, pattern)) return true;
        }

        return false;
    }

    private getRelativePath(filePath: string): string {
        const normalized = path.normalize(filePath);
        if (normalized.startsWith(this.rootPath)) {
            return normalized.substring(this.rootPath.length).replace(/^[/\\]/, '');
        }
        return normalized;
    }

    private matchGlob(filePath: string, pattern: string): boolean {
        const regex = this.globToRegex(pattern);
        return new RegExp(regex, 'i').test(filePath);
    }

    private globToRegex(pattern: string): string {
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
    
    private globPartToRegex(part: string): string {
        let regex = '';
        for (let i = 0; i < part.length; i++) {
            const ch = part[i];
            if (ch === '*') {
                regex += '[^/]*';
            } else if (ch === '?') {
                regex += '[^/]';
            } else if (ch === '.') {
                regex += '\\.';
            } else {
                regex += ch;
            }
        }
        return regex;
    }

    getSummary(): CoverageSummary {
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

        const pct = (covered: number, total: number): number => total > 0 ? (covered / total) * 100 : 100;

        return {
            lines: { total: totalLines, covered: coveredLines, percentage: pct(coveredLines, totalLines) },
            statements: { total: totalStatements, covered: coveredStatements, percentage: pct(coveredStatements, totalStatements) },
            functions: { total: totalFunctions, covered: coveredFunctions, percentage: pct(coveredFunctions, totalFunctions) },
            branches: { total: totalBranches, covered: coveredBranches, percentage: pct(coveredBranches, totalBranches) }
        };
    }

    getFileCoverage(filePath: string): FileCoverageData | undefined {
        return this.fileCoverages.get(filePath);
    }

    getAllFileCoverages(): Map<string, FileCoverageData> {
        return this.fileCoverages;
    }

    isEnabled(): boolean {
        return this.options?.enabled ?? false;
    }

    clear(): void {
        this.fileCoverages.clear();
    }
}
