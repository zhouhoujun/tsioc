import { HttpStatusCode, statusMessage } from '@tsdi/common';
import { HttpError } from './HttpError';

/**
 * internal server error.
 *
 * @export
 * @class InternalServerError
 * @extends {HttpError}
 */
export class HttpInternalServerError extends HttpError {
    constructor(message = statusMessage[HttpStatusCode.InternalServerError]) {
        super(HttpStatusCode.InternalServerError, message)
    }
}
