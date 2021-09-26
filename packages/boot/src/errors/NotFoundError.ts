import { HttpStatusCode } from '../status';
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
        super(HttpStatusCode.NotFound, message);
    }
}
