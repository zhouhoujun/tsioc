import { HttpError } from './HttpError';

/**
 * not acceptable error.
 *
 * @export
 * @class NotAcceptableError
 * @extends {HttpError}
 */
export class NotAcceptableError extends HttpError {
    constructor(message = 'Not Acceptable') {
        super(406, message);
    }
}
