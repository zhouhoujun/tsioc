import { HttpStatusCode } from '@tsdi/core';
import { HttpError } from './HttpError';

/**
 * not acceptable error.
 *
 * @export
 * @class NotAcceptableError
 * @extends {HttpError}
 */
export class NotAcceptableError extends HttpError {
    constructor(message = 'Not Acceptable') {
        super(HttpStatusCode.NotAcceptable, message);
    }
}
