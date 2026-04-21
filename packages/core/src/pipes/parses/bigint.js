"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BigintPipe = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const metadata_1 = require("../../metadata");
const pipe_1 = require("../pipe");
/**
 * parse bigint.
 */
let BigintPipe = class BigintPipe {
    transform(value) {
        let ret;
        if ((0, ioc_1.isString)(value)) {
            ret = BigInt(value);
        }
        else if ((0, ioc_1.isNumber)(value)) {
            ret = BigInt(value);
        }
        else if ((0, ioc_1.isBigInt)(value)) {
            ret = value;
        }
        else {
            throw (0, pipe_1.invalidPipeArgument)(this, value);
        }
        return ret;
    }
};
exports.BigintPipe = BigintPipe;
exports.BigintPipe = BigintPipe = tslib_1.__decorate([
    (0, metadata_1.Pipe)('bigint')
], BigintPipe);
//# sourceMappingURL=bigint.js.map