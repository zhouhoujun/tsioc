"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AopModule = exports.AopProvider = void 0;
exports.provideAop = provideAop;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const aop_1 = require("./impl/aop");
const Advisor_1 = require("./Advisor");
const matcher_1 = require("./impl/matcher");
const proceed_1 = require("./impl/proceed");
const Proceeding_1 = require("./Proceeding");
const AdviceMatcher_1 = require("./AdviceMatcher");
let AopProvider = class AopProvider {
    /**
     * register aop for container.
     */
    setup(injector) {
        const runtime = injector.getRuntime();
        if (runtime.has(Advisor_1.Advisor))
            return;
        const proceeding = new proceed_1.ProceedingScope(runtime);
        const matcher = new matcher_1.DefaultAdviceMatcher(runtime);
        runtime.set(Advisor_1.Advisor, new Advisor_1.Advisor(matcher))
            .set(AdviceMatcher_1.AdviceMatcher, matcher)
            .set(Proceeding_1.Proceeding, proceeding)
            .set(proceed_1.ProceedingScope, proceeding);
        const handler = runtime.getInstanceHandler();
        handler.use(aop_1.matchInterceptor, handler.getIndexOf(ioc_1.methodInterceptor));
        handler.use(aop_1.pointcutInterceptor, handler.getIndexOf(ioc_1.ctorArgsInterceptor) + 1);
    }
};
exports.AopProvider = AopProvider;
tslib_1.__decorate([
    tslib_1.__param(0, (0, ioc_1.Inject)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [ioc_1.Injector]),
    tslib_1.__metadata("design:returntype", void 0)
], AopProvider.prototype, "setup", null);
exports.AopProvider = AopProvider = tslib_1.__decorate([
    (0, ioc_1.Autorun)({
        providedIn: 'root',
        propertyKey: 'setup'
    })
], AopProvider);
/**
 * aop ext for ioc. auto run setup after registered.
 * @export
 * @class AopModule
 */
let AopModule = class AopModule {
};
exports.AopModule = AopModule;
exports.AopModule = AopModule = tslib_1.__decorate([
    (0, ioc_1.Module)({
        providers: [
            AopProvider
        ]
    })
], AopModule);
function provideAop() {
    return {
        providers: [
            AopProvider
        ]
    };
}
//# sourceMappingURL=aop.module.js.map