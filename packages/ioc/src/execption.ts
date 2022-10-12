import { isArray, _tyfunc } from './utils/chk';

/**
 * Execption is Basic Error.
 * for custom extends.
 */
export class Execption extends Error {
    constructor(message: string, readonly code?: any) {
        super(message);
        let target: Function;
        try {
            target = new.target
        } catch {
            target = Execption
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
 */
export class ArgumentExecption extends Execption {
    constructor(message?: string | string[]) {
        super(isArray(message) ? message.join('\n') : message || '')
    }
}

const tymgs = 'TypeExecption';
export class TypeExecption extends Execption {
    constructor(message?: string) {
        super(message ? `${tymgs}: ${message}` : tymgs)
    }
}