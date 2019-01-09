import { IRunner, Runner, ModuleConfigure } from '@ts-ioc/bootstrap';
import {
    Token, getMethodMetadata, isNumber, lang, ContainerToken,
    IContainer, Inject, PromiseUtil, getOwnTypeMetadata, Defer, Injectable
} from '@ts-ioc/core';
import { Before } from '../decorators/Before';
import { BeforeEach } from '../decorators/BeforeEach';
import { Test } from '../decorators/Test';
import { Suite } from '../decorators/Suite';
import { BeforeTestMetadata, BeforeEachTestMetadata, TestCaseMetadata, SuiteMetadata } from '../metadata';
import { ISuiteDescribe, ICaseDescribe } from '../reports';
import { SuiteRunnerToken, ISuiteRunner } from './ISuiteRunner';


/**
 * Suite runner.
 *
 * @export
 * @class SuiteRunner
 * @implements {IRunner<any>}
 */
@Injectable(SuiteRunnerToken)
export class SuiteRunner extends Runner<any> implements ISuiteRunner {

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
        this.describe = metas.map(m => m.describe).filter(d => d).join('; ') || lang.getClassName(type);
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
        await PromiseUtil.step(
            lang.keys(methodMaps)
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
        await PromiseUtil.step(
            lang.keys(methodMaps)
                .map(key => {
                    let meta = methodMaps[key].find(m => isNumber(m.timeout));
                    return this.runTimeout(
                        () => this.container.invoke(this.token, key, this.instance),
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
                () => this.container.invoke(this.instance || this.token, caseDesc.key, this.instance),
                caseDesc.title,
                caseDesc.timeout);

        } catch (err) {
            caseDesc.error = err;
        }
        return caseDesc;
    }

}
