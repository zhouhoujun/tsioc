import { HttpStatusCode } from '@tsdi/core';
import { statusMessage } from '../status';
import { HttpError } from './HttpError';

/**
 * not acceptable error.
 *
 * @export
 * @class NotAcceptableError
 * @extends {HttpError}
 */
export class NotAcceptableError extends HttpError {
    constructor(message = statusMessage[HttpStatusCode.NotAcceptable]) {
        super(HttpStatusCode.NotAcceptable, message);
    }
}
