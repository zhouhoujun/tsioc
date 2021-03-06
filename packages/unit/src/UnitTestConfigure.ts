import { Type } from '@tsdi/ioc';
import { BootOption, Configure } from '@tsdi/boot';
import { ITestReport } from './reports/ITestReport';

/**
 * unit test options.
 *
 * @export
 * @interface UnitTestOptions
 * @extends {BootOption}
 */
export interface UnitTestOptions extends BootOption {
    configures?: (string | UnitTestConfigure)[];
}

/**
 * unit test configure.
 *
 * @export
 * @interface UnitTestConfigure
 * @extends {AppConfigure}
 */
export interface UnitTestConfigure extends Configure {
    /**
     * test source
     *
     * @type {(string | Type | (string | Type)[])}
     * @memberof UnitTestConfigure
     */
    src?: string | Type | (string | Type)[];
    /**
     * resports.
     *
     * @type {Token<ITestReport>[]}
     * @memberof UnitTestConfigure
     */
    reporters?: Type<ITestReport>[];
}

