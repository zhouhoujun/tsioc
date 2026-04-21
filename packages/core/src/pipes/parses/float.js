"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FloatPipe = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const metadata_1 = require("../../metadata");
const pipe_1 = require("../pipe");
/**
 * parse float.
 */
let FloatPipe = class FloatPipe {
    transform(value, precision) {
        let ret;
        if ((0, ioc_1.isString)(value)) {
            ret = parseFloat(value);
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
exports.FloatPipe = FloatPipe;
exports.FloatPipe = FloatPipe = tslib_1.__decorate([
    (0, metadata_1.Pipe)('float')
], FloatPipe);
//# sourceMappingURL=float.js.map