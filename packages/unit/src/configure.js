"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnitTestConfigureService = exports.UNITTESTCONFIGURE = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const core_1 = require("@tsdi/core");
const assert = require("assert");
const assert_1 = require("./assert/assert");
const expects_1 = require("./assert/expects");
const Reporter_1 = require("./reports/Reporter");
const expect = require('expect');
exports.UNITTESTCONFIGURE = (0, ioc_1.token)('UNITTESTCONFIGURE');
let UnitTestConfigureService = class UnitTestConfigureService {
    async configureService(ctx) {
        const config = ctx.get(exports.UNITTESTCONFIGURE);
        if (!ctx.has(assert_1.Assert)) {
            ioc_1.InjectUtil.setValue(ctx, assert_1.Assert, assert);
        }
        if (!ctx.has(expects_1.ExpectToken)) {
            ioc_1.InjectUtil.setValue(ctx, expects_1.ExpectToken, expect.default || expect);
        }
        // const reps = ctx.get(Application).loadTypes.filter(l => lang.isBaseOf(l, AbstractReporter));
        // if (reps.length) {
        //     InjectUtil.inject(ctx, reps.map(r => ({ provide: UNIT_REPORTES, useExisting: r, multi: true } as Provider)))
        // }
        if (config.reporters && config.reporters.length) {
            ioc_1.InjectUtil.inject(ctx, (0, ioc_1.toProviders)(Reporter_1.UNIT_REPORTES, config.reporters, true));
        }
        if (config.coverage?.enabled) {
            this.configureCoverageReporters(ctx, config);
        }
    }
    configureCoverageReporters(ctx, config) {
        const reporters = ctx.get(Reporter_1.UNIT_REPORTES, []);
        const coverageOptions = config.coverage || { enabled: false };
        for (const reporter of reporters) {
            if (this.isCoverageReporter(reporter)) {
                reporter.setOptions(coverageOptions);
            }
        }
    }
    isCoverageReporter(reporter) {
        return reporter instanceof Reporter_1.CoverageReporter;
    }
};
exports.UnitTestConfigureService = UnitTestConfigureService;
tslib_1.__decorate([
    (0, core_1.Startup)(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [core_1.ApplicationContext]),
    tslib_1.__metadata("design:returntype", Promise)
], UnitTestConfigureService.prototype, "configureService", null);
exports.UnitTestConfigureService = UnitTestConfigureService = tslib_1.__decorate([
    (0, ioc_1.Injectable)()
], UnitTestConfigureService);
//# sourceMappingURL=configure.js.map