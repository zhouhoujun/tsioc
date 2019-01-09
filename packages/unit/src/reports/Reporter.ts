import { Token, lang, isClass, hasOwnClassMetadata, Type } from '@ts-ioc/core';
import { ISuiteDescribe } from './ITestReport';
import { Report } from '../decorators/Report';


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


/**
 * is target reporter.
 *
 * @export
 * @param {*} target
 * @returns
 */
export function isReporterClass(target: any): target is Type<Reporter> {
    return isClass(target) && hasOwnClassMetadata(Report, target) && lang.isExtendsClass(target, Reporter);
}
