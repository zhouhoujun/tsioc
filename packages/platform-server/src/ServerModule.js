"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerModule = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const core_1 = require("@tsdi/core");
const logger_1 = require("@tsdi/logger");
const common_1 = require("@tsdi/common");
const toAbsolute_1 = require("./toAbsolute");
const NodeModuleLoader_1 = require("./NodeModuleLoader");
const formater_1 = require("./formater");
const args_1 = require("./args");
const exit_1 = require("./exit");
const hrtime_1 = require("./hrtime");
let ServerModule = class ServerModule {
};
exports.ServerModule = ServerModule;
exports.ServerModule = ServerModule = tslib_1.__decorate([
    (0, ioc_1.Module)({
        providedIn: 'root',
        providers: [
            {
                provide: core_1.ApplicationArguments,
                useFactory: () => {
                    const args = new args_1.ServerApplicationArguments(process.env, process.argv.slice(2));
                    args.mergeEnvironment({ baseURL: (0, toAbsolute_1.runMainPath)() });
                    return args;
                }
            },
            { provide: core_1.ModuleLoader, useValue: new NodeModuleLoader_1.NodeModuleLoader() },
            { provide: core_1.HrtimeFormatter, useClass: hrtime_1.ServerHrtimeFormatter },
            { provide: logger_1.HeaderFormater, useClass: formater_1.LogHeaderFormater, asDefault: true },
            { provide: common_1.PLATFORM_ID, useValue: common_1.PLATFORM_SERVER_ID },
            {
                provide: common_1.DOCUMENT,
                useFactory: () => {
                    const { JSDOM } = require('jsdom');
                    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
                    return dom.window.document;
                },
                asDefault: true
            },
            exit_1.ApplicationExit
        ]
    })
], ServerModule);
//# sourceMappingURL=ServerModule.js.map