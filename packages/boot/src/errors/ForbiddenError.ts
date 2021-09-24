import { HttpError } from './HttpError';

/**
 * forbidden error.
 *
 * @export
 * @class ForbiddenError
 * @extends {HttpError}
 */
export class ForbiddenError extends HttpError {
    constructor(message = 'Request Forbidden') {
        super(403, message);
    }
}
