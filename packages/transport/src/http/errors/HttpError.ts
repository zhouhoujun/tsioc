import { TransportError, HttpStatusCode } from '@tsdi/core';

/**
 * http error
 *
 * @export
 * @class HttpError
 * @extends {Error}
 */
export class HttpError extends TransportError {
    constructor(status: HttpStatusCode, message?: string | string[]) {
        super(status, message);
    }

    toString() {
        return `Http Error: ${this.status}, ${this.message}`;
    }

}
