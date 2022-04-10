import { HttpStatusCode } from '@tsdi/core';
import { statusMessage } from '../status';
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
