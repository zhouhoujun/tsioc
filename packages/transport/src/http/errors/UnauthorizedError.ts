import { HttpStatusCode, statusMessage } from '@tsdi/core';
import { HttpError } from './HttpError';

/**
 * unauthorized error.
 *
 * @export
 * @class UnauthorizedError
 * @extends {HttpError}
 */
export class UnauthorizedError extends HttpError {
    constructor(message = statusMessage[HttpStatusCode.Unauthorized]) {
        super(HttpStatusCode.Unauthorized, message);
    }
}
