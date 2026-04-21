import { Invocation, AbstractType, AbstractInvocation, InvokeOptions, AbstractInvocationFactory, InvocationOptions, ClassRef, RunContext, Injector } from '@tsdi/ioc';
import { SuiteDescribe, ICaseDescribe } from '../reports/interface';
import { UnitRunner } from './Runner';
/**
 * Suite runner.
 *
 * @export
 * @class SuiteRunner
 * @implements {UnitRunner<T>}
 */
export declare class SuiteRunner<T = object> extends UnitRunner<T> {
    readonly invocation: Invocation;
    constructor(invocation: Invocation);
    get type(): AbstractType<T>;
    timeout: number;
    describe: string;
    run(): Promise<void>;
    /**
     * get suite describe.
     *
     * @returns {SuiteDescribe}
     */
    getSuiteDescribe(): SuiteDescribe;
    runSuite(desc: SuiteDescribe): Promise<void>;
    runTimeout(key: string, describe: string, timeout?: number): Promise<any>;
    runBefore(describe: SuiteDescribe): Promise<void>;
    runBeforeEach(): Promise<void>;
    runAfterEach(): Promise<void>;
    runAfter(describe: SuiteDescribe): Promise<void>;
    runTest(desc: SuiteDescribe): Promise<void>;
    runCase(caseDesc: ICaseDescribe): Promise<ICaseDescribe>;
}
export declare class SuiteInvocation<T = any> extends AbstractInvocation<T> {
    protected process(context?: InvokeOptions, resolveCtx?: RunContext): Promise<void>;
}
export declare class SuiteInvocationFactory extends AbstractInvocationFactory {
    protected createInstance<T>(typeRef: ClassRef<T>, injector: Injector, options?: InvocationOptions<T>): Invocation<T>;
}
