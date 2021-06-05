import { Abstract, Type } from '@tsdi/ioc';
import { Service } from '@tsdi/boot';
import { ISuiteDescribe, ICaseDescribe } from '../reports/ITestReport';

/**
 * suite runner interface.
 *
 * @export
 * @interface ISuiteRunner
 * @extends {IRunner<any>}
 */
@Abstract()
export abstract class Runner extends Service {

    abstract getInstanceType(): Type;
    /**
     * run suite.
     *
     * @param {ISuiteDescribe} desc
     * @returns {Promise<void>}
     */
    abstract runSuite(desc: ISuiteDescribe): Promise<void>;
    /**
     * run case.
     *
     * @param {ICaseDescribe} caseDesc
     * @returns {Promise<ICaseDescribe>}
     */
    abstract runCase(caseDesc: ICaseDescribe): Promise<ICaseDescribe>;
}

