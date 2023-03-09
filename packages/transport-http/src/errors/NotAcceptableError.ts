import { HttpStatusCode, statusMessage } from '@tsdi/common';
import { HttpError } from './HttpError';

/**
 * not acceptable error.
 *
 * @export
 * @class NotAcceptableError
 * @extends {HttpError}
 */
export class HttpNotAcceptableError extends HttpError {
    constructor(message = statusMessage[HttpStatusCode.NotAcceptable]) {
        super(HttpStatusCode.NotAcceptable, message)
    }
}