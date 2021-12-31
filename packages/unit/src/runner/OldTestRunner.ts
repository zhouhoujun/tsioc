import { lang, Singleton, isFunction, Injector, Type } from '@tsdi/ioc';
import { Assert } from '../assert/assert';
import { SuiteDescribe, ICaseDescribe } from '../reports/interface';
import { UnitRunner } from './Runner';


declare let window: any;
declare let global: any;

const gls = {
    describe: undefined,
    suite: undefined,
    it: undefined,
    test: undefined,
    before: undefined,
    beforeAll: undefined,
    beforeEach: undefined,
    after: undefined,
    afterAll: undefined,
    afterEach: undefined
} as any;
const testkeys = Object.keys(gls);

const globals = typeof window !== 'undefined' ? window : global;

/**
 * Suite runner.
 *
 * @export
 * @class SuiteRunner
 * @implements {IRunner<any>}
 */
@Singleton()
export class OldTestRunner implements UnitRunner {


    describe!: string;
    private timeout: number;
    suites: SuiteDescribe[];

    constructor(private injector: Injector) {
        this.suites = [];
        this.timeout = (3 * 60 * 60 * 1000) as number;
    }

    get type(): Type<any> {
        return null!;
    }


    async run(): Promise<void> {
        try {
            await lang.step(this.suites.map(desc => desc.cases.length ? () => this.runSuite(desc) : () => Promise.resolve()));
        } catch (err) {
            throw err;
        }
    }

    registerGlobalScope() {
        testkeys.forEach(k => {
            gls[k] = globals[k];
        });

        let suites = this.suites;

        // BDD style
        let describe = globals.describe = (name: string, fn: () => any, superDesc?: SuiteDescribe) => {
            if (!isFunction(fn)) return;
            let suiteDesc = {
                ...superDesc,
                describe: name,
                cases: []
            } as SuiteDescribe;

            suites.push(suiteDesc);

            globals.describe = (subname: string, descrifn: () => any) => {
                describe(name + ' ' + subname, descrifn, suiteDesc);
            }

            globals.it = (title: string, test: () => any, timeout?: number) => {
                if (!isFunction(test)) return;
                suiteDesc.cases.push({ title: title, key: '', fn: test, timeout: timeout })
            }
            globals.before = globals.beforeAll = (beforefn: () => any, timeout?: number) => {
                if (!isFunction(fn)) return;
                suiteDesc.before = suiteDesc.before || [];
                suiteDesc.before.push({
                    fn: beforefn,
                    timeout: timeout
                })
            }
            globals.beforeEach = (beachfn: () => any, timeout?: number) => {
                if (!isFunction(beachfn)) return;
                suiteDesc.beforeEach = suiteDesc.beforeEach || [];
                suiteDesc.beforeEach.push({
                    fn: beachfn,
                    timeout: timeout
                });
            }
            globals.after = globals.afterAll = (afterfn: () => any, timeout?: number) => {
                if (!isFunction(afterfn)) return;
                suiteDesc.after = suiteDesc.after || [];
                suiteDesc.after.push({
                    fn: afterfn,
                    timeout: timeout
                });
            }
            globals.afterEach = (aeachfn: () => any, timeout?: number) => {
                if (!isFunction(aeachfn)) return;
                suiteDesc.afterEach = suiteDesc.afterEach || [];
                suiteDesc.afterEach.push({
                    fn: aeachfn,
                    timeout: timeout
                });
            }
            fn && fn();
            globals.describe = describe;
        };

        // TDD style
        let suite = globals.suite = function (name: string, fn: () => any, superDesc?: SuiteDescribe) {
            let suiteDesc = {
                ...superDesc,
                describe: name,
                cases: []
            } as SuiteDescribe;
            suites.push(suiteDesc);

            globals.suite = (subname: string, suitefn: () => any) => {
                suite(name + ' ' + subname, suitefn, suiteDesc);
            }
            globals.test = (title: string, test: () => any, timeout?: number) => {
                suiteDesc.cases.push({ title: title, key: '', fn: test, timeout: timeout })
            }
            globals.before = globals.beforeAll = (test: () => any, timeout?: number) => {
                suiteDesc.before = suiteDesc.before || [];
                suiteDesc.before.push({
                    fn: test,
                    timeout: timeout
                })
            }
            globals.beforeEach = (test: () => any, timeout?: number) => {
                suiteDesc.beforeEach = suiteDesc.beforeEach || [];
                suiteDesc.beforeEach.push({
                    fn: test,
                    timeout: timeout
                });
            }
            globals.after = globals.afterAll = (test: () => any, timeout?: number) => {
                suiteDesc.after = suiteDesc.after || [];
                suiteDesc.after.push({
                    fn: test,
                    timeout: timeout
                });
            }
            globals.afterEach = (test: () => any, timeout?: number) => {
                suiteDesc.afterEach = suiteDesc.afterEach || [];
                suiteDesc.afterEach.push({
                    fn: test,
                    timeout: timeout
                });
            }
            fn && fn();
            globals.suite = suite;
        };
    }

    unregisterGlobalScope() {
        // reset to default.
        testkeys.forEach(k => {
            globals[k] = gls[k];
        });
    }

    async runSuite(desc: SuiteDescribe): Promise<void> {
        await this.runBefore(desc);
        await this.runTest(desc);
        await this.runAfter(desc);
    }

    runTimeout(fn: Function | undefined, describe: string, timeout?: number): Promise<any> {
        let defer = lang.defer();
        let timer = setTimeout(() => {
            if (timer) {
                clearTimeout(timer);
                let assert = this.injector.resolve(Assert);
                let err = new assert.AssertionError({
                    message: `${describe}, timeout ${timeout}`,
                    stackStartFunction: fn,
                    stackStartFn: fn
                });
                defer.reject(err);
            }
        }, timeout || this.timeout);

        Promise.resolve(fn?.(() => defer.resolve()))
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

    async runHook(describe: SuiteDescribe, action: string, desc: string) {
        await lang.step(
            ((describe as any)[action] || [])
                .map((hk: ICaseDescribe) => () => this.runTimeout(
                    hk.fn,
                    desc,
                    hk.timeout || describe.timeout)));
    }

    async runBefore(describe: SuiteDescribe) {
        await this.runHook(describe, 'before', 'suite before');
    }

    async runBeforeEach(describe: SuiteDescribe) {
        await this.runHook(describe, 'beforeEach', 'before each');
    }

    async runAfterEach(describe: SuiteDescribe) {
        await this.runHook(describe, 'afterEach', 'after case each');
    }

    async runAfter(describe: SuiteDescribe) {
        await this.runHook(describe, 'after', 'suite after');
    }

    async runTest(desc: SuiteDescribe) {
        await lang.step(desc.cases.map(caseDesc => () => this.runCase(caseDesc, desc)));
    }

    async runCase(caseDesc: ICaseDescribe, suiteDesc?: SuiteDescribe): Promise<ICaseDescribe> {
        try {
            await this.runBeforeEach(suiteDesc!);
            await this.runTimeout(
                caseDesc.fn,
                caseDesc.title,
                caseDesc.timeout);

            await this.runAfterEach(suiteDesc!);

        } catch (err) {
            caseDesc.error = err as Error;
        }
        return caseDesc;
    }
}
