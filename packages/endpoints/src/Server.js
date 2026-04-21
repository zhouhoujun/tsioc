"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BindServerEvent = exports.Server = exports.MicroService = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const core_1 = require("@tsdi/core");
/**
 * microservice.
 */
let MicroService = class MicroService {
    async start() {
        if (this.injector.ready)
            await this.injector.ready;
        return await this.onStart();
    }
    async close() {
        await this.onShutdown();
        this.handler.onDestroy?.();
    }
};
exports.MicroService = MicroService;
tslib_1.__decorate([
    (0, core_1.Runner)(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", Promise)
], MicroService.prototype, "start", null);
tslib_1.__decorate([
    (0, core_1.Shutdown)(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", Promise)
], MicroService.prototype, "close", null);
exports.MicroService = MicroService = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], MicroService);
/**
 * abstract server.
 *
 * 微服务
 */
let Server = class Server extends MicroService {
    get injector() {
        return this.handler.injector;
    }
    use(options, order) {
        this.handler.append((0, ioc_1.isArray)(options) ? { interceptors: options }
            : (((0, core_1.isHandlerOptions)(options) ? options : { interceptors: [(0, ioc_1.toMutilProvdierOf)(options, order)] })));
        return this;
    }
};
exports.Server = Server;
exports.Server = Server = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], Server);
/**
 *  bind Server event.
 */
class BindServerEvent extends core_1.ApplicationEvent {
    constructor(server, transport, target) {
        super(target);
        this.server = server;
        this.transport = transport;
    }
}
exports.BindServerEvent = BindServerEvent;
//# sourceMappingURL=Server.js.map