"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuiteInvocationFactory = exports.SuiteInvocation = exports.SuiteRunner = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const metadata_1 = require("../metadata");
const assert_1 = require("../assert/assert");
const Runner_1 = require("./Runner");
const E2ERunner_1 = require("./E2ERunner");
/**
 * Suite runner.
 *
 * @export
 * @class SuiteRunner
 * @implements {UnitRunner<T>}
 */
let SuiteRunner = class SuiteRunner extends Runner_1.UnitRunner {
    constructor(invocation) {
        super();
        this.invocation = invocation;
    }
    get type() {
        return this.invocation.type;
    }
    async run() {
        const desc = this.getSuiteDescribe();
        await this.runSuite(desc);
    }
    /**
     * get suite describe.
     *
     * @returns {SuiteDescribe}
     */
    getSuiteDescribe() {
        const meta = this.invocation.classRef.getAnnotation();
        this.timeout = (meta && meta.timeout) ? meta.timeout : (3 * 60 * 60 * 1000);
        this.describe = meta.describe || this.invocation.classRef.className;
        return {
            timeout: this.timeout,
            describe: this.describe,
            cases: []
        };
    }
    async runSuite(desc) {
        await this.runBefore(desc);
        await this.runTest(desc);
        await this.runAfter(desc);
    }
    runTimeout(key, describe, timeout) {
        const instance = this.invocation.instance;
        const defer = ioc_1.lang.defer();
        const context = this.invocation.injector;
        let timer = setTimeout(() => {
            if (timer) {
                clearTimeout(timer);
                const assert = context.get(assert_1.Assert);
                const err = new assert.AssertionError({
                    message: `${describe}, timeout ${timeout}`,
                    stackStartFunction: instance[key],
                    stackStartFn: instance[key]
                });
                defer.reject(err);
            }
        }, timeout || this.timeout);
        Promise.resolve(this.invocation.invoke(key))
            .then(r => {
            clearTimeout(timer);
            timer = null;
            defer.resolve(r);
        })
            .catch(err => {
            clearTimeout(timer);
            timer = null;
            defer.reject(err);
        });
        return defer.promise;
    }
    async runBefore(describe) {
        const befores = this.invocation.classRef.getDefines(metadata_1.Before);
        await ioc_1.lang.step(befores.map(df => () => {
            return this.runTimeout(df.propertyKey, 'sutie before ' + df.propertyKey, df.metadata.timeout);
        })).catch(err => {
            this.runAfter(describe);
            throw err;
        });
    }
    async runBeforeEach() {
        const befores = this.invocation.classRef.getDefines(metadata_1.BeforeEach);
        await ioc_1.lang.step(befores.map(df => () => {
            return this.runTimeout(df.propertyKey, 'before each ' + df.propertyKey, df.metadata.timeout);
        }));
    }
    async runAfterEach() {
        const afters = this.invocation.classRef.getDefines(metadata_1.AfterEach);
        await ioc_1.lang.step(afters.map(df => () => {
            return this.runTimeout(df.propertyKey, 'after each ' + df.propertyKey, df.metadata.timeout);
        }));
    }
    async runAfter(describe) {
        const afters = this.invocation.classRef.getDefines(metadata_1.After);
        await ioc_1.lang.step(afters.map(df => () => {
            return this.runTimeout(df.propertyKey, 'sutie after ' + df.propertyKey, df.metadata.timeout);
        }));
    }
    async runTest(desc) {
        const tests = this.invocation.classRef.getDefines(metadata_1.Test);
        await ioc_1.lang.step(tests.map(df => {
            return {
                key: df.propertyKey,
                order: df.metadata.setp,
                timeout: df.metadata.timeout,
                title: df.metadata.title ?? df.propertyKey
            };
        })
            .sort((a, b) => {
            return b.order - a.order;
        })
            .map(caseDesc => {
            return () => this.runCase(caseDesc);
        }));
    }
    async runCase(caseDesc) {
        try {
            await this.runBeforeEach();
            await this.runTimeout(caseDesc.key, caseDesc.title, caseDesc.timeout);
        }
        catch (err) {
            caseDesc.error = err;
        }
        finally {
            try {
                await this.runAfterEach();
            }
            catch (err) {
                caseDesc.error = err;
            }
        }
        return caseDesc;
    }
};
exports.SuiteRunner = SuiteRunner;
exports.SuiteRunner = SuiteRunner = tslib_1.__decorate([
    (0, ioc_1.Injectable)({ static: false }),
    tslib_1.__metadata("design:paramtypes", [ioc_1.Invocation])
], SuiteRunner);
class SuiteInvocation extends ioc_1.AbstractInvocation {
    process(context, resolveCtx) {
        const meta = this.classRef.getAnnotation();
        if (meta?.e2e) {
            return this.injector.resolve(E2ERunner_1.E2ERunner).run();
        }
        return this.injector.resolve(SuiteRunner).run();
    }
}
exports.SuiteInvocation = SuiteInvocation;
class SuiteInvocationFactory extends ioc_1.AbstractInvocationFactory {
    createInstance(typeRef, injector, options) {
        return new SuiteInvocation(typeRef, injector, options);
    }
}
exports.SuiteInvocationFactory = SuiteInvocationFactory;
//# sourceMappingURL=SuiteRunner.js.map