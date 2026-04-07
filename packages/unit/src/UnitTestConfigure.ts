import { AbstractType } from '@tsdi/ioc';
import { TestReport } from './reports/interface';

export type CoverageReporterType = 'text' | 'text-summary' | 'json' | 'html' | 'lcov' | 'cobertura';

export interface CoverageOptions {
    enabled?: boolean;
    reporters?: CoverageReporterType[];
    include?: string[];
    exclude?: string[];
    outputDir?: string;
    threshold?: {
        lines?: number;
        functions?: number;
        branches?: number;
        statements?: number;
    };
}

export type TestEnvironment = 'node' | 'browser' | 'auto';

export interface UnitTestOptions {
    configures?: (string | UnitTestConfigure)[];
}

export interface UnitTestConfigure {
    baseURL?: string;
    src?: string | AbstractType | (string | AbstractType)[];
    reporters?: AbstractType<TestReport>[];
    coverage?: CoverageOptions;
    env?: TestEnvironment;
}

