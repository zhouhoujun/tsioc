"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunAspect = void 0;
const tslib_1 = require("tslib");
const logger_1 = require("@tsdi/logger");
const aop_1 = require("@tsdi/aop");
const TestReport_1 = require("../reports/TestReport");
const SuiteRunner_1 = require("../runner/SuiteRunner");
const OldTestRunner_1 = require("../runner/OldTestRunner");
const E2ERunner_1 = require("../runner/E2ERunner");
let RunAspect = class RunAspect extends logger_1.LogAspect {
    getReport() {
        if (!this.report) {
            this.report = this.injector.get(TestReport_1.DefaultTestReport);
        }
        return this.report;
    }
    beforeError(joinPoint) {
        this.getReport().track(joinPoint.throwing);
    }
    beforeEachError(joinPoint) {
        this.getReport().track(joinPoint.throwing);
    }
    afterEachError(joinPoint) {
        this.getReport().track(joinPoint.throwing);
    }
    afterError(joinPoint) {
        this.getReport().track(joinPoint.throwing);
    }
    logSuite(joinPoint) {
        const runner = joinPoint.target;
        const argDesc = joinPoint.args?.[0];
        switch (joinPoint.state) {
            case aop_1.JoinpointState.Before:
                let describe = 'Unknown';
                let cases = [];
                let timeout;
                let start;
                let used;
                if (argDesc) {
                    describe = argDesc.describe || runner.type?.name || 'Unknown';
                    cases = argDesc.cases || [];
                    timeout = argDesc.timeout;
                    start = argDesc.start;
                    used = argDesc.used;
                }
                else {
                    describe = runner.type?.name || 'Unknown';
                }
                const suiteDesc = {
                    describe,
                    cases,
                    timeout,
                    start,
                    used
                };
                this.getReport().addSuite(runner.type || describe, suiteDesc);
                break;
            case aop_1.JoinpointState.AfterReturning:
            case aop_1.JoinpointState.AfterThrowing:
                this.getReport().setSuiteCompleted(runner.type || argDesc?.describe);
                break;
        }
    }
    logTestCase(joinPoint) {
        const desc = joinPoint.args?.[0];
        const suiteDesc = joinPoint.args && joinPoint.args.length > 1 ? joinPoint.args[1] : {};
        const runner = joinPoint.target;
        switch (joinPoint.state) {
            case aop_1.JoinpointState.Before:
                this.getReport().addCase(runner.type || suiteDesc?.describe, desc);
                break;
            case aop_1.JoinpointState.AfterReturning:
            case aop_1.JoinpointState.AfterThrowing:
                this.getReport().setCaseCompleted(desc);
                break;
        }
    }
};
exports.RunAspect = RunAspect;
tslib_1.__decorate([
    (0, aop_1.AfterThrowing)('execution(*.runBefore)'),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [aop_1.JoinPoint]),
    tslib_1.__metadata("design:returntype", void 0)
], RunAspect.prototype, "beforeError", null);
tslib_1.__decorate([
    (0, aop_1.AfterThrowing)('execution(*.runBeforeEach)'),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [aop_1.JoinPoint]),
    tslib_1.__metadata("design:returntype", void 0)
], RunAspect.prototype, "beforeEachError", null);
tslib_1.__decorate([
    (0, aop_1.AfterThrowing)('execution(*.runAfterEach)'),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [aop_1.JoinPoint]),
    tslib_1.__metadata("design:returntype", void 0)
], RunAspect.prototype, "afterEachError", null);
tslib_1.__decorate([
    (0, aop_1.AfterThrowing)('execution(*.runAfter)'),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [aop_1.JoinPoint]),
    tslib_1.__metadata("design:returntype", void 0)
], RunAspect.prototype, "afterError", null);
tslib_1.__decorate([
    (0, aop_1.Around)('execution(*.runSuite)'),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [aop_1.JoinPoint]),
    tslib_1.__metadata("design:returntype", void 0)
], RunAspect.prototype, "logSuite", null);
tslib_1.__decorate([
    (0, aop_1.Around)('execution(*.runCase)'),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [aop_1.JoinPoint]),
    tslib_1.__metadata("design:returntype", void 0)
], RunAspect.prototype, "logTestCase", null);
exports.RunAspect = RunAspect = tslib_1.__decorate([
    (0, aop_1.Aspect)({
        within: [SuiteRunner_1.SuiteRunner, OldTestRunner_1.OldTestRunner, E2ERunner_1.E2ERunner],
        singleton: true
    })
], RunAspect);
//# sourceMappingURL=RunAspect.js.map