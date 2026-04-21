"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StringPipe = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const metadata_1 = require("../../metadata");
const pipe_1 = require("../pipe");
/**
 * parse string.
 */
let StringPipe = class StringPipe {
    transform(value, length) {
        if ((0, ioc_1.isNil)(value))
            throw (0, pipe_1.invalidPipeArgument)(this, value);
        const str = String(value);
        if (length && str.length > length) {
            throw (0, pipe_1.invalidPipeArgument)(this, value, 'more than max lenght:' + length);
        }
        return str;
    }
};
exports.StringPipe = StringPipe;
exports.StringPipe = StringPipe = tslib_1.__decorate([
    (0, metadata_1.Pipe)('string')
], StringPipe);
//# sourceMappingURL=string.js.map