import { RunnableRef } from '@tsdi/core';
import { Abstract, Type } from '@tsdi/ioc';
import { SuiteDescribe, ICaseDescribe } from '../reports/interface';

/**
 * suite runner interface.
 */
@Abstract()
export abstract class UnitRunner<T = any> {

    abstract get type(): Type<T>;
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

