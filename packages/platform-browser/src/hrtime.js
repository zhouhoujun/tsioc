"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserHrtimeFormatter = void 0;
const tslib_1 = require("tslib");
const core_1 = require("@tsdi/core");
const ioc_1 = require("@tsdi/ioc");
const hrtime = require("browser-process-hrtime");
let BrowserHrtimeFormatter = class BrowserHrtimeFormatter extends core_1.HrtimeFormatter {
    hrtime(time) {
        return hrtime(time);
    }
};
exports.BrowserHrtimeFormatter = BrowserHrtimeFormatter;
exports.BrowserHrtimeFormatter = BrowserHrtimeFormatter = tslib_1.__decorate([
    (0, ioc_1.Injectable)()
], BrowserHrtimeFormatter);
//# sourceMappingURL=hrtime.js.map