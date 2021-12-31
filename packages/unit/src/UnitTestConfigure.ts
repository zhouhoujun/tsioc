import { Type } from '@tsdi/ioc';
import { ApplicationConfiguration } from '@tsdi/core';
import { TestReport } from './reports/interface';

/**
 * unit test options.
 *
 * @export
 * @interface UnitTestOptions
 * @extends {BootOption}
 */
export interface UnitTestOptions {
    configures?: (string | UnitTestConfigure)[];
}

/**
 * unit test configure.
 *
 * @export
 * @interface UnitTestConfigure
 * @extends {AppConfigure}
 */
export interface UnitTestConfigure extends ApplicationConfiguration {
    /**
     * test source
     *
     * @type {(string | Type | (string | Type)[])}
     */
    src?: string | Type | (string | Type)[];
    /**
     * resports.
     *
     * @type {Token<TestReport>[]}
     */
    reporters?: Type<TestReport>[];
}

