"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LongPipe = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const metadata_1 = require("../../metadata");
const pipe_1 = require("../pipe");
/**
 * parse long.
 */
let LongPipe = class LongPipe {
    transform(value, radix = 10) {
        let ret;
        if ((0, ioc_1.isString)(value)) {
            if (Number.isSafeInteger(value)) {
                ret = parseInt(value, radix);
            }
            else {
                ret = BigInt(value);
            }
        }
        else if ((0, ioc_1.isNumber)(value)) {
            ret = parseInt(value.toString(), radix);
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
exports.LongPipe = LongPipe;
exports.LongPipe = LongPipe = tslib_1.__decorate([
    (0, metadata_1.Pipe)('long')
], LongPipe);
//# sourceMappingURL=long.js.map