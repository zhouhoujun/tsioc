import { HttpStatusCode } from '@tsdi/core';
import { statusMessage } from '../status';
import { HttpError } from './HttpError';

/**
 * method not allowed error.
 *
 * @export
 * @class MethodNotAllowedError
 * @extends {HttpError}
 */
export class MethodNotAllowedError extends HttpError {
    constructor(message = statusMessage[HttpStatusCode.MethodNotAllowed]) {
        super(HttpStatusCode.MethodNotAllowed, message);
    }
}
