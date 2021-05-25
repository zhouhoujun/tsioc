import { lang, Injectable, Refs } from '@tsdi/ioc';
import { Runnable, BootContext } from '@tsdi/boot';
import { Before, BeforeEach, Test, After, AfterEach } from '../metadata/decor';
import { BeforeTestMetadata, BeforeEachTestMetadata, TestCaseMetadata, SuiteMetadata } from '../metadata/meta';
import { ISuiteDescribe, ICaseDescribe } from '../reports/ITestReport';
import { ISuiteRunner } from './ISuiteRunner';
import { RunCaseToken, RunSuiteToken, Assert } from '../assert/assert';

/**
 * Suite runner.
 *
 * @export
 * @class SuiteRunner
 * @implements {IRunner<any>}
 */
@Injectable()
@Refs('@Suite', Runnable)
export class SuiteRunner extends Runnable implements ISuiteRunner {

    timeout: number;
    describe: string;

    private ctx: BootContext;

    async configureService(ctx: BootContext): Promise<void> {
        this.ctx = ctx;
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
     * @returns {ISuiteDescribe}
     */
    getSuiteDescribe(): ISuiteDescribe {
        let meta = this.ctx.reflect.annotation as SuiteMetadata;
        this.timeout = (meta && meta.timeout) ? meta.timeout : (3 * 60 * 60 * 1000);
        this.describe = meta.describe || lang.getClassName(this.ctx.type);
        return {
            timeout: this.timeout,
            describe: this.describe,
            cases: []
        }
    }

    async runSuite(desc: ISuiteDescribe): Promise<void> {
        await this.runBefore(desc);
        await this.runTest(desc);
        await this.runAfter(desc);
    }

    runTimeout(key: string, describe: string, timeout: number): Promise<any> {
        let instance = this.getInstance();
        let defer = lang.defer();
        let injector = this.ctx.injector;
        let timer = setTimeout(() => {
            if (timer) {
                clearTimeout(timer);
                let assert = injector.resolve(Assert);
                let err = new assert.AssertionError({
                    message: `${describe}, timeout ${timeout}`,
                    stackStartFunction: instance[key],
                    stackStartFn: instance[key]
                });
                defer.reject(err);
            }
        }, timeout || this.timeout);

        Promise.resolve(injector.invoke(instance, key,
            { provide: RunCaseToken, useValue: instance[key] },
            { provide: RunSuiteToken, useValue: instance }))
            .then(r => {
                clearTimeout(timer);
                timer = null;
                defer.resolve(r);
            })
            .catch(err => {
                clearTimeout(timer);
                timer = null;
                defer.reject(err);
            })

        return defer.promise;
    }

    async runBefore(describe: ISuiteDescribe) {
        let befores = this.ctx.reflect.class.getDecorDefines<BeforeTestMetadata>(Before.toString(), 'method');
        await lang.step(
            befores.map(df => () => {
                return this.runTimeout(
                    df.propertyKey,
                    'sutie before ' + df.propertyKey,
                    df.metadata.timeout);
            }));
    }

    async runBeforeEach() {
        let befores = this.ctx.reflect.class.getDecorDefines<BeforeEachTestMetadata>(BeforeEach.toString(), 'method');
        await lang.step(
            befores.map(df => () => {
                return this.runTimeout(
                    df.propertyKey,
                    'before each ' + df.propertyKey,
                    df.metadata.timeout);
            }));
    }

    async runAfterEach() {
        let afters = this.ctx.reflect.class.getDecorDefines<BeforeEachTestMetadata>(AfterEach.toString(), 'method');
        await lang.step(afters.map(df => () => {
            return this.runTimeout(
                df.propertyKey,
                'after each ' + df.propertyKey,
                df.metadata.timeout);
        }));
    }

    async runAfter(describe: ISuiteDescribe) {
        let afters = this.ctx.reflect.class.getDecorDefines<BeforeTestMetadata>(After.toString(), 'method');
        await lang.step(
            afters.map(df => () => {
                return this.runTimeout(
                    df.propertyKey,
                    'sutie after ' + df.propertyKey,
                    df.metadata.timeout)
            }));
    }

    async runTest(desc: ISuiteDescribe) {
        let tests = this.ctx.reflect.class.getDecorDefines<TestCaseMetadata>(Test.toString(), 'method');
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
                    return b.order - a.order;
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
            await this.runAfterEach();

        } catch (err) {
            caseDesc.error = err;
        }
        return caseDesc;
    }
}
