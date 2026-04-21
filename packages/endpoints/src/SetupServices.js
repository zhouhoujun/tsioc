"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SetupServices = exports.REGISTER_SERVICES = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const core_1 = require("@tsdi/core");
exports.REGISTER_SERVICES = (0, ioc_1.token)('REGISTER_SERVICES');
/**
 * setup register services in root.
 */
let SetupServices = class SetupServices {
    constructor() {
        this.services = [];
        this.unboots = new Set();
    }
    async setup(context) {
        this.context = context;
        const services = context.get(exports.REGISTER_SERVICES);
        services.forEach(s => {
            if (s.bootstrap === false) {
                this.unboots.add((0, ioc_1.isFunction)(s.service) ? s.service : s.service.type);
            }
            this.services.push(context.runners.attach(s.service, { limit: 1, bootstrap: s.bootstrap, providers: s.providers }));
        });
    }
    getServices() {
        return this.services;
    }
    /**
     * run services, configed not auto bootstrap.
     * @returns
     */
    async run() {
        if (!this.unboots.size)
            return;
        await this.context.runners.run(Array.from(this.unboots.values()));
    }
};
exports.SetupServices = SetupServices;
tslib_1.__decorate([
    (0, core_1.Startup)(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [core_1.ApplicationContext]),
    tslib_1.__metadata("design:returntype", Promise)
], SetupServices.prototype, "setup", null);
exports.SetupServices = SetupServices = tslib_1.__decorate([
    (0, ioc_1.Injectable)()
], SetupServices);
//# sourceMappingURL=SetupServices.js.map