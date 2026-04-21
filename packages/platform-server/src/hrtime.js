"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerHrtimeFormatter = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const core_1 = require("@tsdi/core");
const node_process_1 = require("node:process");
let ServerHrtimeFormatter = class ServerHrtimeFormatter extends core_1.HrtimeFormatter {
    hrtime(time) {
        return (0, node_process_1.hrtime)(time);
    }
};
exports.ServerHrtimeFormatter = ServerHrtimeFormatter;
exports.ServerHrtimeFormatter = ServerHrtimeFormatter = tslib_1.__decorate([
    (0, ioc_1.Injectable)()
], ServerHrtimeFormatter);
//# sourceMappingURL=hrtime.js.map