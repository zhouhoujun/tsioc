import { MessageExecption } from '@tsdi/core';
import { HttpStatusCode } from '@tsdi/common';


/**
 * http error
 *
 */
export class HttpError extends MessageExecption {
    constructor(readonly status: HttpStatusCode, message?: string | string[]) {
        super(message, status)
    }

    get statusCode(): HttpStatusCode {
        return this.status
    }
    
    toString() {
        return `Http Error: ${this.status}, ${this.message}`
    }

}
