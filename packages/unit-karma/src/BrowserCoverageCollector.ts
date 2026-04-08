import { Injectable } from '@tsdi/ioc';
import { CoverageCollector, CoverageSummary, FileCoverageData } from '@tsdi/unit';

declare const window: any;

export interface IstanbulCoverage {
    path: string;
    s: { [key: string]: number };
    b: { [key: string]: number[] };
    f: { [key: string]: number };
    fnMap: { [key: string]: { name: string; line: number; loc: { start: { line: number; column: number }; end: { line: number; column: number } } } };
    statementMap: { [key: string]: { start: { line: number; column: number }; end: { line: number; column: number } } };
    branchMap: { [key: string]: { loc: { start: { line: number; column: number }; end: { line: number; column: number } }; type: string; locations: { start: { line: number; column: number }; end: { line: number; column: number } }[] } };
}

export interface BrowserCoverageOptions {
    enabled?: boolean;
    reporters?: Array<'text' | 'text-summary' | 'json' | 'html' | 'lcov' | 'cobertura'>;
    include?: string[];
    exclude?: string[];
    outputDir?: string;
    threshold?: {
        lines?: number;
        functions?: number;
        branches?: number;
        statements?: number;
    };
    global?: string;
}

@Injectable()
export class BrowserCoverageCollector extends CoverageCollector {
    private fileCoverages: Map<string, FileCoverageData> = new Map();
    private options: BrowserCoverageOptions;
    private globalVar: string;

    constructor() {
        super();
        this.options = {};
        this.globalVar = '__coverage__';
    }

    setOptions(options: BrowserCoverageOptions): void {
        this.options = options || {};
        this.globalVar = this.options.global || '__coverage__';
    }

    async collect(): Promise<void> {
        this.fileCoverages.clear();

        const coverageData = this.getCoverageFromWindow();
        if (!coverageData) {
            console.log('\nWarning: No coverage data found. Make sure code is instrumented with Istanbul.');
            return;
        }

        this.processCoverageData(coverageData);
    }

    private getCoverageFromWindow(): IstanbulCoverage[] | null {
        if (typeof window === 'undefined') {
            return null;
        }

        const coverage = window[this.globalVar];
        if (!coverage) {
            return null;
        }

        return Object.values(coverage);
    }

    private processCoverageData(coverageData: IstanbulCoverage[]): void {
        const includePatterns = this.options.include || ['**/*.ts', '**/*.js'];
        const excludePatterns = this.options.exclude || ['**/test/**', '**/*.spec.ts', '**/*.test.ts', '**/node_modules/**'];

        for (const cov of coverageData) {
            if (!cov.path) continue;

            if (!this.matchesPatterns(cov.path, includePatterns, excludePatterns)) {
                continue;
            }

            const fileCov = this.processFileCoverage(cov);
            if (fileCov) {
                this.fileCoverages.set(cov.path, fileCov);
            }
        }
    }

    private processFileCoverage(cov: IstanbulCoverage): FileCoverageData {
        const lines = new Map<number, number>();
        const statements = new Map<number, number>();
        const functions = new Map<number, number>();
        const branches = new Map<number, number>();

        for (const [key, loc] of Object.entries(cov.statementMap)) {
            const count = cov.s[key] || 0;
            statements.set(parseInt(key), count);

            const startLine = loc.start.line;
            const endLine = loc.end.line;
            for (let line = startLine; line <= endLine; line++) {
                if (!lines.has(line) || lines.get(line)! < count) {
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

    private matchesPatterns(filePath: string, include: string[], exclude: string[]): boolean {
        for (const pattern of exclude) {
            if (this.matchGlob(filePath, pattern)) return false;
        }

        for (const pattern of include) {
            if (this.matchGlob(filePath, pattern)) return true;
        }

        return false;
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

    getCoverageData(): IstanbulCoverage[] | null {
        if (typeof window === 'undefined') {
            return null;
        }
        return window[this.globalVar] ? Object.values(window[this.globalVar]) : null;
    }

    serializeCoverage(): string {
        const coverage = this.getCoverageDataFromWindow();
        if (!coverage) return '{}';
        return JSON.stringify(coverage);
    }

    hasCoverage(): boolean {
        return this.fileCoverages.size > 0;
    }

    private getCoverageDataFromWindow(): IstanbulCoverage[] | null {
        if (typeof window === 'undefined') {
            return null;
        }
        const coverage = window[this.globalVar];
        return coverage ? Object.values(coverage) : null;
    }
}
