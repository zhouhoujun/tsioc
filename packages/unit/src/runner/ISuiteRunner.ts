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

    runSuite(desc: ISuiteDescribe): Promise<void>;

    runCase(caseDesc: ICaseDescribe): Promise<ICaseDescribe>;
}
