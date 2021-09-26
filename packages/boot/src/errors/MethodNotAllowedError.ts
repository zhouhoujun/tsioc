import { HttpStatusCode } from '../status';
import { HttpError } from './HttpError';

/**
 * method not allowed error.
 *
 * @export
 * @class MethodNotAllowedError
 * @extends {HttpError}
 */
export class MethodNotAllowedError extends HttpError {
    constructor(message = 'Method Not Allowed') {
        super(HttpStatusCode.MethodNotAllowed, message);
    }
}
