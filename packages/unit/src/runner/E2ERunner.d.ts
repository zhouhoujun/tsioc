import { Invocation, AbstractType } from '@tsdi/ioc';
import { SuiteDescribe, ICaseDescribe } from '../reports/interface';
import { UnitRunner } from './Runner';
import { E2ESuiteDescribe, E2EStepMetadata } from '../e2e/E2EMetadata';
export declare class E2ERunner<T = object> extends UnitRunner<T> {
    readonly invocation: Invocation;
    constructor(invocation: Invocation);
    get type(): AbstractType<T>;
    timeout: number;
    describe: string;
    run(): Promise<void>;
    getSuiteDescribe(): E2ESuiteDescribe;
    protected getScenarioSteps(): E2EStepMetadata[];
    runSuite(desc: E2ESuiteDescribe): Promise<void>;
    runTimeout(key: string, describe: string, timeout?: number): Promise<any>;
    runBefore(describe: SuiteDescribe): Promise<void>;
    runBeforeEach(): Promise<void>;
    runAfterEach(): Promise<void>;
    runAfter(describe: SuiteDescribe): Promise<void>;
    runScenario(desc: E2ESuiteDescribe): Promise<void>;
    runScenarioSteps(desc: E2ESuiteDescribe): Promise<void>;
    runCase(caseDesc: ICaseDescribe): Promise<ICaseDescribe>;
}
