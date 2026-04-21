"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpperCasePipe = exports.LowerCasePipe = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const metadata_1 = require("../metadata");
const pipe_1 = require("./pipe");
/**
 * lowercase pipe
 */
let LowerCasePipe = class LowerCasePipe {
    /**
     * @param value The string to transform to lower case.
     */
    transform(value) {
        if (!value)
            return value;
        if (!(0, ioc_1.isString)(value)) {
            throw (0, pipe_1.invalidPipeArgument)(this, value);
        }
        return value.toLowerCase();
    }
};
exports.LowerCasePipe = LowerCasePipe;
exports.LowerCasePipe = LowerCasePipe = tslib_1.__decorate([
    (0, metadata_1.Pipe)('lowercase')
], LowerCasePipe);
/**
 * uppercase pipe.
 */
let UpperCasePipe = class UpperCasePipe {
    /**
     * @param value The string to transform to lower case.
     */
    transform(value) {
        if (!value)
            return value;
        if (!(0, ioc_1.isString)(value)) {
            throw (0, pipe_1.invalidPipeArgument)(this, value);
        }
        return value.toUpperCase();
    }
};
exports.UpperCasePipe = UpperCasePipe;
exports.UpperCasePipe = UpperCasePipe = tslib_1.__decorate([
    (0, metadata_1.Pipe)('uppercase')
], UpperCasePipe);
//# sourceMappingURL=cases.js.map