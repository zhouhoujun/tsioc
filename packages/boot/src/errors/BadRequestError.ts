import { HttpError } from './HttpError';

/**
 * bad request error.
 *
 * @export
 * @class BadRequestError
 * @extends {HttpError}
 */
export class BadRequestError extends HttpError {
    constructor(message = 'Bad Request') {
        super(400, message);
    }
}
