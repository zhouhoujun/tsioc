"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeFormatPipe = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const metadata_1 = require("../../metadata");
const pipe_1 = require("../pipe");
/**
 * format times with unit us, ns, ms, s, min, h...
 */
let TimeFormatPipe = class TimeFormatPipe {
    transform(ms, precise = 2) {
        let total;
        if ((0, ioc_1.isString)(ms)) {
            try {
                total = parseFloat(ms);
            }
            catch {
                throw (0, pipe_1.invalidPipeArgument)(this, ms);
            }
        }
        else {
            total = ms;
        }
        if (!(0, ioc_1.isNumber)(ms)) {
            throw (0, pipe_1.invalidPipeArgument)(this, ms);
        }
        if (Number.isNaN(total)) {
            return '';
        }
        let unitTime = '';
        for (let i = 0; i < unitSize.length; i++) {
            if (total >= unitSize[i]) {
                unitTime = this.cleanZero((total / unitSize[i]).toFixed(precise)) + minimalDesc[i];
                break;
            }
        }
        return unitTime;
    }
    cleanZero(num) {
        return num.replace(clrZReg, '');
    }
};
exports.TimeFormatPipe = TimeFormatPipe;
exports.TimeFormatPipe = TimeFormatPipe = tslib_1.__decorate([
    (0, metadata_1.Pipe)('times-format')
], TimeFormatPipe);
const clrZReg = /\.?0+$/;
const minimalDesc = ['h', 'min', 's', 'ms', 'μs', 'ns'];
const unitSize = [60 * 60 * 1e3, 60 * 1e3, 1e3, 1, 1e-3, 1e-6];
//# sourceMappingURL=time.js.map