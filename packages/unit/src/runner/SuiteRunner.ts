import { lang, Injectable, Invocation, Type, AbstractInvocation, InvocationContext, InvokeArguments, AbstractInvocationFactory, InvocationOptions, Class } from '@tsdi/ioc';
import { Before, BeforeEach, Test, After, AfterEach } from '../metadata';
import { BeforeTestMetadata, BeforeEachTestMetadata, TestCaseMetadata, SuiteMetadata } from '../metadata';
import { RunCaseToken, RunSuiteToken, Assert } from '../assert/assert';
import { SuiteDescribe, ICaseDescribe } from '../reports/interface';
import { UnitRunner } from './Runner';

/**
 * Suite runner.
 *
 * @export
 * @class SuiteRunner
 * @implements {UnitRunner<T>}
 */
@Injectable()
export class SuiteRunner<T = any> implements UnitRunner<T> {

    constructor(readonly invocation: Invocation) {

    }

    get type(): Type<any> {
        return this.invocation.type
    }

    timeout!: number;
    describe!: string;

    async run(): Promise<void> {
        const desc = this.getSuiteDescribe();
        await this.runSuite(desc)
    }

    /**
     * get suite describe.
     *
     * @returns {SuiteDescribe}
     */
    getSuiteDescribe(): SuiteDescribe {
        const meta = this.invocation.class.getAnnotation() as SuiteMetadata;
        this.timeout = (meta && meta.timeout) ? meta.timeout : (3 * 60 * 60 * 1000);
        this.describe = meta.describe || this.invocation.class.className;
        return {
            timeout: this.timeout,
            describe: this.describe,
            cases: []
        }
    }

    async runSuite(desc: SuiteDescribe): Promise<void> {
        await this.runBefore(desc);
        await this.runTest(desc);
        await this.runAfter(desc)
    }

    runTimeout(key: string, describe: string, timeout?: number): Promise<any> {
        const instance = this.invocation.instance;
        const defer = lang.defer();
        const injector = this.invocation.injector;
        let timer = setTimeout(() => {
            if (timer) {
                clearTimeout(timer);
                const assert = injector.get(Assert);
                const err = new assert.AssertionError({
                    message: `${describe}, timeout ${timeout}`,
                    stackStartFunction: instance[key],
                    stackStartFn: instance[key]
                });
                defer.reject(err)
            }
        }, timeout || this.timeout);

        Promise.resolve(this.invocation.invoke(key, {
            providers: [
                { provide: RunCaseToken, useValue: instance[key] },
                { provide: RunSuiteToken, useValue: instance }
            ]
        }))
            .then(r => {
                clearTimeout(timer);
                timer = null!;
                defer.resolve(r)
            })
            .catch(err => {
                clearTimeout(timer);
                timer = null!;
                defer.reject(err)
            })

        return defer.promise
    }

    async runBefore(describe: SuiteDescribe) {
        const befores = this.invocation.class.getMethodDefines<BeforeTestMetadata>(Before);
        await lang.step(
            befores.map(df => () => {
                return this.runTimeout(
                    df.propertyKey,
                    'sutie before ' + df.propertyKey,
                    df.metadata.timeout)
            })).catch(err => {
                this.runAfter(describe);
                throw err;
            })
    }

    async runBeforeEach() {
        const befores = this.invocation.class.getMethodDefines<BeforeEachTestMetadata>(BeforeEach);
        await lang.step(
            befores.map(df => () => {
                return this.runTimeout(
                    df.propertyKey,
                    'before each ' + df.propertyKey,
                    df.metadata.timeout)
            }))
    }

    async runAfterEach() {
        const afters = this.invocation.class.getMethodDefines<BeforeEachTestMetadata>(AfterEach);
        await lang.step(afters.map(df => () => {
            return this.runTimeout(
                df.propertyKey,
                'after each ' + df.propertyKey,
                df.metadata.timeout)
        }))
    }

    async runAfter(describe: SuiteDescribe) {
        const afters = this.invocation.class.getMethodDefines<BeforeTestMetadata>(After);
        await lang.step(
            afters.map(df => () => {
                return this.runTimeout(
                    df.propertyKey,
                    'sutie after ' + df.propertyKey,
                    df.metadata.timeout)
            }))
    }

    async runTest(desc: SuiteDescribe) {
        const tests = this.invocation.class.getMethodDefines<TestCaseMetadata>(Test);
        await lang.step(
            tests.map(df => {
                return {
                    key: df.propertyKey,
                    order: df.metadata.setp,
                    timeout: df.metadata.timeout,
                    title: df.metadata.title ?? df.propertyKey
                } as ICaseDescribe;
            })
                .sort((a, b) => {
                    return b.order! - a.order!
                })
                .map(caseDesc => {
                    return () => this.runCase(caseDesc)
                }))
    }

    async runCase(caseDesc: ICaseDescribe): Promise<ICaseDescribe> {
        try {
            await this.runBeforeEach();
            await this.runTimeout(
                caseDesc.key,
                caseDesc.title,
                caseDesc.timeout)
        } catch (err) {
            caseDesc.error = err as Error
        } finally {
            try {
                await this.runAfterEach()
            } catch (err) {
                caseDesc.error = err as Error
            }
        }
        return caseDesc
    }

}



export class SuiteInvocation<T = any> extends AbstractInvocation<T> {
    protected process(option?: InvocationContext | InvokeArguments) {
        return this.context.resolve(SuiteRunner).run();
    }
}

export class SuiteInvocationFactory extends AbstractInvocationFactory {
    protected createInstance<T>(typeRef: Class<T>, context: InvocationContext, options?: InvocationOptions<T>): Invocation<T> {
        return new SuiteInvocation<T>(typeRef, context, options);
    }

}
