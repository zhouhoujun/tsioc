import { HttpStatusCode, statusMessage } from '@tsdi/core';
import { HttpError } from './HttpError';

/**
 * bad request error.
 *
 * @export
 * @class BadRequestError
 * @extends {HttpError}
 */
export class BadRequestError extends HttpError {
    constructor(message = statusMessage[HttpStatusCode.BadRequest]) {
        super(HttpStatusCode.BadRequest, message)
    }
}
