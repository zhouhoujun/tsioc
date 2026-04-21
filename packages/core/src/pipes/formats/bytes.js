"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BytesFormatPipe = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const metadata_1 = require("../../metadata");
const pipe_1 = require("../pipe");
/**
 * format bytes with unit b kb mb gb tb...
 */
let BytesFormatPipe = class BytesFormatPipe {
    transform(value, precise = 2) {
        let size;
        if ((0, ioc_1.isString)(value)) {
            try {
                size = parseInt(value);
            }
            catch {
                throw (0, pipe_1.invalidPipeArgument)(this, value);
            }
        }
        else {
            size = value;
        }
        if (!(0, ioc_1.isNumber)(value)) {
            throw (0, pipe_1.invalidPipeArgument)(this, value);
        }
        if (Number.isNaN(size)) {
            return '';
        }
        let unit = '';
        for (let i = 0; i < bits.length; i++) {
            if (size >= bits[i]) {
                unit = this.cleanZero((size / bits[i]).toFixed(precise)) + bitUnits[i];
                break;
            }
        }
        return unit;
    }
    cleanZero(num) {
        return num.replace(clrZReg, '');
    }
};
exports.BytesFormatPipe = BytesFormatPipe;
exports.BytesFormatPipe = BytesFormatPipe = tslib_1.__decorate([
    (0, metadata_1.Pipe)('bytes-format')
], BytesFormatPipe);
const clrZReg = /\.0+$/;
const bits = [
    1024 * 1024 * 1024 * 1024 * 1024 * 1024 * 1024 * 1024,
    1024 * 1024 * 1024 * 1024 * 1024 * 1024 * 1024,
    1024 * 1024 * 1024 * 1024 * 1024 * 1024,
    1024 * 1024 * 1024 * 1024 * 1024,
    1024 * 1024 * 1024 * 1024,
    1024 * 1024 * 1024,
    1024 * 1024,
    1024,
    1
];
const bitUnits = ['YB', 'ZB', 'EB', 'PB', 'TB', 'GB', 'MB', 'KB', 'B'];
//# sourceMappingURL=bytes.js.map