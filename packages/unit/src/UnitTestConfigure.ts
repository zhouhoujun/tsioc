import { Type } from '@tsdi/ioc';
import { AnnotationMetadata, Configuration } from '@tsdi/boot';
import { ITestReport } from './reports/ITestReport';

/**
 * unit test options.
 *
 * @export
 * @interface UnitTestOptions
 * @extends {BootOption}
 */
export interface UnitTestOptions extends AnnotationMetadata {
    configures?: (string | UnitTestConfigure)[];
}

/**
 * unit test configure.
 *
 * @export
 * @interface UnitTestConfigure
 * @extends {AppConfigure}
 */
export interface UnitTestConfigure extends Configuration {
    /**
     * test source
     *
     * @type {(string | Type | (string | Type)[])}
     */
    src?: string | Type | (string | Type)[];
    /**
     * resports.
     *
     * @type {Token<ITestReport>[]}
     */
    reporters?: Type<ITestReport>[];
}

