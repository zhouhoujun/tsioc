"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnumPipe = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const metadata_1 = require("../../metadata");
const pipe_1 = require("../pipe");
/**
 * parse enum.
 */
let EnumPipe = class EnumPipe {
    transform(value, enumType) {
        if (!enumType || Object.keys(enumType).length < 1) {
            throw (0, pipe_1.invalidPipeArgument)(this, enumType, 'enumType is right Enum type.');
        }
        const keys = Object.keys(enumType);
        if ((0, ioc_1.isString)(value)) {
            if (keys.indexOf(value) < 0) {
                throw (0, pipe_1.invalidPipeArgument)(this, value, `, enmu of ${enumType}`);
            }
            return enumType[value];
        }
        else {
            const key = keys.find(k => enumType[k] === value);
            if ((0, ioc_1.isUndefined)(key)) {
                throw (0, pipe_1.invalidPipeArgument)(this, value, `, enmu of ${enumType}`);
            }
            return enumType[key];
        }
    }
};
exports.EnumPipe = EnumPipe;
exports.EnumPipe = EnumPipe = tslib_1.__decorate([
    (0, metadata_1.Pipe)('enum')
], EnumPipe);
//# sourceMappingURL=enum.js.map