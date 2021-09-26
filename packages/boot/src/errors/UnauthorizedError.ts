import { HttpStatusCode } from '../status';
import { HttpError } from './HttpError';

/**
 * unauthorized error.
 *
 * @export
 * @class UnauthorizedError
 * @extends {HttpError}
 */
export class UnauthorizedError extends HttpError {
    constructor(message = 'Unauthorized') {
        super(HttpStatusCode.Unauthorized, message);
    }
}
