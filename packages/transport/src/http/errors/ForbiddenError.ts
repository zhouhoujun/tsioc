import { HttpStatusCode, statusMessage } from '@tsdi/common';
import { HttpError } from './HttpError';

/**
 * forbidden error.
 *
 * @export
 * @class ForbiddenError
 * @extends {HttpError}
 */
export class ForbiddenError extends HttpError {
    constructor(message = statusMessage[HttpStatusCode.Forbidden]) {
        super(HttpStatusCode.Forbidden, message)
    }
}
