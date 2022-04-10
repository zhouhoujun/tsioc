import { HttpStatusCode } from '@tsdi/core';
import { HttpError } from './HttpError';
import { statusMessage } from '../status';

/**
 * forbidden error.
 *
 * @export
 * @class ForbiddenError
 * @extends {HttpError}
 */
export class ForbiddenError extends HttpError {
    constructor(message = statusMessage[HttpStatusCode.Forbidden]) {
        super(HttpStatusCode.Forbidden, message);
    }
}
