import { CoverageCollector, CoverageSummary, FileCoverageData } from '@tsdi/unit';
export interface IstanbulCoverage {
    path: string;
    s: {
        [key: string]: number;
    };
    b: {
        [key: string]: number[];
    };
    f: {
        [key: string]: number;
    };
    fnMap: {
        [key: string]: {
            name: string;
            line: number;
            loc: {
                start: {
                    line: number;
                    column: number;
                };
                end: {
                    line: number;
                    column: number;
                };
            };
        };
    };
    statementMap: {
        [key: string]: {
            start: {
                line: number;
                column: number;
            };
            end: {
                line: number;
                column: number;
            };
        };
    };
    branchMap: {
        [key: string]: {
            loc: {
                start: {
                    line: number;
                    column: number;
                };
                end: {
                    line: number;
                    column: number;
                };
            };
            type: string;
            locations: {
                start: {
                    line: number;
                    column: number;
                };
                end: {
                    line: number;
                    column: number;
                };
            }[];
        };
    };
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
export declare class BrowserCoverageCollector extends CoverageCollector {
    private fileCoverages;
    private options;
    private globalVar;
    constructor();
    setOptions(options: BrowserCoverageOptions): void;
    collect(): Promise<void>;
    private getCoverageFromWindow;
    private processCoverageData;
    private processFileCoverage;
    private calculateSummary;
    private matchesPatterns;
    private matchGlob;
    private globToRegex;
    private globPartToRegex;
    getSummary(): CoverageSummary;
    getFileCoverage(filePath: string): FileCoverageData | undefined;
    getAllFileCoverages(): Map<string, FileCoverageData>;
    isEnabled(): boolean;
    clear(): void;
    getCoverageData(): IstanbulCoverage[] | null;
    serializeCoverage(): string;
    hasCoverage(): boolean;
    private getCoverageDataFromWindow;
}
