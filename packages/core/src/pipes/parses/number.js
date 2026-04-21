"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NumberPipe = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const metadata_1 = require("../../metadata");
const pipe_1 = require("../pipe");
/**
 * parse number.
 */
let NumberPipe = class NumberPipe {
    transform(value, ...args) {
        let ret;
        if ((0, ioc_1.isString)(value)) {
            try {
                ret = Number(value);
            }
            catch {
                throw (0, pipe_1.invalidPipeArgument)(this, value);
            }
        }
        else if ((0, ioc_1.isNumber)(value)) {
            ret = value;
        }
        else {
            ret = NaN;
        }
        if (isNaN(ret)) {
            throw (0, pipe_1.invalidPipeArgument)(this, value);
        }
        return ret;
    }
};
exports.NumberPipe = NumberPipe;
exports.NumberPipe = NumberPipe = tslib_1.__decorate([
    (0, metadata_1.Pipe)('number')
], NumberPipe);
//# sourceMappingURL=number.js.map