import { isNumber, lang, PromiseUtil, Injectable, Refs, refl } from '@tsdi/ioc';
import { Runnable, Startup, IBootContext } from '@tsdi/boot';
import { Before, BeforeEach, Test, After, AfterEach } from '../decorators';
import { BeforeTestMetadata, BeforeEachTestMetadata, TestCaseMetadata, SuiteMetadata } from '../metadata';
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
@Refs('@Suite', Startup)
export class SuiteRunner extends Runnable<any> implements ISuiteRunner {

    timeout: number;
    describe: string;

    async configureService(ctx: IBootContext): Promise<void> {
        this.context = ctx;
    }
    /**
     * get suite describe.
     *
     * @returns {ISuiteDescribe}
     * @memberof SuiteRunner
     */
    getSuiteDescribe(): ISuiteDescribe {
        let meta = this.context.getAnnoation<SuiteMetadata>();
        this.timeout = (meta && meta.timeout) ? meta.timeout : (3 * 60 * 60 * 1000);
        this.describe = meta.describe || lang.getClassName(this.getBootType());
        return {
            timeout: this.timeout,
            describe: this.describe,
            cases: []
        }
    }

    async run(data?: any): Promise<any> {
        try {
            let desc = this.getSuiteDescribe();
            await this.runSuite(desc);
        } catch (err) {
            // console.error(err);
        }
    }

    async runSuite(desc: ISuiteDescribe): Promise<void> {
        await this.runBefore(desc);
        await this.runTest(desc);
        await this.runAfter(desc);
    }

    runTimeout(key: string, describe: string, timeout: number): Promise<any> {
        let instance = this.getBoot();
        let defer = PromiseUtil.defer();
        let injector = this.getContext().injector;
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
        let befores = this.context.reflect.getDecorDefines<BeforeTestMetadata>(Before.toString(), 'method');
        await PromiseUtil.step(
            befores.map(df => {
                return this.runTimeout(
                    df.propertyKey,
                    'sutie before ' + df.propertyKey,
                    df.matedata.timeout);
            }));
    }

    async runBeforeEach() {
        let befores = this.context.reflect.getDecorDefines<BeforeEachTestMetadata>(BeforeEach.toString(), 'method');
        await PromiseUtil.step(
            befores.map(df => () => {
                return this.runTimeout(
                    df.propertyKey,
                    'before each ' + df.propertyKey,
                    df.matedata.timeout);
            }));
    }

    async runAfterEach() {
        let afters = this.context.reflect.getDecorDefines<BeforeEachTestMetadata>(AfterEach.toString(), 'method');
        await PromiseUtil.step(afters.map(df => () => {
            return this.runTimeout(
                df.propertyKey,
                'after each ' + df.propertyKey,
                df.matedata.timeout);
        }));
    }

    async runAfter(describe: ISuiteDescribe) {
        let afters = this.context.reflect.getDecorDefines<BeforeTestMetadata>(After.toString(), 'method');
        await PromiseUtil.step(
            afters.map(df => () => {
                return this.runTimeout(
                    df.propertyKey,
                    'sutie after ' + df.propertyKey,
                    df.matedata.timeout)
            }));
    }

    async runTest(desc: ISuiteDescribe) {
        let tests = this.context.reflect.getDecorDefines<TestCaseMetadata>(Test.toString(), 'method');
        await PromiseUtil.step(
            tests.map(df => {
                return {
                    key: df.propertyKey,
                    order: df.matedata.setp,
                    timeout: df.matedata.timeout,
                    title: df.matedata.title
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
