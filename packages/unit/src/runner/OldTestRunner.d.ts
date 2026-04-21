import { Injector, AbstractType } from '@tsdi/ioc';
import { SuiteDescribe, ICaseDescribe } from '../reports/interface';
import { UnitRunner } from './Runner';
/**
 * Suite runner.
 *
 * @export
 * @class SuiteRunner
 * @implements {IRunner<any>}
 */
export declare class OldTestRunner implements UnitRunner {
    private injector;
    describe: string;
    private timeout;
    suites: SuiteDescribe[];
    constructor(injector: Injector);
    get type(): AbstractType<any>;
    run(): Promise<void>;
    registerGlobalScope(): void;
    unregisterGlobalScope(): void;
    runSuite(desc: SuiteDescribe): Promise<void>;
    runTimeout(fn: Function | undefined, describe: string, timeout?: number): Promise<any>;
    runHook(describe: SuiteDescribe, action: string, desc: string): Promise<void>;
    runBefore(describe: SuiteDescribe): Promise<void>;
    runBeforeEach(describe: SuiteDescribe): Promise<void>;
    runAfterEach(describe: SuiteDescribe): Promise<void>;
    runAfter(describe: SuiteDescribe): Promise<void>;
    runTest(desc: SuiteDescribe): Promise<void>;
    runCase(caseDesc: ICaseDescribe, suiteDesc?: SuiteDescribe): Promise<ICaseDescribe>;
}
