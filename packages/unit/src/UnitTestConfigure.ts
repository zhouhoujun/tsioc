import { AbstractType, ProvdierOf } from '@tsdi/ioc';
import { TestReport } from './reports/interface';
import { EnvironmentOption } from '@tsdi/core';

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

export interface UnitTestOptions {
    configures?: (string | UnitTestConfigure)[];
}

export interface UnitTestConfigure extends EnvironmentOption {
    baseURL?: string;
    src?: string | AbstractType | (string | AbstractType)[];
    reporters?: ProvdierOf<TestReport>[];
    coverage?: CoverageOptions;
}

