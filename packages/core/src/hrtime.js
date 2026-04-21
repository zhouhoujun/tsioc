"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HrtimeFormatter = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const time_1 = require("./pipes/formats/time");
let HrtimeFormatter = class HrtimeFormatter {
    format(hrtime, precise = 2) {
        if (!hrtime)
            return '';
        const [s, ns] = hrtime;
        const total = s * 1e3 + ns / 1e6;
        return this.times.transform(total, precise);
    }
};
exports.HrtimeFormatter = HrtimeFormatter;
tslib_1.__decorate([
    (0, ioc_1.Inject)(),
    tslib_1.__metadata("design:type", time_1.TimeFormatPipe)
], HrtimeFormatter.prototype, "times", void 0);
exports.HrtimeFormatter = HrtimeFormatter = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], HrtimeFormatter);
//# sourceMappingURL=hrtime.js.map