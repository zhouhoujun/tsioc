import { isArray } from '@tsdi/ioc';
import { HttpStatusCode } from '../status';

/**
 * http error
 *
 * @export
 * @class HttpError
 * @extends {Error}
 */
export class HttpError extends Error {
    constructor(readonly status: HttpStatusCode, message?: string | string[]) {
        super(isArray(message) ? message.join('\n') : message || '');
        Object.setPrototypeOf(this, HttpError.prototype);
        Error.captureStackTrace(this);
    }

    get statusCode() {
        return this.status;
    }

    toString() {
        return `Http Error: ${this.status}, ${this.message}`;
    }

}
