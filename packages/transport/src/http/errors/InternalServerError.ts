import { HttpStatusCode } from '@tsdi/core';
import { statusMessage } from '../status';
import { HttpError } from './HttpError';

/**
 * internal server error.
 *
 * @export
 * @class InternalServerError
 * @extends {HttpError}
 */
export class InternalServerError extends HttpError {
    constructor(message = statusMessage[HttpStatusCode.InternalServerError]) {
        super(HttpStatusCode.InternalServerError, message);
    }
}
