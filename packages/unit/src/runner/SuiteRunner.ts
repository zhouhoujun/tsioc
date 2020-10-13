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
        let methodMaps = refl.get(this.getBootType()).getMetadatas<BeforeTestMetadata>(Before.toString(), 'method');
        await PromiseUtil.step(
            Object.keys(methodMaps)
                .map(key => () => {
                    let meta = methodMaps[key].find(m => isNumber(m.timeout));
                    return this.runTimeout(
                        key,
                        'sutie before ' + key,
                        meta ? meta.timeout : describe.timeout)
                }));
    }

    async runBeforeEach() {
        let methodMaps = refl.get(this.getBootType()).getMetadatas<BeforeEachTestMetadata>(BeforeEach.toString());
        await PromiseUtil.step(
            Object.keys(methodMaps)
                .map(key => () => {
                    let meta = methodMaps[key].find(m => isNumber(m.timeout));
                    return this.runTimeout(
                        key,
                        'before each ' + key,
                        meta ? meta.timeout : this.timeout);
                }));
    }

    async runAfterEach() {
        let methodMaps = refl.get(this.getBootType()).getMetadatas<BeforeEachTestMetadata>(AfterEach.toString());
        await PromiseUtil.step(
            Object.keys(methodMaps)
                .map(key => () => {
                    let meta = methodMaps[key].find(m => isNumber(m.timeout));
                    return this.runTimeout(
                        key,
                        'after each ' + key,
                        meta ? meta.timeout : this.timeout);
                }));
    }

    async runAfter(describe: ISuiteDescribe) {
        let methodMaps = refl.get(this.getBootType()).getMetadatas<BeforeTestMetadata>(After.toString());
        await PromiseUtil.step(
            Object.keys(methodMaps)
                .map(key => () => {
                    let meta = methodMaps[key].find(m => isNumber(m.timeout));
                    return this.runTimeout(
                        key,
                        'sutie after ' + key,
                        meta ? meta.timeout : describe.timeout)
                }));
    }

    async runTest(desc: ISuiteDescribe) {
        let methodMaps = refl.get(this.getBootType()).getMetadatas<TestCaseMetadata>(Test.toString());
        let keys = Object.keys(methodMaps);
        await PromiseUtil.step(
            keys.map(key => {
                let meta = methodMaps[key].find(m => isNumber(m.setp));
                let timeoutMeta = methodMaps[key].find(m => isNumber(m.timeout));
                let title = methodMaps[key].map(m => m.title).filter(t => t).join('; ');
                return {
                    key: key,
                    order: meta ? meta.setp : keys.length,
                    timeout: timeoutMeta ? timeoutMeta.timeout : this.timeout,
                    title: title || key
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
