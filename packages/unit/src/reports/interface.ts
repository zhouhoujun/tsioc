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
 * @interface SuiteHook
 */
export interface SuiteHook {
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
 * @interface SuiteDescribe
 */
export interface SuiteDescribe {
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
     * @type {SuiteHook[]}
     */
    before?: SuiteHook[];
    /**
     * suite beforeEach hook for old unit test.
     *
     * @type {SuiteHook[]}
     */
    beforeEach?: SuiteHook[];
    /**
     * suite after hook for old unit test.
     *
     * @type {SuiteHook[]}
     */
    after?: SuiteHook[];
    /**
     * suite afterEach hook for old unit test.
     *
     * @type {SuiteHook[]}
     */
    afterEach?: SuiteHook[];
}

/**
 * report
 *
 * @export
 * @interface TestReport
 */
export interface TestReport {
    /**
     * suites.
     *
     * @type {Map<Token, SuiteDescribe>}
     */
    suites: Map<Token, SuiteDescribe>;
    /**
     * add suite.
     *
     * @param {Token} suit
     * @param {SuiteDescribe} describe
     */
    addSuite(suit: Token, describe: SuiteDescribe): void;
    /**
     * get suite.
     *
     * @param {Token} suit
     * @returns {SuiteDescribe}
     */
    getSuite(suit: Token): SuiteDescribe;
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
