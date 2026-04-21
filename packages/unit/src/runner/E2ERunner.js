"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.E2ERunner = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const metadata_1 = require("../metadata");
const assert_1 = require("../assert/assert");
const Runner_1 = require("./Runner");
const E2EMetadata_1 = require("../e2e/E2EMetadata");
let E2ERunner = class E2ERunner extends Runner_1.UnitRunner {
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
    getSuiteDescribe() {
        const meta = this.invocation.classRef.getAnnotation();
        this.timeout = (meta && meta.timeout) ? meta.timeout : (3 * 60 * 60 * 1000);
        this.describe = meta.describe || this.invocation.classRef.className;
        return {
            timeout: this.timeout,
            describe: this.describe,
            cases: [],
            scenarioSteps: []
        };
    }
    getScenarioSteps() {
        const steps = [];
        const givens = this.invocation.classRef.getDefines(E2EMetadata_1.Given);
        givens.forEach(df => {
            steps.push({
                ...df.metadata,
                stepType: 'Given',
                method: df.propertyKey
            });
        });
        const whens = this.invocation.classRef.getDefines(E2EMetadata_1.When);
        whens.forEach(df => {
            steps.push({
                ...df.metadata,
                stepType: 'When',
                method: df.propertyKey
            });
        });
        const thens = this.invocation.classRef.getDefines(E2EMetadata_1.Then);
        thens.forEach(df => {
            steps.push({
                ...df.metadata,
                stepType: 'Then',
                method: df.propertyKey
            });
        });
        const ands = this.invocation.classRef.getDefines(E2EMetadata_1.And);
        ands.forEach(df => {
            steps.push({
                ...df.metadata,
                stepType: 'And',
                method: df.propertyKey
            });
        });
        return steps.sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    async runSuite(desc) {
        // Build scenario steps
        desc.scenarioSteps = this.getScenarioSteps();
        await this.runBefore(desc);
        await this.runScenario(desc);
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
            return this.runTimeout(df.propertyKey, 'suite before ' + df.propertyKey, df.metadata.timeout);
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
            return this.runTimeout(df.propertyKey, 'suite after ' + df.propertyKey, df.metadata.timeout);
        }));
    }
    async runScenario(desc) {
        const tests = this.invocation.classRef.getDefines(metadata_1.Test);
        if (tests && tests.length > 0) {
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
        else {
            await this.runScenarioSteps(desc);
        }
    }
    async runScenarioSteps(desc) {
        const steps = desc.scenarioSteps || [];
        for (const step of steps) {
            await this.runBeforeEach();
            try {
                await this.runTimeout(step.method, `${step.stepType}: ${step.description || step.keyword}`, step.timeout);
            }
            catch (err) {
                const errorStep = {
                    title: `${step.stepType}: ${step.description || step.keyword}`,
                    key: step.method,
                    error: err
                };
                desc.cases.push(errorStep);
                throw err;
            }
            finally {
                await this.runAfterEach();
            }
        }
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
exports.E2ERunner = E2ERunner;
exports.E2ERunner = E2ERunner = tslib_1.__decorate([
    (0, ioc_1.Injectable)({ static: false }),
    tslib_1.__metadata("design:paramtypes", [ioc_1.Invocation])
], E2ERunner);
//# sourceMappingURL=E2ERunner.js.map