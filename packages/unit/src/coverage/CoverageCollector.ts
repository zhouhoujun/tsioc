import { Abstract } from '@tsdi/ioc';

export interface CoverageSummary {
    lines: { total: number; covered: number; percentage: number };
    statements: { total: number; covered: number; percentage: number };
    functions: { total: number; covered: number; percentage: number };
    branches: { total: number; covered: number; percentage: number };
}

export interface FileCoverageData {
    path: string;
    lines: Map<number, number>;
    statements: Map<number, number>;
    functions: Map<number, number>;
    branches: Map<number, number>;
    summary: CoverageSummary;
}

@Abstract()
export abstract class CoverageCollector {
    abstract collect(): Promise<void>;
    abstract getSummary(): CoverageSummary;
    abstract getFileCoverage(filePath: string): FileCoverageData | undefined;
    abstract getAllFileCoverages(): Map<string, FileCoverageData>;
    abstract isEnabled(): boolean;
    abstract clear(): void;
}