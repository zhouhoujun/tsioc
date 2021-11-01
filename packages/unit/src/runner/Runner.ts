import { Abstract, Type } from '@tsdi/ioc';
import { Runnable } from '@tsdi/core';
import { ISuiteDescribe, ICaseDescribe } from '../reports/interface';

/**
 * suite runner interface.
 *
 * @export
 * @interface ISuiteRunner
 * @extends {IRunner<any>}
 */
@Abstract()
export abstract class UnitRunner extends Runnable {

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

