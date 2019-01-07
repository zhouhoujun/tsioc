import { Token } from '@ts-ioc/core';
import { ISuiteDescribe } from './ITestReport';

/**
 * reportor.
 *
 * @export
 * @abstract
 * @class Reporter
 */
export abstract class Reporter {
    constructor() {

    }

    abstract render(suites: Map<Token<any>, ISuiteDescribe>): Promise<void>;
}
