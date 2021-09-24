import { HttpError } from './HttpError';

/**
 * internal server error.
 *
 * @export
 * @class InternalServerError
 * @extends {HttpError}
 */
export class InternalServerError extends HttpError {
    constructor(message = 'Internal Server Error') {
        super(500, message);
    }
}
