import { AbstractType, Type } from '@tsdi/ioc';
import { CoverageReporterType } from '@tsdi/unit';

export interface TestRunnerConfig {
    baseURL: string;
    testSrc?: string;
    coverageReporters?: CoverageReporterType[];
    coverageOutputDir?: string;
    include?: string[];
    exclude?: string[];
}

export function createTestConfig(baseURL: string) {
    const args = process.argv.slice(2);
    const coverage = args.includes('--coverage') || args.includes('-c');
    
    return {
        baseURL,
        coverage: coverage ? {
            enabled: true,
            reporters: ['text', 'text-summary'] as CoverageReporterType[],
            include: ['src/**/*.ts'],
            exclude: ['test/**/*.ts']
        } : undefined,
        hasCoverage: coverage
    };
}

export function getReporters(defaultReporter: Type, coverageReporter: Type, hasCoverage: boolean): Type[] {
    return hasCoverage ? [defaultReporter, coverageReporter] : [defaultReporter];
}