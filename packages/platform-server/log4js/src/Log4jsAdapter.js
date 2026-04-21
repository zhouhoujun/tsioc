"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Log4jsAdapter = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const aop_1 = require("@tsdi/aop");
const core_1 = require("@tsdi/core");
const logger_1 = require("@tsdi/logger");
const log4js = require("log4js");
const node_path_1 = require("node:path");
let Log4jsAdapter = class Log4jsAdapter {
    constructor(appArgs) {
        this.appArgs = appArgs;
    }
    configure(config) {
        const root = this.appArgs.baseURL;
        ioc_1.lang.forIn(config.appenders, (appender, name) => {
            if (appender.filename && !(0, node_path_1.isAbsolute)(appender.filename)) {
                appender.filename = (0, node_path_1.join)(root, appender.filename);
            }
        });
        log4js.configure(config);
    }
    getLogger(name) {
        return log4js.getLogger(name);
    }
};
exports.Log4jsAdapter = Log4jsAdapter;
exports.Log4jsAdapter = Log4jsAdapter = tslib_1.__decorate([
    (0, aop_1.NonePointcut)(),
    (0, ioc_1.Injectable)(logger_1.LoggerManager, 'log4js'),
    tslib_1.__param(0, (0, ioc_1.Inject)(core_1.ApplicationArguments)),
    tslib_1.__metadata("design:paramtypes", [core_1.ApplicationArguments])
], Log4jsAdapter);
//# sourceMappingURL=Log4jsAdapter.js.map