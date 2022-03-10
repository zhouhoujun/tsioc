import { Type } from '@tsdi/ioc';
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
export interface UnitTestConfigure {
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

