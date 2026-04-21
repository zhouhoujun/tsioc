"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerLog4Module = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const ServerLog4Formater_1 = require("./ServerLog4Formater");
const Log4jsAdapter_1 = require("./Log4jsAdapter");
let ServerLog4Module = class ServerLog4Module {
};
exports.ServerLog4Module = ServerLog4Module;
exports.ServerLog4Module = ServerLog4Module = tslib_1.__decorate([
    (0, ioc_1.Module)({
        providers: [
            ServerLog4Formater_1.ServerJoinpointLogFormater,
            Log4jsAdapter_1.Log4jsAdapter
        ]
    })
], ServerLog4Module);
//# sourceMappingURL=ServerLog4Module.js.map