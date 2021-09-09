import { Token } from '@tsdi/ioc';


/**
 * test case.
 *
 * @export
 * @interface ITestCase
 */
export interface ICaseDescribe {
    /**
     * case title.
     *
     * @type {string}
     */
    title: string;
    /**
     * test case method name.
     *
     * @type {string}
     */
    key: string;
    /**
     * old test fn.
     *
     * @type {Function}
     */
    fn?: Function;
    /**
     * case order
     *
     * @type {number}
     */
    order?: number;
    /**
     * case test time out.
     *
     * @type {number}
     */
    timeout?: number;
    /**
     * case test throwed error.
     *
     * @type {Error}
     */
    error?: Error;
    /**
     * case start test at.
     *
     * @type {number}
     */
    start?: number;
    /**
     * case end test at.
     *
     * @type {number}
     */
    end?: number;
}

/**
 * suite hook for old unit test.
 *
 * @export
 * @interface ISuiteHook
 */
export interface ISuiteHook {
    fn: Function;
    /**
     * case test time out.
     *
     * @type {number}
     */
    timeout?: number;
}

/**
 * suite.
 *
 * @export
 * @interface ISuite
 */
export interface ISuiteDescribe {
    /**
     * suite describe.
     *
     * @type {string}
     */
    describe: string;
    /**
     * suite cases.
     *
     * @type {ICaseDescribe[]}
     */
    cases: ICaseDescribe[];
    /**
     * suite test timeout.
     *
     * @type {number}
     */
    timeout?: number;
    /**
     * suite test start time.
     *
     * @type {number}
     */
    start?: number;
    /**
     * suite test end time.
     *
     * @type {number}
     */
    end?: number;

    /**
     * suite before hook for old unit test.
     *
     * @type {ISuiteHook[]}
     */
    before?: ISuiteHook[];
    /**
     * suite beforeEach hook for old unit test.
     *
     * @type {ISuiteHook[]}
     */
    beforeEach?: ISuiteHook[];
    /**
     * suite after hook for old unit test.
     *
     * @type {ISuiteHook[]}
     */
    after?: ISuiteHook[];
    /**
     * suite afterEach hook for old unit test.
     *
     * @type {ISuiteHook[]}
     */
    afterEach?: ISuiteHook[];
}

/**
 * report
 *
 * @export
 * @interface ITestReport
 */
export interface ITestReport {
    /**
     * suites.
     *
     * @type {Map<Token, ISuiteDescribe>}
     */
    suites: Map<Token, ISuiteDescribe>;
    /**
     * add suite.
     *
     * @param {Token} suit
     * @param {ISuiteDescribe} describe
     */
    addSuite(suit: Token, describe: ISuiteDescribe): void;
    /**
     * get suite.
     *
     * @param {Token} suit
     * @returns {ISuiteDescribe}
     */
    getSuite(suit: Token): ISuiteDescribe;
    /**
     * set suite completed.
     *
     * @param {Token} suit
     */
    setSuiteCompleted(suit: Token): void;
    /**
     * add case.
     *
     * @param {Token} suit
     * @param {ICaseDescribe} testCase
     */
    addCase(suit: Token, testCase: ICaseDescribe): void;
    /**
     * get case.
     *
     * @param {Token} suit
     * @param {string} test
     * @returns {ICaseDescribe}
     */
    getCase(suit: Token, test: string): ICaseDescribe;
    /**
     * set case completed.
     *
     * @param {ICaseDescribe} testCase
     */
    setCaseCompleted(testCase: ICaseDescribe): void;
    /**
     * track error.
     * @param error 
     */
    track(error: Error): void;
    /**
     * report.
     *
     * @returns {Promise<void>}
     */
    report(): Promise<void>;
}
