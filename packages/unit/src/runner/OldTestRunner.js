"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OldTestRunner = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const common_1 = require("@tsdi/common");
const assert_1 = require("../assert/assert");
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
};
const testkeys = Object.keys(gls);
/**
 * Suite runner.
 *
 * @export
 * @class SuiteRunner
 * @implements {IRunner<any>}
 */
let OldTestRunner = class OldTestRunner {
    constructor(injector) {
        this.injector = injector;
        this.suites = [];
        this.timeout = (3 * 60 * 60 * 1000);
    }
    get type() {
        return null;
    }
    async run() {
        await ioc_1.lang.step(this.suites.map(desc => desc.cases.length ? () => this.runSuite(desc) : () => Promise.resolve()));
    }
    registerGlobalScope() {
        testkeys.forEach(k => {
            gls[k] = common_1.global[k];
        });
        const suites = this.suites;
        // BDD style
        const describe = common_1.global.describe = (name, fn, superDesc) => {
            if (!(0, ioc_1.isFunction)(fn))
                return;
            const suiteDesc = {
                ...superDesc,
                describe: name,
                cases: []
            };
            suites.push(suiteDesc);
            common_1.global.describe = (subname, descrifn) => {
                describe(name + ' ' + subname, descrifn, suiteDesc);
            };
            common_1.global.it = (title, test, timeout) => {
                if (!(0, ioc_1.isFunction)(test))
                    return;
                suiteDesc.cases.push({ title: title, key: '', fn: test, timeout: timeout });
            };
            common_1.global.before = common_1.global.beforeAll = (beforefn, timeout) => {
                if (!(0, ioc_1.isFunction)(beforefn))
                    return;
                suiteDesc.before = suiteDesc.before || [];
                suiteDesc.before.push({
                    fn: beforefn,
                    timeout: timeout
                });
            };
            common_1.global.beforeEach = (beachfn, timeout) => {
                if (!(0, ioc_1.isFunction)(beachfn))
                    return;
                suiteDesc.beforeEach = suiteDesc.beforeEach || [];
                suiteDesc.beforeEach.push({
                    fn: beachfn,
                    timeout: timeout
                });
            };
            common_1.global.after = common_1.global.afterAll = (afterfn, timeout) => {
                if (!(0, ioc_1.isFunction)(afterfn))
                    return;
                suiteDesc.after = suiteDesc.after || [];
                suiteDesc.after.push({
                    fn: afterfn,
                    timeout: timeout
                });
            };
            common_1.global.afterEach = (aeachfn, timeout) => {
                if (!(0, ioc_1.isFunction)(aeachfn))
                    return;
                suiteDesc.afterEach = suiteDesc.afterEach || [];
                suiteDesc.afterEach.push({
                    fn: aeachfn,
                    timeout: timeout
                });
            };
            fn && fn();
            common_1.global.describe = describe;
        };
        // TDD style
        const suite = common_1.global.suite = function (name, fn, superDesc) {
            const suiteDesc = {
                ...superDesc,
                describe: name,
                cases: []
            };
            suites.push(suiteDesc);
            common_1.global.suite = (subname, suitefn) => {
                suite(name + ' ' + subname, suitefn, suiteDesc);
            };
            common_1.global.test = (title, test, timeout) => {
                suiteDesc.cases.push({ title: title, key: '', fn: test, timeout: timeout });
            };
            common_1.global.before = common_1.global.beforeAll = (test, timeout) => {
                suiteDesc.before = suiteDesc.before || [];
                suiteDesc.before.push({
                    fn: test,
                    timeout: timeout
                });
            };
            common_1.global.beforeEach = (test, timeout) => {
                suiteDesc.beforeEach = suiteDesc.beforeEach || [];
                suiteDesc.beforeEach.push({
                    fn: test,
                    timeout: timeout
                });
            };
            common_1.global.after = common_1.global.afterAll = (test, timeout) => {
                suiteDesc.after = suiteDesc.after || [];
                suiteDesc.after.push({
                    fn: test,
                    timeout: timeout
                });
            };
            common_1.global.afterEach = (test, timeout) => {
                suiteDesc.afterEach = suiteDesc.afterEach || [];
                suiteDesc.afterEach.push({
                    fn: test,
                    timeout: timeout
                });
            };
            fn && fn();
            common_1.global.suite = suite;
        };
    }
    unregisterGlobalScope() {
        // reset to default.
        testkeys.forEach(k => {
            common_1.global[k] = gls[k];
        });
    }
    async runSuite(desc) {
        await this.runBefore(desc);
        await this.runTest(desc);
        await this.runAfter(desc);
    }
    runTimeout(fn, describe, timeout) {
        const defer = ioc_1.lang.defer();
        let timer = setTimeout(() => {
            if (timer) {
                clearTimeout(timer);
                const assert = this.injector.get(assert_1.Assert);
                const err = new assert.AssertionError({
                    message: `${describe}, timeout ${timeout}`,
                    stackStartFunction: fn,
                    stackStartFn: fn
                });
                defer.reject(err);
            }
        }, timeout || this.timeout);
        // Mocha Done callback support
        const done = (err) => {
            clearTimeout(timer);
            timer = null;
            if (err) {
                defer.reject(err);
            }
            else {
                defer.resolve();
            }
        };
        try {
            const result = fn?.(done);
            // If function returns a Promise, handle it
            // If function doesn't return Promise (sync test or undefined), it's complete immediately
            // or it will call done() later for callback-style async tests
            if (result !== undefined && result !== null && typeof result.then === 'function') {
                Promise.resolve(result)
                    .then(r => {
                    if (timer) {
                        clearTimeout(timer);
                        timer = null;
                        defer.resolve(r);
                    }
                })
                    .catch(err => {
                    if (timer) {
                        clearTimeout(timer);
                        timer = null;
                        defer.reject(err);
                    }
                });
            }
            else if (result === undefined) {
                // For sync tests or tests that will use done callback
                // Do nothing here - wait for done() to be called or timer timeout
                // Note: if test doesn't need done callback (sync test without params),
                // it should complete immediately. Check if function expects done parameter.
                if (fn && fn.length === 0) {
                    // Function doesn't expect any parameter (sync test), complete immediately
                    clearTimeout(timer);
                    timer = null;
                    defer.resolve(result);
                }
            }
            else {
                // Function returned a non-Promise value (sync test with return value)
                clearTimeout(timer);
                timer = null;
                defer.resolve(result);
            }
        }
        catch (err) {
            clearTimeout(timer);
            timer = null;
            defer.reject(err);
        }
        return defer.promise;
    }
    async runHook(describe, action, desc) {
        await ioc_1.lang.step((describe[action] || [])
            .map((hk) => () => this.runTimeout(hk.fn, desc, hk.timeout || describe.timeout)));
    }
    async runBefore(describe) {
        await this.runHook(describe, 'before', 'suite before').catch(err => {
            this.runAfter(describe);
            throw err;
        });
    }
    async runBeforeEach(describe) {
        await this.runHook(describe, 'beforeEach', 'before each');
    }
    async runAfterEach(describe) {
        await this.runHook(describe, 'afterEach', 'after case each');
    }
    async runAfter(describe) {
        await this.runHook(describe, 'after', 'suite after');
    }
    async runTest(desc) {
        await ioc_1.lang.step(desc.cases.map(caseDesc => () => this.runCase(caseDesc, desc)));
    }
    async runCase(caseDesc, suiteDesc) {
        try {
            await this.runBeforeEach(suiteDesc);
            await this.runTimeout(caseDesc.fn, caseDesc.title, caseDesc.timeout);
        }
        catch (err) {
            caseDesc.error = err;
        }
        finally {
            try {
                await this.runAfterEach(suiteDesc);
            }
            catch (err) {
                caseDesc.error = err;
            }
        }
        return caseDesc;
    }
};
exports.OldTestRunner = OldTestRunner;
exports.OldTestRunner = OldTestRunner = tslib_1.__decorate([
    (0, ioc_1.Singleton)(),
    tslib_1.__metadata("design:paramtypes", [ioc_1.Injector])
], OldTestRunner);
//# sourceMappingURL=OldTestRunner.js.map