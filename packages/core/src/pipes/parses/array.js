"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArrayPipe = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const metadata_1 = require("../../metadata");
const pipe_1 = require("../pipe");
const arrJson = /^\[.*\]$/;
/**
 * parse long.
 */
let ArrayPipe = class ArrayPipe {
    transform(value, type, length) {
        let ret;
        if ((0, ioc_1.isString)(value)) {
            if (arrJson.test(value)) {
                ret = JSON.parse(value);
            }
            else {
                const str = value.split(',');
                if (type) {
                    ret = str.map(s => this.parseType(s, type));
                }
                else {
                    ret = str;
                }
            }
        }
        else {
            ret = value;
        }
        if (length && ret?.length !== length) {
            throw (0, pipe_1.invalidPipeArgument)(this, value, `array length must be ${length}`);
        }
        return ret;
    }
    parseType(value, type) {
        switch (type) {
            case 'int':
                return parseInt(value);
            case 'float':
                return parseFloat(value);
            case Number:
            case 'number':
                return Number(value);
            case BigInt:
            case 'bigint':
                return BigInt(value);
            case 'string':
                return value;
            default:
                if (type) {
                    if ((0, ioc_1.isBasicType)(type)) {
                        return type(value);
                    }
                    else {
                        return new type(value);
                    }
                }
        }
        // if (type === 'string') {
        //     return value as T;
        // } else if (type === 'int') {
        //     return parseInt(value) as T;
        // } else if (type === 'float') {
        //     return parseFloat(value) as T;
        // } else if (type === 'number') {
        //     return Number(value) as T;
        // } else if (type === 'bigint') {
        //     return BigInt(value) as T;
        // } else if (type) {
        //     return new type(value) as T;
        // } else {
        //     return value as T;
        // }
    }
};
exports.ArrayPipe = ArrayPipe;
exports.ArrayPipe = ArrayPipe = tslib_1.__decorate([
    (0, metadata_1.Pipe)('array')
], ArrayPipe);
//# sourceMappingURL=array.js.map