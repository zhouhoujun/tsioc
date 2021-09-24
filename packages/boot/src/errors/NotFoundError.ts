import { HttpError } from './HttpError';

/**
 * not found error.
 *
 * @export
 * @class NotFoundError
 * @extends {HttpError}
 */
export class NotFoundError extends HttpError {
    constructor(message = 'Not Found') {
        super(404, message);
    }
}
