import { BootOptions, RunnableConfigure } from '@ts-ioc/boot';
import { Type } from '@ts-ioc/ioc';
import { ITestReport } from './reports';

/**
 * unit test options.
 *
 * @export
 * @interface UnitTestOptions
 * @extends {RunOptions<any>}
 */
export interface UnitTestOptions extends BootOptions {
    report?: boolean;
    configures?: (string | UnitTestConfigure)[];
}

/**
 * unit test configure.
 *
 * @export
 * @interface UnitTestConfigure
 * @extends {AppConfigure}
 */
export interface UnitTestConfigure extends RunnableConfigure {
    /**
     * test source
     *
     * @type {(string | Type<any> | (string | Type<any>)[])}
     * @memberof UnitTestConfigure
     */
    src?: string | Type<any> | (string | Type<any>)[];
    /**
     * resports.
     *
     * @type {Token<ITestReport>[]}
     * @memberof UnitTestConfigure
     */
    reporters?: Type<ITestReport>[];
}

