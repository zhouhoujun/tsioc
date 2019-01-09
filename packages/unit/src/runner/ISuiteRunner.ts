import { InjectRunnableToken, IRunner } from '@ts-ioc/bootstrap';
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
export interface ISuiteRunner extends IRunner<any> {
    /**
     * get suite describe.
     *
     * @returns {ISuiteDescribe}
     * @memberof ISuiteRunner
     */
    getSuiteDescribe(): ISuiteDescribe;

    runSuite(desc: ISuiteDescribe): Promise<void>;

    runCase(caseDesc: ICaseDescribe): Promise<ICaseDescribe>;
}
