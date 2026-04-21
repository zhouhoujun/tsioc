"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggerModule = exports.LOGGER_PROVIDERS = void 0;
exports.provideLogger = provideLogger;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const aop_1 = require("@tsdi/aop");
const aspect_1 = require("./aspect");
const LoggerManager_1 = require("./LoggerManager");
const manager_1 = require("./manager");
const formater_1 = require("./formater");
const LogConfigure_1 = require("./LogConfigure");
const aspect_2 = require("./debugs/aspect");
/**
 * logger providers.
 */
exports.LOGGER_PROVIDERS = [
    manager_1.LoggerManagers,
    aspect_1.AnnotationLogAspect,
    formater_1.DefaultJoinPointFormater,
    manager_1.ConsoleLogManager,
    { provide: LoggerManager_1.LoggerManager, useExisting: manager_1.LoggerManagers }
];
/**
 * aop logs ext for Ioc. auto run setup after registered.
 * @export
 * @class LogModule
 */
let LoggerModule = class LoggerModule {
    /**
     * provide logger with options.
     * @param config
     * @param debug
     * @returns
     */
    static withOptions(config, debug) {
        return provideLogger(config, debug);
    }
};
exports.LoggerModule = LoggerModule;
exports.LoggerModule = LoggerModule = tslib_1.__decorate([
    (0, ioc_1.Module)({
        imports: [
            aop_1.AopModule
        ],
        providers: exports.LOGGER_PROVIDERS
    })
], LoggerModule);
/**
 * provide logger with options.
 * @param config
 * @param debug
 * @returns
 */
function provideLogger(config, debug) {
    const providers = config ? ((0, ioc_1.isArray)(config) ? config : [config]).map(cfg => (0, ioc_1.toProvider)(LogConfigure_1.LOG_CONFIGURES, cfg, true)) : [{ provide: LogConfigure_1.LOG_CONFIGURES, useValue: { adapter: 'console' }, multi: true }];
    if (debug) {
        providers.push(aspect_2.DebugLogAspect);
    }
    return {
        module: LoggerModule,
        providers
    };
}
//# sourceMappingURL=logger.module.js.map