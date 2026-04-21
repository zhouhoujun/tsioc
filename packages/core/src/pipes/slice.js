"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlicePipe = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const metadata_1 = require("../metadata");
const pipe_1 = require("./pipe");
/**
 * slice pipe, for string or array.
 */
let SlicePipe = class SlicePipe {
    transform(value, start, end) {
        if (value == null)
            return value;
        if (!this.supports(value)) {
            throw (0, pipe_1.invalidPipeArgument)(this, value);
        }
        return value.slice(start, end);
    }
    supports(obj) {
        return (0, ioc_1.isString)(obj) || (0, ioc_1.isArray)(obj);
    }
};
exports.SlicePipe = SlicePipe;
exports.SlicePipe = SlicePipe = tslib_1.__decorate([
    (0, metadata_1.Pipe)('slice')
], SlicePipe);
//# sourceMappingURL=slice.js.map