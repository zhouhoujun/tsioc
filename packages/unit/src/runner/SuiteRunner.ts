import { lang, Injectable, ReflectiveRef, Decors, Type, TypeReflect, isFunction, refl } from '@tsdi/ioc';
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
export class SuiteRunner<T = any> extends DefaultRunnableRef<T> implements UnitRunner<T> {

    timeout!: number;
    describe!: string;

    constructor(factory: ReflectiveRef<T>) {
        super(factory)
    }

    override async run(): Promise<void> {
        try {
            let desc = this.getSuiteDescribe();
            await this.runSuite(desc);
        } catch (err) {
            throw err;
        }
    }

    /**
     * get suite describe.
     *
     * @returns {SuiteDescribe}
     */
    getSuiteDescribe(): SuiteDescribe {
        let meta = this.factory.reflect.annotation as SuiteMetadata;
        this.timeout = (meta && meta.timeout) ? meta.timeout : (3 * 60 * 60 * 1000);
        this.describe = meta.describe || this.factory.reflect.class.className;
        return {
            timeout: this.timeout,
            describe: this.describe,
            cases: []
        }
    }

    async runSuite(desc: SuiteDescribe): Promise<void> {
        await this.runBefore(desc);
        await this.runTest(desc);
        await this.runAfter(desc);
    }

    runTimeout(key: string, describe: string, timeout?: number): Promise<any> {
        let instance = this.instance as any;
        let defer = lang.defer();
        const injector = this.factory.injector;
        let timer = setTimeout(() => {
            if (timer) {
                clearTimeout(timer);
                let assert = injector.get(Assert);
                let err = new assert.AssertionError({
                    message: `${describe}, timeout ${timeout}`,
                    stackStartFunction: instance[key],
                    stackStartFn: instance[key]
                });
                defer.reject(err);
            }
        }, timeout || this.timeout);

        Promise.resolve(this.factory.invoke(key, {
            providers: [
                { provide: RunCaseToken, useValue: instance[key] },
                { provide: RunSuiteToken, useValue: instance }
            ]
        }, instance))
            .then(r => {
                clearTimeout(timer);
                timer = null!;
                defer.resolve(r);
            })
            .catch(err => {
                clearTimeout(timer);
                timer = null!;
                defer.reject(err);
            })

        return defer.promise;
    }

    async runBefore(describe: SuiteDescribe) {
        let befores = this.factory.reflect.class.getDecorDefines<BeforeTestMetadata>(Before.toString(), Decors.method);
        await lang.step(
            befores.map(df => () => {
                return this.runTimeout(
                    df.propertyKey,
                    'sutie before ' + df.propertyKey,
                    df.metadata.timeout);
            }));
    }

    async runBeforeEach() {
        let befores = this.factory.reflect.class.getDecorDefines<BeforeEachTestMetadata>(BeforeEach.toString(), Decors.method);
        await lang.step(
            befores.map(df => () => {
                return this.runTimeout(
                    df.propertyKey,
                    'before each ' + df.propertyKey,
                    df.metadata.timeout);
            }));
    }

    async runAfterEach() {
        let afters = this.factory.reflect.class.getDecorDefines<BeforeEachTestMetadata>(AfterEach.toString(), Decors.method);
        await lang.step(afters.map(df => () => {
            return this.runTimeout(
                df.propertyKey,
                'after each ' + df.propertyKey,
                df.metadata.timeout);
        }));
    }

    async runAfter(describe: SuiteDescribe) {
        let afters = this.factory.reflect.class.getDecorDefines<BeforeTestMetadata>(After.toString(), Decors.method);
        await lang.step(
            afters.map(df => () => {
                return this.runTimeout(
                    df.propertyKey,
                    'sutie after ' + df.propertyKey,
                    df.metadata.timeout)
            }));
    }

    async runTest(desc: SuiteDescribe) {
        let tests = this.factory.reflect.class.getDecorDefines<TestCaseMetadata>(Test.toString(), Decors.method);
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
                    return b.order! - a.order!;
                })
                .map(caseDesc => {
                    return () => this.runCase(caseDesc)
                }));
    }

    async runCase(caseDesc: ICaseDescribe): Promise<ICaseDescribe> {
        try {
            await this.runBeforeEach();
            await this.runTimeout(
                caseDesc.key,
                caseDesc.title,
                caseDesc.timeout);
        } catch (err) {
            caseDesc.error = err as Error;
        } finally {
            try {
                await this.runAfterEach();
            } catch (err) {
                caseDesc.error = err as Error;
            }
        }
        return caseDesc;
    }

    protected destroying() {
        this.factory = null!;
        this.timeout = null!;
        this.describe = null!;
    }

}

class SuiteRunnableFactory<T> extends DefaultRunnableFactory<T> {
    protected override createInstance(factory: ReflectiveRef<T>): RunnableRef<T> {
        return factory.resolve(SuiteRunner);
    }
}

@Injectable()
export class SuiteRunnableFactoryResolver extends RunnableFactoryResolver {
    resolve<T>(type: Type<T> | TypeReflect<T>): RunnableFactory<T> {
        return new SuiteRunnableFactory(isFunction(type) ? refl.get(type) : type)
    }
}