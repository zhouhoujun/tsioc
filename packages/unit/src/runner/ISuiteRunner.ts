import { InjectRunnableToken, IRunnable } from '@ts-ioc/bootstrap';
import { ISuiteDescribe, ICaseDescribe } from '../reports/ITestReport';


/**
 * suite runner token.
 */
export const SuiteRunnerToken = new InjectRunnableToken<ISuiteRunner>('@Suite');

/**
 * suite runner interface.
 *
 * @export
 * @interface ISuiteRunner
 * @extends {IRunner<any>}
 */
export interface ISuiteRunner extends IRunnable<any> {

    /**
     * run suite.
     *
     * @param {ISuiteDescribe} desc
     * @returns {Promise<void>}
     * @memberof ISuiteRunner
     */
    runSuite(desc: ISuiteDescribe): Promise<void>;

    /**
     * run case.
     *
     * @param {ICaseDescribe} caseDesc
     * @returns {Promise<ICaseDescribe>}
     * @memberof ISuiteRunner
     */
    runCase(caseDesc: ICaseDescribe): Promise<ICaseDescribe>;
}
