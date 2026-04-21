"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BoolPipe = void 0;
const tslib_1 = require("tslib");
const metadata_1 = require("../../metadata");
const pipe_1 = require("../pipe");
/**
 * parse boolean.
 */
let BoolPipe = class BoolPipe {
    transform(value, ...args) {
        if (value === true || value === 'true') {
            return true;
        }
        if (value === false || value === 'false') {
            return false;
        }
        throw (0, pipe_1.invalidPipeArgument)(this, value);
    }
};
exports.BoolPipe = BoolPipe;
exports.BoolPipe = BoolPipe = tslib_1.__decorate([
    (0, metadata_1.Pipe)('boolean')
], BoolPipe);
//# sourceMappingURL=bool.js.map