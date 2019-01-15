import { isUndefined, Injectable, Inject, ContainerToken, IContainer, MapSet, lang, Defer, getMethodMetadata, isNumber, PromiseUtil } from "@ts-ioc/core";
import { SuiteRunnerToken, ISuiteRunner } from './ISuiteRunner';
import { Runner } from '@ts-ioc/bootstrap';
import { ISuiteDescribe, ICaseDescribe } from '../reports';
import { Assert } from '../assert';
import { TestCaseMetadata, BeforeEachTestMetadata, BeforeTestMetadata } from '../metadata';
import { BeforeEach, Before, Test } from '../decorators';

declare let window: any;
declare let global: any;
let globals = isUndefined(window) ? global : window;
//BDD style
globals.describe = (name: string, fn: () => any) => {
    const it = (title: string, test: () => any, timeout?: number) => {

    }
    fn && fn();
};

//TDD style
globals.suite = (name: string, fn: () => any) => {

    const test = (title: string, test: () => any, timeout?: number) => {

    }
    fn && fn();
};


/**
 * Suite runner.
 *
 * @export
 * @class SuiteRunner
 * @implements {IRunner<any>}
 */
@Injectable()
export class OldTestRunner extends Runner<any> implements ISuiteRunner {
    

    @Inject(ContainerToken)
    container: IContainer;

    timeout: number;
    describe: string;

    suites: MapSet<string, ISuiteDescribe>;

    getTarget(){
        return this.suites;
    }

    constructor() {
        super(MapSet, null);
        this.suites = new MapSet();
    }

    async run(data?: any): Promise<any> {
        try {
            // if (!this.container.has(Assert)) {
            //     this.container.bindProvider(Assert, () => assert);
            // }
            // if (!this.container.has(ExpectToken)) {
            //     this.container.bindProvider(ExpectToken, () => expect);
            // }
            await Promise.all(this.suites.values().map(desc=>{
                return this.runSuite(desc);
            }));
        } catch (err) {
            // console.error(err);
        }
    }

    async runSuite(desc: ISuiteDescribe): Promise<void> {
        await this.runBefore(desc);
        await this.runTest(desc);
    }

    runTimeout(key: string, describe: string, timeout: number): Promise<any> {
        let instance = this.instance;
        let defer = new Defer();
        let timer = setTimeout(() => {
            if (timer) {
                clearTimeout(timer);
                let assert = this.container.resolve(Assert);
                let err = new assert.AssertionError({
                    message: `${describe}, timeout ${timeout}`,
                    stackStartFunction: this.instance[key],
                    stackStartFn: this.instance[key]
                });
                defer.reject(err);
            }
        }, timeout);

        this.container.invoke(instance, key)
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
        let methodMaps = getMethodMetadata<BeforeTestMetadata>(Before, this.instance);
        await PromiseUtil.step(
            lang.keys(methodMaps)
                .map(key => {
                    let meta = methodMaps[key].find(m => isNumber(m.timeout));
                    return this.runTimeout(
                        key,
                        'sutie before ' + key,
                        meta ? meta.timeout : describe.timeout)
                }));
    }

    async runBeforeEach() {
        let methodMaps = getMethodMetadata<BeforeEachTestMetadata>(BeforeEach, this.instance);
        await PromiseUtil.step(
            lang.keys(methodMaps)
                .map(key => {
                    let meta = methodMaps[key].find(m => isNumber(m.timeout));
                    return this.runTimeout(
                        key,
                        'before each ' + key,
                        meta ? meta.timeout : this.timeout);
                }));
    }

    async runTest(desc: ISuiteDescribe) {
        let methodMaps = getMethodMetadata<TestCaseMetadata>(Test, this.instance);
        let keys = lang.keys(methodMaps);
        await Promise.all(
            keys.map(key => {
                let meta = methodMaps[key].find(m => isNumber(m.setp));
                let timeoutMeta = methodMaps[key].find(m => isNumber(m.timeout));
                let title = methodMaps[key].map(m => m.title).filter(t => t).join('; ');
                return {
                    key: key,
                    order: meta ? meta.setp : keys.length,
                    timeout: timeoutMeta ? timeoutMeta.timeout : this.timeout,
                    title: title
                } as ICaseDescribe;
            })
                .sort((a, b) => {
                    return b.order - a.order;
                })
                .map(caseDesc => {
                    return this.runCase(caseDesc)
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
            caseDesc.error = err;
        }
        return caseDesc;
    }

}
