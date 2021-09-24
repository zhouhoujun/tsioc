import { isArray } from '@tsdi/ioc';

/**
 * http error
 *
 * @export
 * @class HttpError
 * @extends {Error}
 */
export class HttpError extends Error {
    constructor(readonly status: number, message?: string | string[]) {
        super();
        this.message = isArray(message) ? message.join('\n') : message || '';
        Error.captureStackTrace(this);
    }

    get statusCode() {
        return this.status;
    }

    toString() {
        return `Http Error: ${this.status}, ${this.message}`;
    }

}
