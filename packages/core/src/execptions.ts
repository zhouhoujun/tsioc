import { Execption, isArray } from '@tsdi/ioc';


/**
 * Message Execption
 *
 * @export
 * @extends {Execption}
 */
export class MessageExecption extends Execption {

    headerSent?: boolean;
    headers?: Record<string, any>;
    code?: any;
    constructor(message?: string | string[], public status?: any) {
        super(isArray(message) ? message.join('\n') : message || '')
    }

    get statusCode(): any {
        return this.status ?? 0;
    }

    toString() {
        return `Message Execption: ${this.statusCode}, ${this.message}`
    }
}

/**
 * about execption.
 */
export class AboutExecption extends MessageExecption {
    constructor(message = 'About') {
        super(message)
    }
}

/**
 * Invalid header token execption.
 */
export class InvalidHeaderTokenExecption extends MessageExecption {
    constructor(message = 'Invalid header token.') {
        super(message);
    }
}

/**
 * Invalid state execption.
 */
export class InvalidStateExecption extends MessageExecption {
    constructor(message = 'INVALID_STATE_ERR') {
        super(message)
    }
}

/**
 * security execption.
 */
export class SecurityExecption extends MessageExecption {
    constructor(message = 'SecurityExecption') {
        super(message)
    }
}



/**
 * not found execption.
 *
 * @export
 * @class NotFoundExecption
 * @extends {MessageExecption}
 */
export class NotFoundExecption extends MessageExecption {
    constructor(message = 'Not Found', status?: number) {
        super(message, status)
    }
}

/**
 * forbidden execption.
 *
 * @export
 * @class ForbiddenExecption
 * @extends {MessageExecption}
 */
export class ForbiddenExecption extends MessageExecption {
    constructor(message = 'Forbidden', status?: number) {
        super(message, status)
    }
}

/**
 * bad request execption.
 *
 * @export
 * @class BadRequestExecption
 * @extends {MessageExecption}
 */
export class BadRequestExecption extends MessageExecption {
    constructor(message = 'Bad Request', status?: number | string) {
        super(message, status)
    }
}

/**
 * unauthorized execption.
 *
 * @export
 * @class UnauthorizedExecption
 * @extends {MessageExecption}
 */
export class UnauthorizedExecption extends MessageExecption {
    constructor(message = 'Unauthorized', status?: number | string) {
        super(message, status)
    }
}

/**
 * internal server execption.
 *
 * @export
 * @class InternalServerExecption
 * @extends {MessageExecption}
 */
export class InternalServerExecption extends MessageExecption {
    constructor(message = 'Internal Server Error', status?: number | string) {
        super(message, status)
    }
}

/**
 * unsupported media type execption.
 */
export class UnsupportedMediaTypeExecption extends MessageExecption {
    constructor(message = 'Unsupported Media Type', status?: number) {
        super(message, status)
    }
}

const pushDisMsg = 'Push disabled';
export class PushDisabledExecption extends Execption {
    constructor(message = pushDisMsg) {
        super(`PushDisabledExecption: ${message}`)
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