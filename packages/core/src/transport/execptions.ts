import { ArgumentExecption, Execption, isArray } from '@tsdi/ioc';


/**
 * Transport Execption
 *
 * @export
 * @class TransportExecption
 * @extends {Execption}
 */
export class TransportExecption extends Execption {

    constructor(message?: string | string[], public status?: number | string) {
        super(isArray(message) ? message.join('\n') : message || '')
    }

    get statusCode(): number | string {
        return this.status ?? 0;
    }

    toString() {
        return `Transport Execption: ${this.statusCode}, ${this.message}`
    }
}

export class TransportAboutExecption extends TransportExecption {
    constructor(message = 'Transport about') {
        super(message)
    }
}

export class InvalidHeaderTokenExecption extends TransportExecption {
    constructor(message = 'Invalid header token.') {
        super(message);
    }
}

const statmsg = 'INVALID_STATE_ERR';

export class InvalidStateExecption extends TransportExecption {
    constructor(message?: string) {
        super(message ? `${statmsg}: ${message}` : statmsg)
    }
}

const sectmsg = 'SecurityExecption';
export class SecurityExecption extends TransportExecption {
    constructor(message?: string) {
        super(message ? `${sectmsg}: ${message}` : sectmsg)
    }
}



/**
 * transport arguments execption.
 */
export class TransportArgumentExecption extends ArgumentExecption {
    constructor(message?: string | string[]) {
        super(message)
    }
}

/**
 * not found execption.
 *
 * @export
 * @class NotFoundExecption
 * @extends {TransportExecption}
 */
export class NotFoundExecption extends TransportExecption {
    constructor(message = 'Not Found', status?: number) {
        super(message, status)
    }
}

/**
 * forbidden execption.
 *
 * @export
 * @class ForbiddenExecption
 * @extends {TransportExecption}
 */
export class ForbiddenExecption extends TransportExecption {
    constructor(message = 'Forbidden', status?: number) {
        super(message, status)
    }
}

/**
 * bad request execption.
 *
 * @export
 * @class BadRequestExecption
 * @extends {TransportExecption}
 */
export class BadRequestExecption extends TransportExecption {
    constructor(message = 'Bad Request', status?: number | string) {
        super(message, status)
    }
}

/**
 * unauthorized execption.
 *
 * @export
 * @class UnauthorizedExecption
 * @extends {TransportExecption}
 */
export class UnauthorizedExecption extends TransportExecption {
    constructor(message = 'Unauthorized', status?: number | string) {
        super(message, status)
    }
}

/**
 * internal server execption.
 *
 * @export
 * @class InternalServerExecption
 * @extends {TransportExecption}
 */
export class InternalServerExecption extends TransportExecption {
    constructor(message = 'Internal Server Error', status?: number | string) {
        super(message, status)
    }
}

/**
 * unsupported media type execption.
 */
export class UnsupportedMediaTypeExecption extends TransportExecption {
    constructor(message = 'Unsupported Media Type', status?: number) {
        super(message, status)
    }
}


/**
 * connection refused error.
 * socket error code
 */
export const ECONNREFUSED = 'ECONNREFUSED';
/**
 * Address already in use error.
 * socket error code
 */
export const EADDRINUSE = 'EADDRINUSE';
/**
 * connection read timeout.
 * socket error code
 */
export const ECONNRESET = 'ECONNRESET';
/**
 * Address not found in dns.
 * socket error code
 */
export const ENOTFOUND = 'ENOTFOUND';

/**
 * not directory.
 */
export const ENOTDIR = 'ENOTDIR';
/**
 * No such file or directory.
 */
export const ENOENT = 'ENOENT';
/**
 * name too long.
 */
export const ENAMETOOLONG = 'ENAMETOOLONG';