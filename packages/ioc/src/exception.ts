import { isArray } from './utils/chk';


const _tyfunc = 'function';
/**
 * Exception is Basic Error.
 * for custom extends.
 * 
 * 异常处理基础类，用于基础实现自定义异常。
 */
export class Exception extends Error {
    constructor(message: string, readonly code?: any) {
        super(message);
        let target: Function;
        try {
            target = new.target
        } catch {
            target = Exception
        }

        this.name = target.name;
        if (typeof (Error as any).captureStackTrace === _tyfunc) {
            (Error as any).captureStackTrace(this, target)
        }
        if (typeof Object.setPrototypeOf === _tyfunc) {
            Object.setPrototypeOf(this, target.prototype)
        } else {
            (this as any).__proto__ = target.prototype
        }
    }
}


/**
 * argument execption.
 * 
 * 参数异常。
 */
export class ArgumentException extends Exception {
    constructor(message?: string | string[]) {
        super(isArray(message) ? message.join('\n') : message || '')
    }
}

const tymgs = 'TypeException';
/**
 * Type execption.
 * 
 * 类型异常。
 */
export class TypeException extends Exception {
    constructor(message?: string) {
        super(message ? `${tymgs}: ${message}` : tymgs)
    }
}
