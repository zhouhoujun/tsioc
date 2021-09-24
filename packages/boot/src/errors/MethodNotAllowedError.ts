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
        super(405, message);
    }
}
