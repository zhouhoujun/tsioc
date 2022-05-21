import { lang, Injectable, Decors, Type, TypeReflect, isFunction, refl, Injector, InvokeArguments } from '@tsdi/ioc';
import { DefaultRunnableFactory, DefaultRunnableRef, RunnableFactory, RunnableFactoryResolver, RunnableRef } from '@tsdi/core';
import { Before, BeforeEach, Test, After, AfterEach } from '../metadata/decor';
import { BeforeTestMetadata, BeforeEachTestMetadata, TestCaseMetadata, SuiteMetadata } from '../metadata/meta';
import { RunCaseToken, RunSuiteToken, Assert } from '../assert/assert';
import { SuiteDescribe, ICaseDescribe } from '../reports/interface';
import { UnitRunner } from './Runner';

/**
 * Suite runner.
 *
 * @export
 * @class SuiteRunner
 * @implements {IRunner<any>}
 */
 @Injectable()
export class SuiteRunner<T = any> implements UnitRunner<T> {

 
    constructor(private runnable: RunnableRef<T>) {

    }

    get type(): Type<T> {
        return this.runnable.type;
    }

    get reflect() {
        return this.runnable.reflect;
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
        const meta = this.reflect.annotation as SuiteMetadata;
        this.timeout = (meta && meta.timeout) ? meta.timeout : (3 * 60 * 60 * 1000);
        this.describe = meta.describe || this.reflect.class.className;
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
        const instance = this.runnable.instance as any;
        const defer = lang.defer();
        const injector = this.runnable.injector;
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

        Promise.resolve(this.runnable.invoke(key, {
            providers: [
                { provide: RunCaseToken, useValue: instance[key] },
                { provide: RunSuiteToken, useValue: instance }
            ]
        }, instance))
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
        const befores = this.reflect.class.getDecorDefines<BeforeTestMetadata>(Before.toString(), Decors.method);
        await lang.step(
            befores.map(df => () => {
                return this.runTimeout(
                    df.propertyKey,
                    'sutie before ' + df.propertyKey,
                    df.metadata.timeout)
            }))
    }

    async runBeforeEach() {
        const befores = this.reflect.class.getDecorDefines<BeforeEachTestMetadata>(BeforeEach.toString(), Decors.method);
        await lang.step(
            befores.map(df => () => {
                return this.runTimeout(
                    df.propertyKey,
                    'before each ' + df.propertyKey,
                    df.metadata.timeout)
            }))
    }

    async runAfterEach() {
        const afters = this.reflect.class.getDecorDefines<BeforeEachTestMetadata>(AfterEach.toString(), Decors.method);
        await lang.step(afters.map(df => () => {
            return this.runTimeout(
                df.propertyKey,
                'after each ' + df.propertyKey,
                df.metadata.timeout)
        }))
    }

    async runAfter(describe: SuiteDescribe) {
        const afters = this.reflect.class.getDecorDefines<BeforeTestMetadata>(After.toString(), Decors.method);
        await lang.step(
            afters.map(df => () => {
                return this.runTimeout(
                    df.propertyKey,
                    'sutie after ' + df.propertyKey,
                    df.metadata.timeout)
            }))
    }

    async runTest(desc: SuiteDescribe) {
        const tests = this.reflect.class.getDecorDefines<TestCaseMetadata>(Test.toString(), Decors.method);
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


class UnitRunnableRef<T> extends DefaultRunnableRef<T> {
    override run() {
        return this.context.get(SuiteRunner).run();
    }
} 

class SuiteRunnableFactory<T> extends DefaultRunnableFactory<T> {
    protected override createInstance(reflect: TypeReflect<T>, injector: Injector, options?: InvokeArguments, invokeMethod?: string): RunnableRef<T> {
        return new UnitRunnableRef(reflect, injector, options, invokeMethod)
    }
}

@Injectable()
export class SuiteRunnableFactoryResolver extends RunnableFactoryResolver {
    resolve<T>(type: Type<T> | TypeReflect<T>): RunnableFactory<T> {
        return new SuiteRunnableFactory(isFunction(type) ? refl.get(type) : type)
    }
}