import { HttpStatusCode } from '@tsdi/core';
import { HttpError } from './HttpError';

/**
 * forbidden error.
 *
 * @export
 * @class ForbiddenError
 * @extends {HttpError}
 */
export class ForbiddenError extends HttpError {
    constructor(message = 'Request Forbidden') {
        super(HttpStatusCode.Forbidden, message);
    }
}
