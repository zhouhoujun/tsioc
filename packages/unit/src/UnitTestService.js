"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnitTestService = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const core_1 = require("@tsdi/core");
const OldTestRunner_1 = require("./runner/OldTestRunner");
const TestReport_1 = require("./reports/TestReport");
const configure_1 = require("./configure");
/**
 * Suite runner.
 */
let UnitTestService = class UnitTestService {
    async run(ctx) {
        const config = ctx.resolve(configure_1.UNITTESTCONFIGURE);
        const src = config.src;
        let suites = [];
        const oldRunner = ctx.resolve(OldTestRunner_1.OldTestRunner);
        const loader = ctx.get(core_1.ModuleLoader);
        oldRunner.registerGlobalScope();
        if ((0, ioc_1.isString)(src)) {
            suites = await loader.loadType({ files: [src], basePath: ctx.baseURL });
        }
        else if ((0, ioc_1.isType)(src)) {
            suites = [src];
        }
        else if ((0, ioc_1.isArray)(src)) {
            if (src.some(t => (0, ioc_1.isType)(t))) {
                suites = src;
            }
            else {
                suites = await loader.loadType({ files: src, basePath: ctx.baseURL });
            }
        }
        oldRunner.unregisterGlobalScope();
        await oldRunner.run();
        const { unitSuites, e2eSuites } = suites.reduce((prev, cur) => {
            if (cur) {
                const sdef = (0, ioc_1.getDef)(cur);
                if (sdef.suite) {
                    if (sdef.e2e) {
                        prev.e2eSuites.push(cur);
                    }
                    else {
                        prev.unitSuites.push(cur);
                    }
                }
            }
            return prev;
        }, { unitSuites: [], e2eSuites: [] });
        if (unitSuites.length)
            await (0, ioc_1.step)(unitSuites.map(s => () => ctx.bootstrap(s)));
        if (e2eSuites.length)
            await (0, ioc_1.step)(e2eSuites.map(s => () => ctx.bootstrap(s)));
        await ctx.resolve(TestReport_1.DefaultTestReport).report();
    }
};
exports.UnitTestService = UnitTestService;
tslib_1.__decorate([
    (0, core_1.Runner)(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [core_1.ApplicationContext]),
    tslib_1.__metadata("design:returntype", Promise)
], UnitTestService.prototype, "run", null);
exports.UnitTestService = UnitTestService = tslib_1.__decorate([
    (0, ioc_1.Injectable)()
], UnitTestService);
//# sourceMappingURL=UnitTestService.js.map