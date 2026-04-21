"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeException = exports.ArgumentException = exports.Exception = void 0;
const chk_1 = require("./utils/chk");
const _tyfunc = 'function';
/**
 * Exception is Basic Error.
 * for custom extends.
 *
 * 异常处理基础类，用于基础实现自定义异常。
 */
class Exception extends Error {
    constructor(message, code) {
        super(message);
        this.code = code;
        let target;
        try {
            target = new.target;
        }
        catch {
            target = Exception;
        }
        this.name = target.name;
        if (typeof Error.captureStackTrace === _tyfunc) {
            Error.captureStackTrace(this, target);
        }
        if (typeof Object.setPrototypeOf === _tyfunc) {
            Object.setPrototypeOf(this, target.prototype);
        }
        else {
            this.__proto__ = target.prototype;
        }
    }
}
exports.Exception = Exception;
/**
 * argument execption.
 *
 * 参数异常。
 */
class ArgumentException extends Exception {
    constructor(message) {
        super((0, chk_1.isArray)(message) ? message.join('\n') : message || '');
    }
}
exports.ArgumentException = ArgumentException;
const tymgs = 'TypeException';
/**
 * Type execption.
 *
 * 类型异常。
 */
class TypeException extends Exception {
    constructor(message) {
        super(message ? `${tymgs}: ${message}` : tymgs);
    }
}
exports.TypeException = TypeException;
//# sourceMappingURL=exception.js.map