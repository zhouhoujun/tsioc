"use strict";
var ConsoleModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsoleModule = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const unit_1 = require("@tsdi/unit");
const platform_server_1 = require("@tsdi/platform-server");
const log4js_1 = require("@tsdi/platform-server/log4js");
const V8CoverageCollector_1 = require("./V8CoverageCollector");
const console_1 = require("./console");
const coverage_1 = require("./coverage");
let ConsoleModule = ConsoleModule_1 = class ConsoleModule {
    static withOptions(coverage) {
        const providers = coverage ? [{ provide: unit_1.UNIT_REPORTES, useExisting: coverage_1.V8CoverageReporter, multi: true }] : [];
        return {
            providers,
            module: ConsoleModule_1
        };
    }
};
exports.ConsoleModule = ConsoleModule;
exports.ConsoleModule = ConsoleModule = ConsoleModule_1 = tslib_1.__decorate([
    (0, ioc_1.Module)({
        imports: [
            platform_server_1.ServerModule,
            log4js_1.ServerLog4Module
        ],
        providers: [
            V8CoverageCollector_1.V8CoverageCollector,
            console_1.ConsoleReporter,
            coverage_1.V8CoverageReporter,
            { provide: unit_1.UNIT_REPORTES, useExisting: console_1.ConsoleReporter, multi: true }
        ]
    })
], ConsoleModule);
//# sourceMappingURL=module.js.map