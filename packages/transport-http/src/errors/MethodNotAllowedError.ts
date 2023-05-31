import { HttpStatusCode, statusMessage } from '@tsdi/core';
import { HttpError } from './HttpError';

/**
 * method not allowed error.
 *
 * @export
 * @class MethodNotAllowedError
 * @extends {HttpError}
 */
export class HttpMethodNotAllowedError extends HttpError {
    constructor(message = statusMessage[HttpStatusCode.MethodNotAllowed]) {
        super(HttpStatusCode.MethodNotAllowed, message)
    }
}
