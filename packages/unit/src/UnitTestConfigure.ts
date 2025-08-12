import { AbstractType } from '@tsdi/ioc';
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
     * base url
     */
    baseURL?: string;
    /**
     * test source
     *
     * @type {(string | AbstractType | (string | AbstractType)[])}
     */
    src?: string | AbstractType | (string | AbstractType)[];
    /**
     * resports.
     *
     * @type {Token<TestReport>[]}
     */
    reporters?: AbstractType<TestReport>[];
}

