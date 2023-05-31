import { HttpStatusCode, statusMessage } from '@tsdi/core';
import { HttpError } from './HttpError';

/**
 * not found error.
 *
 * @export
 * @class NotFoundError
 * @extends {HttpError}
 */
export class HttpNotFoundError extends HttpError {
    constructor(message = statusMessage[HttpStatusCode.NotFound]) {
        super(HttpStatusCode.NotFound, message)
    }
}
