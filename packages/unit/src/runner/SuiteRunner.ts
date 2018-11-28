import { IRunner, Runner, ModuleConfigure, RunnerToken } from '@ts-ioc/bootstrap';
import { Token, getMethodMetadata, isNumber, lang, ContainerToken, IContainer, Inject, PromiseUtil, getOwnTypeMetadata, Defer, Injectable, isUndefined, getClassName } from '@ts-ioc/core';
import { Before, BeforeEach, Test, Suite } from '../core/decorators';
import { BeforeTestMetadata, BeforeEachTestMetadata, TestCaseMetadata, SuiteMetadata } from '../core';

export interface ISuiteDescribe {
    describe: string;
    timeout?: number;
}

/**
 * test case decribe.
 *
 * @export
 * @interface ICaseDescribe
 */
export interface ICaseDescribe {
    key: string;
    order: number;
    timeout: number;
    title: string;
}

declare let process: any;

/**
 * Suite runner.
 *
 * @export
 * @class SuiteRunner
 * @implements {IRunner<any>}
 */
@Injectable(RunnerToken)
export class SuiteRunner extends Runner<any> implements IRunner<any> {

    @Inject(ContainerToken)
    container: IContainer;

    timeout: number;
    describe: string;

    constructor(token?: Token<any>, instance?: any, config?: ModuleConfigure) {
        super(token, instance, config);
    }

    /**
     * get suite describe.
     *
     * @returns {ISuiteDescribe}
     * @memberof SuiteRunner
     */
    getSuiteDescribe(): ISuiteDescribe {
        let type = lang.getClass(this.instance);
        let metas = getOwnTypeMetadata<SuiteMetadata>(Suite, type);
        let meta = metas.find(m => isNumber(m.timeout));
        this.timeout = meta ? meta.timeout : (3 * 60 * 60 * 1000);
        this.describe = metas.map(m => m.describe).filter(d => d).join('; ') || getClassName(type);
        return {
            timeout: this.timeout,
            describe: this.describe
        }
    }

    async run(data?: any): Promise<any> {
        try {
            await this.runBefore(this.getSuiteDescribe());
            return await this.runTest();
        } catch (err) {
            console.error(err);
        }
    }

    runTimeout(action: () => Promise<any>, describe: string, timeout: number): Promise<any> {
        let defer = new Defer();
        let timer = setTimeout(() => {
            if (timer) {
                clearTimeout(timer);
                defer.reject(new Error(`${describe}, timeout ${timeout}`));
            }
        }, timeout);

        action().then(r => {
            clearTimeout(timer);
            timer = null;
            defer.resolve(r);
        })

        return defer.promise;
    }

    async runBefore(describe: ISuiteDescribe) {
        let methodMaps = getMethodMetadata<BeforeTestMetadata>(Before, this.instance);
        await PromiseUtil.step(lang.keys(methodMaps)
            .map(key => {
                let meta = methodMaps[key].find(m => isNumber(m.timeout));
                return this.runTimeout(
                    () => this.container.invoke(this.token, key, this.instance),
                    'sutie before ' + key,
                    meta ? meta.timeout : describe.timeout)
            }));
    }

    async runBeforeEach() {
        let methodMaps = getMethodMetadata<BeforeEachTestMetadata>(BeforeEach, this.instance);
        await PromiseUtil.step(lang.keys(methodMaps)
            .map(key => {
                let meta = methodMaps[key].find(m => isNumber(m.timeout));
                return this.runTimeout(
                    () => this.container.invoke(this.token, key, this.instance),
                    'before each ' + key,
                    meta ? meta.timeout : this.timeout);
            }));
    }

    async runTest() {
        let methodMaps = getMethodMetadata<TestCaseMetadata>(Test, this.instance);
        let keys = lang.keys(methodMaps);
        await PromiseUtil.step(
            keys
                .map(key => {
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

    async runCase(caseDesc: ICaseDescribe): Promise<any> {
        await this.runBeforeEach();
        return await this.runTimeout(
            () => this.container.invoke(this.token, caseDesc.key, this.instance),
            caseDesc.title,
            caseDesc.timeout);

    }

}
