"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationExit = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const core_1 = require("@tsdi/core");
let ApplicationExit = class ApplicationExit {
    constructor() { }
    register(context) {
        const usedsignls = context.getArguments().signls;
        if (!usedsignls?.length)
            return;
        const logger = context.getLogger();
        const cleanup = async (signal) => {
            try {
                usedsignls.forEach(si => process.removeListener(si, cleanup));
                logger?.info('Application', process.pid, 'close');
                await context.destroy();
                process.kill(process.pid, signal);
            }
            catch (err) {
                logger?.error(err);
                process.exit(1);
            }
        };
        usedsignls.forEach(signl => {
            process.on(signl, cleanup);
        });
    }
};
exports.ApplicationExit = ApplicationExit;
tslib_1.__decorate([
    (0, core_1.Start)(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [core_1.ApplicationContext]),
    tslib_1.__metadata("design:returntype", void 0)
], ApplicationExit.prototype, "register", null);
exports.ApplicationExit = ApplicationExit = tslib_1.__decorate([
    (0, ioc_1.Static)(),
    tslib_1.__metadata("design:paramtypes", [])
], ApplicationExit);
//# sourceMappingURL=exit.js.map