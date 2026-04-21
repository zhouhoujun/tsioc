import { CoverageCollector, CoverageSummary, FileCoverageData, UnitTestConfigure } from '@tsdi/unit';
export declare class V8CoverageCollector extends CoverageCollector {
    private fileCoverages;
    private options;
    private coverageDir;
    private rootPath;
    constructor(config?: UnitTestConfigure);
    collect(): Promise<void>;
    private readCoverageFiles;
    private processCoverage;
    private processScript;
    private findLineAtOffset;
    private calculateSummary;
    private matchesPatterns;
    private getRelativePath;
    private matchGlob;
    private globToRegex;
    private globPartToRegex;
    getSummary(): CoverageSummary;
    getFileCoverage(filePath: string): FileCoverageData | undefined;
    getAllFileCoverages(): Map<string, FileCoverageData>;
    isEnabled(): boolean;
    clear(): void;
}
