import { ArgumentError, Execption, isArray } from '@tsdi/ioc';


/**
 * Transport error
 *
 * @export
 * @class TransportError
 * @extends {Error}
 */
export class TransportError extends Execption {

    constructor(message?: string | string[], public status?: number) {
        super(isArray(message) ? message.join('\n') : message || '')
    }

    get statusCode(): number {
        return this.status ?? 0;
    }

    toString() {
        return `Transport Error: ${this.statusCode}, ${this.message}`
    }
}

/**
 * transport arguments error.
 */
export class TransportArgumentError extends ArgumentError {
    constructor(message?: string | string[]) {
        super(message)
    }
}


/**
 * not found error.
 *
 * @export
 * @class NotFoundError
 * @extends {HttpError}
 */
export class NotFoundError extends TransportError {
    constructor(message = 'Not Found') {
        super(message)
    }
}


/**
 * forbidden error.
 *
 * @export
 * @class ForbiddenError
 * @extends {TransportError}
 */
export class ForbiddenError extends TransportError {
    constructor(message = 'Forbidden') {
        super(message)
    }
}


/**
 * bad request error.
 *
 * @export
 * @class BadRequestError
 * @extends {TransportError}
 */
export class BadRequestError extends TransportError {
    constructor(message = 'Bad Request') {
        super(message)
    }
}


/**
 * unauthorized error.
 *
 * @export
 * @class UnauthorizedError
 * @extends {TransportError}
 */
export class UnauthorizedError extends TransportError {
    constructor(message = 'Unauthorized') {
        super(message)
    }
}

/**
 * internal server error.
 *
 * @export
 * @class InternalServerError
 * @extends {HttpError}
 */
export class InternalServerError extends TransportError {
    constructor(message = 'Internal Server Error') {
        super(message)
    }
}

/**
 * unsupported media type.
 */
export class UnsupportedMediaTypeError extends TransportError {
    constructor(message = 'Unsupported Media Type') {
        super(message)
    }
}