import { AbstractType } from '@tsdi/ioc';
import { SuiteDescribe, ICaseDescribe } from '../reports/interface';
/**
 * suite runner interface.
 */
export declare abstract class UnitRunner<T = object> {
    abstract get type(): AbstractType<T>;
    /**
     * run test.
     */
    abstract run(): Promise<void>;
    /**
     * run suite.
     *
     * @param {SuiteDescribe} desc
     * @returns {Promise<void>}
     */
    abstract runSuite(desc: SuiteDescribe): Promise<void>;
    /**
     * run case.
     *
     * @param {ICaseDescribe} caseDesc
     * @returns {Promise<ICaseDescribe>}
     */
    abstract runCase(caseDesc: ICaseDescribe): Promise<ICaseDescribe>;
}
