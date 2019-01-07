import { Type, Token } from '@ts-ioc/core';


/**
 * test case.
 *
 * @export
 * @interface ITestCase
 */
export interface ICaseDescribe {
    title: string;
    key: string;
    order?: number;
    timeout?: number;
    error?: Error;
    start?: number;
    end?: number;
}

/**
 * suite.
 *
 * @export
 * @interface ISuite
 */
export interface ISuiteDescribe {
    describe: string;
    cases: ICaseDescribe[];
    timeout?: number;
    start?: number;
    end?: number;
}

/**
 * report
 *
 * @export
 * @interface ITestReport
 */
export interface ITestReport {
    suites: Map<Token<any>, ISuiteDescribe>;
    addSuite(suit: Token<any>, describe: ISuiteDescribe);
    getSuite(suit: Token<any>): ISuiteDescribe;
    addCase(suit: Token<any>, testCase: ICaseDescribe);
    getCase(suit: Token<any>, test: string): ICaseDescribe;
    report(): Promise<void>;
}
