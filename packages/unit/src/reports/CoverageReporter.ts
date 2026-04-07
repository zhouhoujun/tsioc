import { Token, Abstract } from '@tsdi/ioc';
import { SuiteDescribe, ICaseDescribe } from './interface';
import { CoverageOptions } from '../UnitTestConfigure';

export const COVERAGE_REPORTER = token<CoverageReporter>('COVERAGE_REPORTER');

function token<T>(name: string) {
    return { toString: () => name } as Token<T>;
}

export interface CoverageReporter {
    setOptions(options: CoverageOptions): void;
    render(suites: Map<Token, SuiteDescribe>): Promise<void>;
    track(error: Error): void;
    renderSuite?(desc: SuiteDescribe): void;
    renderCase?(desc: ICaseDescribe): void;
}