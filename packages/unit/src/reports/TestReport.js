"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultTestReport = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const Reporter_1 = require("./Reporter");
const core_1 = require("@tsdi/core");
/**
 * default test report. implements {@link TestReport}
 *
 * @export
 * @class DefaultTestReport
 * @implements {TestReport}
 */
let DefaultTestReport = class DefaultTestReport {
    getReports() {
        if (!this.reports) {
            this.reports = this.ctx.get(Reporter_1.UNIT_REPORTES);
        }
        return this.reports || [];
    }
    getRealtimeReports() {
        if (!this.relRreports) {
            this.relRreports = this.getReports().filter(rep => rep instanceof Reporter_1.RealtimeReporter);
        }
        return this.relRreports || [];
    }
    constructor(ctx, hrtime) {
        this.ctx = ctx;
        this.hrtime = hrtime;
        this.suites = new Map();
    }
    track(error) {
        this.reports.forEach(rep => {
            rep.track(error);
        });
    }
    addSuite(suit, describe) {
        if (!this.suites.has(suit)) {
            describe.start = this.hrtime.hrtime();
            // init suite must has no completed cases.
            if (describe.cases.length) {
                describe = { ...describe };
            }
            describe.cases = [];
            this.suites.set(suit, describe);
            this.getRealtimeReports().forEach(async (rep) => {
                rep.renderSuite(describe);
            });
        }
    }
    getSuite(suit) {
        return this.suites.get(suit);
    }
    setSuiteCompleted(suit) {
        const suite = this.getSuite(suit);
        if (suite) {
            suite.used = this.hrtime.hrtime(suite.start);
        }
    }
    addCase(suit, testCase) {
        if (this.suites.has(suit)) {
            testCase.start = this.hrtime.hrtime();
            this.suites.get(suit)?.cases.push(testCase);
        }
    }
    getCase(suit, test) {
        const suite = this.getSuite(suit);
        if (suite) {
            let tCase = suite.cases.find(c => c.key === test);
            if (!tCase) {
                tCase = suite.cases.find(c => c.title === test);
            }
            return tCase;
        }
        return null;
    }
    setCaseCompleted(testCase) {
        testCase.used = this.hrtime.hrtime(testCase.start);
        this.getRealtimeReports().forEach(async (rep) => {
            rep.renderCase(testCase);
        });
    }
    async report() {
        const sus = Array.from(this.suites.values());
        const used = this.hrtime.hrtime(sus[0].start);
        await Promise.all(this.getReports().map(rep => {
            if (rep) {
                return rep.render(sus, used);
            }
            return null;
        }));
    }
};
exports.DefaultTestReport = DefaultTestReport;
exports.DefaultTestReport = DefaultTestReport = tslib_1.__decorate([
    (0, ioc_1.Singleton)(),
    tslib_1.__metadata("design:paramtypes", [core_1.ApplicationContext, core_1.HrtimeFormatter])
], DefaultTestReport);
//# sourceMappingURL=TestReport.js.map