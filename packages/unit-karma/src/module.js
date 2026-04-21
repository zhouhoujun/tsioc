"use strict";
var KarmaModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.KarmaModule = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const karma_1 = require("./karma");
const BrowserCoverageCollector_1 = require("./BrowserCoverageCollector");
const coverage_1 = require("./coverage");
const unit_1 = require("@tsdi/unit");
const BrowserTestCompiler_1 = require("./compiler/BrowserTestCompiler");
const BrowserLauncher_1 = require("./launcher/BrowserLauncher");
const TestServer_1 = require("./server/TestServer");
const BrowserTestRunner_1 = require("./runner/BrowserTestRunner");
let KarmaModule = KarmaModule_1 = class KarmaModule {
    static withOptions(coverage) {
        const providers = coverage ? [{ provide: unit_1.UNIT_REPORTES, useExisting: coverage_1.KarmaCoverageReporter, multi: true }] : [];
        return {
            providers,
            module: KarmaModule_1
        };
    }
};
exports.KarmaModule = KarmaModule;
exports.KarmaModule = KarmaModule = KarmaModule_1 = tslib_1.__decorate([
    (0, ioc_1.Module)({
        providers: [
            BrowserCoverageCollector_1.BrowserCoverageCollector,
            karma_1.KarmaReporter,
            coverage_1.KarmaCoverageReporter,
            { provide: unit_1.UNIT_REPORTES, useExisting: karma_1.KarmaReporter, multi: true },
            // Browser test infrastructure
            BrowserTestCompiler_1.BrowserTestCompiler,
            TestServer_1.TestServer,
            BrowserLauncher_1.ChromeLauncher,
            BrowserLauncher_1.JsdomLauncher,
            BrowserLauncher_1.AutoBrowserLauncher,
            BrowserTestRunner_1.BrowserTestRunner
        ]
    })
], KarmaModule);
//# sourceMappingURL=module.js.map