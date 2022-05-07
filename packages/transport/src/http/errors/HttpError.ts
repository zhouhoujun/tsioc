import { HttpStatusCode } from '@tsdi/core';
import { Execption, isArray } from '@tsdi/ioc';

/**
 * http error
 *
 */
export class HttpError extends Execption {
    constructor(readonly status: HttpStatusCode, message?: string | string[]) {
        super(isArray(message) ? message.join('\n') : message || '');
    }

    get statusCode(): HttpStatusCode {
        return this.status;
    }
    toString() {
        return `Http Error: ${this.status}, ${this.message}`;
    }

}
