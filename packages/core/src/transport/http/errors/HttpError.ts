import { TransportError } from '../../error';
import { HttpStatusCode } from '../status';

/**
 * http error
 *
 * @export
 * @class HttpError
 * @extends {Error}
 */
export class HttpError extends TransportError<HttpStatusCode> {
    constructor(status: HttpStatusCode, message?: string | string[]) {
        super(status, message);
    }

    toString() {
        return `Http Error: ${this.status}, ${this.message}`;
    }

}
