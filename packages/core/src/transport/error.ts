import { isArray } from '@tsdi/ioc';
import { TransportContext } from './context';


export interface ErrorHandler<TRequest extends TransportContext = TransportContext> {
    handle(ctx: TRequest, err: Error): void;
}

/**
 * Transport error
 *
 * @export
 * @class TransportError
 * @extends {Error}
 */
export class TransportError<T = number|string> extends Error {
    constructor(readonly status: T, message?: string | string[]) {
        super(isArray(message) ? message.join('\n') : message || '');
        Object.setPrototypeOf(this, TransportError.prototype);
        Error.captureStackTrace(this);
    }

    get statusCode(): T {
        return this.status;
    }

    toString() {
        return `Transport Error: ${this.status}, ${this.message}`;
    }

}

/**
 * invalid message error.
 */
 export class InvalidMessageError extends TransportError {
    constructor(message?: string) {
        super('Bad Request', message || 'Invalid message');
        Object.setPrototypeOf(this, InvalidMessageError.prototype);
        Error.captureStackTrace(this);
    }
}

