import { ArgumentExecption, ClassType, Execption, isArray, MissingParameterExecption, Parameter } from '@tsdi/ioc';

/**
 * Message arguments execption.
 */
export class MessageArgumentExecption extends ArgumentExecption {
    constructor(message?: string | string[]) {
        super(message)
    }
}

/**
 * Message missing parameter execption.
 */
export class MessageMissingExecption extends MissingParameterExecption {
    constructor(parameters: Parameter[], type: ClassType, method: string) {
        super(parameters, type, method)
    }
}

/**
 * Message Execption
 *
 * @export
 * @extends {Execption}
 */
export class MessageExecption extends Execption {

    constructor(message?: string | string[], public status?: number | string) {
        super(isArray(message) ? message.join('\n') : message || '')
    }

    get statusCode(): number | string {
        return this.status ?? 0;
    }

    toString() {
        return `Message Execption: ${this.statusCode}, ${this.message}`
    }
}

/**
 * transport about execption.
 */
export class AboutExecption extends MessageExecption {
    constructor(message = 'Message About') {
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

const statmsg = 'INVALID_STATE_ERR';
/**
 * Invalid state execption.
 */
export class InvalidStateExecption extends MessageExecption {
    constructor(message?: string) {
        super(message ? `${statmsg}: ${message}` : statmsg)
    }
}

const sectmsg = 'SecurityExecption';
/**
 * security execption.
 */
export class SecurityExecption extends MessageExecption {
    constructor(message?: string) {
        super(message ? `${sectmsg}: ${message}` : sectmsg)
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