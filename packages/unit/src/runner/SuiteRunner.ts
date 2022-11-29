import { lang, Injectable, Decors, TypeDef, refl, Injector, InvokeArguments, Platform, ReflectiveFactory, Class, Type } from '@tsdi/ioc';
import { DefaultRunnableFactory, DefaultRunnableRef, ModuleRef, RunnableRef } from '@tsdi/core';
import { Advisor } from '@tsdi/aop';
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
 * @implements {UnitRunner<T>}
 */
export class SuiteRunner<T = any> extends DefaultRunnableRef<T> implements UnitRunner<T> {


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
        const meta = this.class.annotation as SuiteMetadata;
        this.timeout = (meta && meta.timeout) ? meta.timeout : (3 * 60 * 60 * 1000);
        this.describe = meta.describe || this.class.className;
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
        const instance = this.instance as any;
        const defer = lang.defer();
        const injector = this.injector;
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

        Promise.resolve(this.ref.invoke(key, {
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
        const befores = this.class.getDecorDefines<BeforeTestMetadata>(Before.toString(), Decors.method);
        await lang.step(
            befores.map(df => () => {
                return this.runTimeout(
                    df.propertyKey,
                    'sutie before ' + df.propertyKey,
                    df.metadata.timeout)
            }))
    }

    async runBeforeEach() {
        const befores = this.class.getDecorDefines<BeforeEachTestMetadata>(BeforeEach.toString(), Decors.method);
        await lang.step(
            befores.map(df => () => {
                return this.runTimeout(
                    df.propertyKey,
                    'before each ' + df.propertyKey,
                    df.metadata.timeout)
            }))
    }

    async runAfterEach() {
        const afters = this.class.getDecorDefines<BeforeEachTestMetadata>(AfterEach.toString(), Decors.method);
        await lang.step(afters.map(df => () => {
            return this.runTimeout(
                df.propertyKey,
                'after each ' + df.propertyKey,
                df.metadata.timeout)
        }))
    }

    async runAfter(describe: SuiteDescribe) {
        const afters = this.class.getDecorDefines<BeforeTestMetadata>(After.toString(), Decors.method);
        await lang.step(
            afters.map(df => () => {
                return this.runTimeout(
                    df.propertyKey,
                    'sutie after ' + df.propertyKey,
                    df.metadata.timeout)
            }))
    }

    async runTest(desc: SuiteDescribe) {
        const tests = this.class.getDecorDefines<TestCaseMetadata>(Test.toString(), Decors.method);
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

@Injectable()
export class SuiteRunnableFactory<T> extends DefaultRunnableFactory<T> {
    constructor(moduleRef: ModuleRef, platform: Platform) {
        super(moduleRef)
        platform.getAction(Advisor).register(SuiteRunner);
    }
    protected override createInstance(def: Type<T>| Class<T>, injector: Injector, options?: InvokeArguments, invokeMethod?: string): RunnableRef<T> {
        const ref = injector.get(ReflectiveFactory).create(def, injector, options);
        const runnableRef = new SuiteRunner(ref, this.moduleRef, invokeMethod);
        injector.platform().getAction(Advisor).attach(refl.get(SuiteRunner), runnableRef)
        return runnableRef;
    }
}
