import { HttpStatusCode } from '@tsdi/core';
import { statusMessage } from '../status';
import { HttpError } from './HttpError';

/**
 * not found error.
 *
 * @export
 * @class NotFoundError
 * @extends {HttpError}
 */
export class NotFoundError extends HttpError {
    constructor(message = statusMessage[HttpStatusCode.NotFound]) {
        super(HttpStatusCode.NotFound, message);
    }
}
