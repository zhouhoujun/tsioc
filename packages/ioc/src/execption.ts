import { isArray } from './utils/chk';

/**
 * Execption is Basic Error.
 * for custom extends.
 */
export class Execption extends Error {
    constructor(message: string) {
        super(message);
        let target: Function;
        try {
            target = new.target
        } catch {
            target = Execption
        }

        this.name = target.name;
        if (typeof (Error as any).captureStackTrace === 'function') {
            (Error as any).captureStackTrace(this, target)
        }
        if (typeof Object.setPrototypeOf === 'function') {
            Object.setPrototypeOf(this, target.prototype)
        } else {
            (this as any).__proto__ = target.prototype
        }
    }
    
}


/**
 * argument errror.
 */
 export class ArgumentError extends Execption {
    constructor(message?: string | string[]) {
        super(isArray(message) ? message.join('\n') : message || '')
    }
}
