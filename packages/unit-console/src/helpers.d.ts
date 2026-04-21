import { Type } from '@tsdi/ioc';
import { CoverageReporterType } from '@tsdi/unit';
export interface TestRunnerConfig {
    baseURL: string;
    testSrc?: string;
    coverageReporters?: CoverageReporterType[];
    coverageOutputDir?: string;
    include?: string[];
    exclude?: string[];
}
export declare function createTestConfig(baseURL: string): {
    baseURL: string;
    coverage: {
        enabled: boolean;
        reporters: CoverageReporterType[];
        include: string[];
        exclude: string[];
    } | undefined;
    hasCoverage: boolean;
};
export declare function getReporters(defaultReporter: Type, coverageReporter: Type, hasCoverage: boolean): Type[];
