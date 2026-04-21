"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogProcess = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const logger_1 = require("./logger");
const metadata_1 = require("./metadata");
const manager_1 = require("./manager");
/**
 *  Log process.
 */
let LogProcess = class LogProcess {
    getLogger(name, adapter) {
        return name ? this.mangers.getLogger(name, adapter) : this.logger;
    }
};
exports.LogProcess = LogProcess;
_a = ioc_1.noPointcut;
LogProcess[_a] = true;
tslib_1.__decorate([
    (0, metadata_1.InjectLog)(),
    tslib_1.__metadata("design:type", logger_1.Logger)
], LogProcess.prototype, "logger", void 0);
tslib_1.__decorate([
    (0, ioc_1.Inject)(),
    tslib_1.__metadata("design:type", manager_1.LoggerManagers)
], LogProcess.prototype, "mangers", void 0);
tslib_1.__decorate([
    (0, ioc_1.Inject)(),
    tslib_1.__metadata("design:type", ioc_1.Injector)
], LogProcess.prototype, "injector", void 0);
exports.LogProcess = LogProcess = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], LogProcess);
//# sourceMappingURL=LogProcess.js.map