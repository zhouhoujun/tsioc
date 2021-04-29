import { IRunnable } from '@tsdi/boot';
import { ISuiteDescribe, ICaseDescribe } from '../reports/ITestReport';

/**
 * suite runner interface.
 *
 * @export
 * @interface ISuiteRunner
 * @extends {IRunner<any>}
 */
export interface ISuiteRunner extends IRunnable {
    /**
     * run suite.
     *
     * @param {ISuiteDescribe} desc
     * @returns {Promise<void>}
     */
    runSuite(desc: ISuiteDescribe): Promise<void>;
    /**
     * run case.
     *
     * @param {ICaseDescribe} caseDesc
     * @returns {Promise<ICaseDescribe>}
     */
    runCase(caseDesc: ICaseDescribe): Promise<ICaseDescribe>;
}
